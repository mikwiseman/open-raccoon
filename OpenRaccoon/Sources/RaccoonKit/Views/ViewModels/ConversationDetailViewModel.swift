import SwiftUI

@MainActor
@Observable
public final class ConversationDetailViewModel {
    public let conversationID: String
    public var messages: [Message] = []
    public var isTyping = false
    public var isAgentGenerating = false
    public var inputText = ""
    public var isLoading = false
    public var error: String?

    private let apiClient: APIClient
    private let currentUserID: String
    private let webSocketClient: WebSocketClient?

    private var nextCursor: String?
    private var hasMore: Bool = true
    private var isLoadingMore: Bool = false

    /// Task for debouncing the typing-stopped event.
    private var typingDebounceTask: Task<Void, Never>?

    /// Whether we have already sent a typing=true event that hasn't been cancelled yet.
    private var isSendingTyping = false

    public struct MessageGroup: Identifiable, Sendable {
        public let id: String
        public let date: Date
        public let messages: [Message]
        public let showDateSeparator: Bool
    }

    public var groupedMessages: [MessageGroup] {
        guard !messages.isEmpty else { return [] }

        var groups: [MessageGroup] = []
        var currentGroup: [Message] = []
        var previousGroupDate: Date?

        for message in messages {
            let shouldStartNewGroup: Bool = {
                guard let last = currentGroup.last else { return true }
                if last.senderID != message.senderID { return true }
                if last.senderType != message.senderType { return true }
                if message.createdAt.timeIntervalSince(last.createdAt) >= 120 { return true }
                return false
            }()

            if shouldStartNewGroup, !currentGroup.isEmpty {
                let groupDate = currentGroup[0].createdAt
                let showSeparator: Bool
                if let prev = previousGroupDate {
                    showSeparator = !Calendar.current.isDate(prev, inSameDayAs: groupDate)
                } else {
                    showSeparator = true
                }

                groups.append(MessageGroup(
                    id: currentGroup[0].id,
                    date: groupDate,
                    messages: currentGroup,
                    showDateSeparator: showSeparator
                ))
                previousGroupDate = groupDate
                currentGroup = []
            }

            currentGroup.append(message)
        }

        if !currentGroup.isEmpty {
            let groupDate = currentGroup[0].createdAt
            let showSeparator: Bool
            if let prev = previousGroupDate {
                showSeparator = !Calendar.current.isDate(prev, inSameDayAs: groupDate)
            } else {
                showSeparator = true
            }

            groups.append(MessageGroup(
                id: currentGroup[0].id,
                date: groupDate,
                messages: currentGroup,
                showDateSeparator: showSeparator
            ))
        }

        return groups
    }

    public init(
        conversationID: String,
        apiClient: APIClient,
        currentUserID: String,
        webSocketClient: WebSocketClient? = nil
    ) {
        self.conversationID = conversationID
        self.apiClient = apiClient
        self.currentUserID = currentUserID
        self.webSocketClient = webSocketClient
    }

    /// Join the conversation channel and wire up real-time handlers.
    /// Call this after `loadMessages()` so the initial fetch is already in place.
    public func subscribeToChannel() {
        guard let ws = webSocketClient else { return }

        ws.onNewMessage = { [weak self] message in
            guard let self else { return }
            // Avoid duplicates (e.g. optimistic messages already appended locally)
            if !self.messages.contains(where: { $0.id == message.id }) {
                self.messages.append(message)
            }
        }

        ws.onMessageUpdated = { [weak self] message in
            guard let self else { return }
            if let index = self.messages.firstIndex(where: { $0.id == message.id }) {
                self.messages[index] = message
            }
        }

        ws.onTyping = { [weak self] payload in
            guard let self else { return }
            // Don't show our own typing indicator
            if payload.userID == self.currentUserID { return }
            self.isTyping = payload.isTyping
        }

        ws.joinConversation(id: conversationID)
    }

    /// Leave the conversation channel and clear handlers.
    public func unsubscribeFromChannel() {
        typingDebounceTask?.cancel()
        typingDebounceTask = nil
        webSocketClient?.onNewMessage = nil
        webSocketClient?.onMessageUpdated = nil
        webSocketClient?.onTyping = nil
        webSocketClient?.leaveConversation(id: conversationID)
    }

    /// Call when the user types in the input field. Sends a typing=true event
    /// immediately (once), then automatically sends typing=false after a 2-second
    /// pause in keystrokes.
    public func userDidType() {
        guard let ws = webSocketClient else { return }

        // Send typing=true only once per burst
        if !isSendingTyping {
            isSendingTyping = true
            ws.sendTyping(conversationID: conversationID, isTyping: true)
        }

        // Reset the debounce timer
        typingDebounceTask?.cancel()
        typingDebounceTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            guard !Task.isCancelled, let self else { return }
            self.isSendingTyping = false
            ws.sendTyping(conversationID: self.conversationID, isTyping: false)
        }
    }

    public func loadMessages() async {
        isLoading = true
        error = nil

        do {
            let response: PaginatedResponse<Message> = try await apiClient.request(
                .listMessages(conversationID: conversationID, cursor: nil, limit: 50)
            )
            messages = response.items
            nextCursor = response.pageInfo.nextCursor
            hasMore = response.pageInfo.hasMore
        } catch {
            self.error = String(describing: error)
        }

        isLoading = false
    }

    public func loadMoreMessages() async {
        guard hasMore, !isLoadingMore, let cursor = nextCursor else { return }
        isLoadingMore = true

        do {
            let response: PaginatedResponse<Message> = try await apiClient.request(
                .listMessages(conversationID: conversationID, cursor: cursor, limit: 50)
            )
            // Prepend older messages to the front
            messages.insert(contentsOf: response.items, at: 0)
            nextCursor = response.pageInfo.nextCursor
            hasMore = response.pageInfo.hasMore
        } catch {
            self.error = String(describing: error)
        }

        isLoadingMore = false
    }

    public func sendMessage(content: String) {
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        let idempotencyKey = UUID().uuidString
        let messageContent = MessageContent(text: trimmed)

        // Optimistic local append
        let localMessage = Message(
            id: idempotencyKey,
            conversationID: conversationID,
            senderID: currentUserID,
            senderType: .human,
            type: .text,
            content: messageContent,
            createdAt: Date()
        )
        messages.append(localMessage)

        Task {
            do {
                let response: MessageResponse = try await apiClient.request(
                    .sendMessage(
                        conversationID: conversationID,
                        content: messageContent,
                        idempotencyKey: idempotencyKey
                    )
                )
                // Replace optimistic message with server response
                if let index = messages.firstIndex(where: { $0.id == idempotencyKey }) {
                    messages[index] = response.message
                }
            } catch {
                self.error = String(describing: error)
                // Remove optimistic message on failure
                messages.removeAll { $0.id == idempotencyKey }
            }
        }
    }
}
