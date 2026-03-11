import Foundation
@preconcurrency import SwiftPhoenixClient

/// WebSocket client wrapping SwiftPhoenixClient for Phoenix Channel communication.
/// Not MainActor-isolated so that closures registered with SwiftPhoenixClient can be
/// called from any thread. All handler callbacks are @MainActor and dispatched via
/// Task { @MainActor in } from within socket/channel event handlers.
public final class WebSocketClient: @unchecked Sendable {
    private var socket: Socket
    private let baseURL: String
    private let authManager: AuthManager

    /// Lock protecting mutable state accessed from multiple threads.
    /// Protects: `activeChannels`, `joinedTopics`, `isReconnecting`, and `socket`.
    private let lock = NSLock()

    /// Tracks active channels by topic (e.g. "conversation:abc123") so we can push events to them.
    /// Access must be protected by `lock`.
    private var activeChannels: [String: Channel] = [:]

    /// Tracks which topics were joined so we can rejoin after reconnect.
    /// Access must be protected by `lock`.
    private var joinedTopics: Set<String> = []

    /// Whether a token-refresh reconnect is in progress.
    /// Access must be protected by `lock`.
    private var isReconnecting = false

    // MARK: - Connection State

    public enum ConnectionState: String, Sendable {
        case connecting
        case connected
        case disconnected
    }

    public var onConnectionStateChanged: (@MainActor (_ state: ConnectionState) -> Void)?

    // MARK: - Conversation Channel Handlers

    public var onNewMessage: (@MainActor (_ payload: Message) -> Void)?
    public var onMessageUpdated: (@MainActor (_ payload: Message) -> Void)?
    public var onTyping: (@MainActor (_ payload: TypingPayload) -> Void)?
    public var onPresenceState: (@MainActor (_ payload: [String: AnyCodable]) -> Void)?
    public var onPresenceDiff: (@MainActor (_ payload: [String: AnyCodable]) -> Void)?

    // MARK: - Agent Channel Handlers

    public var onToken: (@MainActor (_ payload: [String: AnyCodable]) -> Void)?
    public var onStatus: (@MainActor (_ payload: [String: AnyCodable]) -> Void)?
    public var onApprovalRequested: (@MainActor (_ payload: ApprovalRequestPayload) -> Void)?
    public var onToolCall: (@MainActor (_ payload: ToolCallPayload) -> Void)?
    public var onToolResult: (@MainActor (_ payload: ToolResultPayload) -> Void)?
    public var onCodeBlock: (@MainActor (_ payload: CodeBlockPayload) -> Void)?
    public var onComplete: (@MainActor (_ payload: [String: AnyCodable]) -> Void)?
    public var onError: (@MainActor (_ payload: [String: AnyCodable]) -> Void)?

    // MARK: - User Channel Handlers

    public var onNotification: (@MainActor (_ payload: [String: AnyCodable]) -> Void)?
    public var onBridgeStatus: (@MainActor (_ payload: BridgeStatusPayload) -> Void)?
    public var onConversationUpdated: (@MainActor (_ payload: Conversation) -> Void)?

    /// Called when auth fails and token refresh also fails (user must re-login).
    public var onAuthFailure: (@MainActor () -> Void)?

    public init(baseURL: String, accessToken: String, authManager: AuthManager) {
        self.baseURL = baseURL
        self.authManager = authManager
        let wsURL = baseURL
            .replacingOccurrences(of: "https://", with: "wss://")
            .replacingOccurrences(of: "http://", with: "ws://")
        self.socket = Socket("\(wsURL)/socket", params: ["token": accessToken])
    }

    public func connect() {
        Task { @MainActor in onConnectionStateChanged?(.connecting) }

        let currentSocket = lock.withLock { socket }

        currentSocket.onOpen { @Sendable [weak self] in
            Task { @MainActor in
                self?.onConnectionStateChanged?(.connected)
            }
        }

        currentSocket.onClose { @Sendable [weak self] in
            Task { @MainActor in
                self?.onConnectionStateChanged?(.disconnected)
            }
        }

        currentSocket.onError { @Sendable [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                self.onConnectionStateChanged?(.disconnected)
            }
        }
        currentSocket.connect()
    }

    public func disconnect() {
        let currentSocket = lock.withLock { socket }
        currentSocket.disconnect()
        Task { @MainActor in onConnectionStateChanged?(.disconnected) }
    }

    /// Attempts to refresh the access token and reconnect the WebSocket.
    /// If the refresh fails, notifies via `onAuthFailure`.
    private func handleAuthFailure() async {
        let shouldProceed: Bool = lock.withLock {
            guard !isReconnecting else { return false }
            isReconnecting = true
            return true
        }
        guard shouldProceed else { return }
        defer { lock.withLock { isReconnecting = false } }

        let currentSocket = lock.withLock { socket }
        currentSocket.disconnect()

        do {
            await onConnectionStateChanged?(.connecting)

            let newToken = try await authManager.validAccessToken()
            let wsURL = baseURL
                .replacingOccurrences(of: "https://", with: "wss://")
                .replacingOccurrences(of: "http://", with: "ws://")
            let newSocket = Socket("\(wsURL)/socket", params: ["token": newToken])

            // Re-register socket lifecycle handlers on the new socket
            newSocket.onOpen { @Sendable [weak self] in
                Task { @MainActor in
                    self?.onConnectionStateChanged?(.connected)
                }
            }

            newSocket.onClose { @Sendable [weak self] in
                Task { @MainActor in
                    self?.onConnectionStateChanged?(.disconnected)
                }
            }

            newSocket.onError { @Sendable [weak self] _ in
                Task { @MainActor in
                    guard let self else { return }
                    self.onConnectionStateChanged?(.disconnected)
                }
            }

            // Swap the socket and clear channels under lock
            let topicsToRejoin: Set<String> = lock.withLock {
                socket = newSocket
                let topics = joinedTopics
                activeChannels.removeAll()
                return topics
            }

            newSocket.connect()

            for topic in topicsToRejoin {
                rejoinTopic(topic)
            }
        } catch APIError.unauthorized {
            await onAuthFailure?()
        } catch {
            await onConnectionStateChanged?(.disconnected)
        }
    }

    /// Rejoin a topic after reconnect based on its prefix.
    private func rejoinTopic(_ topic: String) {
        if topic.hasPrefix("conversation:") {
            let id = String(topic.dropFirst("conversation:".count))
            joinConversation(id: id)
        } else if topic.hasPrefix("agent:") {
            let id = String(topic.dropFirst("agent:".count))
            joinAgentChannel(conversationID: id)
        } else if topic.hasPrefix("user:") {
            let id = String(topic.dropFirst("user:".count))
            joinUserChannel(userID: id)
        }
    }

    /// Join a conversation channel to receive real-time message events.
    @discardableResult
    public func joinConversation(id: String) -> Channel {
        let topic = "conversation:\(id)"
        let channel = lock.withLock { socket.channel(topic) }

        channel.on(ConversationServerEvent.newMessage.rawValue) { @Sendable [weak self] message in
            let payload = message.payload
            Task { @MainActor in
                guard let self else { return }
                if let decoded = Self.decodeConversationMessage(payload: payload) {
                    self.onNewMessage?(decoded)
                }
            }
        }

        channel.on(ConversationServerEvent.messageUpdated.rawValue) { @Sendable [weak self] message in
            let payload = message.payload
            Task { @MainActor in
                guard let self else { return }
                if let decoded = Self.decodeConversationMessage(payload: payload) {
                    self.onMessageUpdated?(decoded)
                }
            }
        }

        channel.on(ConversationServerEvent.typing.rawValue) { @Sendable [weak self] message in
            let payload = message.payload
            Task { @MainActor in
                guard let self else { return }
                guard let data = self.jsonData(from: payload) else { return }
                if let decoded = try? JSONDecoder.waiagents.decode(TypingPayload.self, from: data) {
                    self.onTyping?(decoded)
                }
            }
        }

        channel.on(ConversationServerEvent.presenceState.rawValue) { @Sendable [weak self] message in
            let payload = message.payload
            Task { @MainActor in
                guard let self else { return }
                guard let data = self.jsonData(from: payload) else { return }
                if let decoded = try? JSONDecoder.waiagents.decode([String: AnyCodable].self, from: data) {
                    self.onPresenceState?(decoded)
                }
            }
        }

        channel.on(ConversationServerEvent.presenceDiff.rawValue) { @Sendable [weak self] message in
            let payload = message.payload
            Task { @MainActor in
                guard let self else { return }
                guard let data = self.jsonData(from: payload) else { return }
                if let decoded = try? JSONDecoder.waiagents.decode([String: AnyCodable].self, from: data) {
                    self.onPresenceDiff?(decoded)
                }
            }
        }

        channel.join()
        lock.withLock {
            activeChannels[topic] = channel
            joinedTopics.insert(topic)
        }
        return channel
    }

    /// Join an agent channel to receive streaming AI response events.
    @discardableResult
    public func joinAgentChannel(conversationID: String) -> Channel {
        let topic = "agent:\(conversationID)"
        let channel = lock.withLock { socket.channel(topic) }

        channel.on(AgentServerEvent.token.rawValue) { @Sendable [weak self] message in
            let payload = message.payload
            Task { @MainActor in
                guard let self else { return }
                guard let data = self.jsonData(from: payload) else { return }
                if let decoded = try? JSONDecoder.waiagents.decode([String: AnyCodable].self, from: data) {
                    self.onToken?(decoded)
                }
            }
        }

        channel.on(AgentServerEvent.status.rawValue) { @Sendable [weak self] message in
            let payload = message.payload
            Task { @MainActor in
                guard let self else { return }
                guard let data = self.jsonData(from: payload) else { return }
                if let decoded = try? JSONDecoder.waiagents.decode([String: AnyCodable].self, from: data) {
                    self.onStatus?(decoded)
                }
            }
        }

        channel.on(AgentServerEvent.approvalRequested.rawValue) { @Sendable [weak self] message in
            let payload = message.payload
            Task { @MainActor in
                guard let self else { return }
                guard let data = self.jsonData(from: payload) else { return }
                if let decoded = try? JSONDecoder.waiagents.decode(ApprovalRequestPayload.self, from: data) {
                    self.onApprovalRequested?(decoded)
                }
            }
        }

        channel.on(AgentServerEvent.toolCall.rawValue) { @Sendable [weak self] message in
            let payload = message.payload
            Task { @MainActor in
                guard let self else { return }
                guard let data = self.jsonData(from: payload) else { return }
                if let decoded = try? JSONDecoder.waiagents.decode(ToolCallPayload.self, from: data) {
                    self.onToolCall?(decoded)
                }
            }
        }

        channel.on(AgentServerEvent.toolResult.rawValue) { @Sendable [weak self] message in
            let payload = message.payload
            Task { @MainActor in
                guard let self else { return }
                guard let data = self.jsonData(from: payload) else { return }
                if let decoded = try? JSONDecoder.waiagents.decode(ToolResultPayload.self, from: data) {
                    self.onToolResult?(decoded)
                }
            }
        }

        channel.on(AgentServerEvent.codeBlock.rawValue) { @Sendable [weak self] message in
            let payload = message.payload
            Task { @MainActor in
                guard let self else { return }
                guard let data = self.jsonData(from: payload) else { return }
                if let decoded = try? JSONDecoder.waiagents.decode(CodeBlockPayload.self, from: data) {
                    self.onCodeBlock?(decoded)
                }
            }
        }

        channel.on(AgentServerEvent.complete.rawValue) { @Sendable [weak self] message in
            let payload = message.payload
            Task { @MainActor in
                guard let self else { return }
                guard let data = self.jsonData(from: payload) else { return }
                if let decoded = try? JSONDecoder.waiagents.decode([String: AnyCodable].self, from: data) {
                    self.onComplete?(decoded)
                }
            }
        }

        channel.on(AgentServerEvent.error.rawValue) { @Sendable [weak self] message in
            let payload = message.payload
            Task { @MainActor in
                guard let self else { return }
                guard let data = self.jsonData(from: payload) else { return }
                if let decoded = try? JSONDecoder.waiagents.decode([String: AnyCodable].self, from: data) {
                    self.onError?(decoded)
                }
            }
        }

        channel.join()
        lock.withLock {
            activeChannels[topic] = channel
            joinedTopics.insert(topic)
        }
        return channel
    }

    /// Join the user channel for notifications, bridge status, and conversation updates.
    @discardableResult
    public func joinUserChannel(userID: String) -> Channel {
        let topic = "user:\(userID)"
        let channel = lock.withLock { socket.channel(topic) }

        channel.on(UserServerEvent.notification.rawValue) { @Sendable [weak self] message in
            let payload = message.payload
            Task { @MainActor in
                guard let self else { return }
                guard let data = self.jsonData(from: payload) else { return }
                if let decoded = try? JSONDecoder.waiagents.decode([String: AnyCodable].self, from: data) {
                    self.onNotification?(decoded)
                }
            }
        }

        channel.on(UserServerEvent.bridgeStatus.rawValue) { @Sendable [weak self] message in
            let payload = message.payload
            Task { @MainActor in
                guard let self else { return }
                guard let data = self.jsonData(from: payload) else { return }
                if let decoded = try? JSONDecoder.waiagents.decode(BridgeStatusPayload.self, from: data) {
                    self.onBridgeStatus?(decoded)
                }
            }
        }

        channel.on(UserServerEvent.conversationUpdated.rawValue) { @Sendable [weak self] message in
            let payload = message.payload
            Task { @MainActor in
                guard let self else { return }
                guard let data = self.jsonData(from: payload) else { return }
                if let decoded = try? JSONDecoder.waiagents.decode(Conversation.self, from: data) {
                    self.onConversationUpdated?(decoded)
                }
            }
        }

        channel.join()
        lock.withLock {
            activeChannels[topic] = channel
            joinedTopics.insert(topic)
        }
        return channel
    }

    // MARK: - Push Methods (Client → Server)

    /// Push a new message event to the conversation channel.
    @discardableResult
    public func sendMessage(conversationID: String, content: String, type: String = "text") -> Push? {
        let topic = "conversation:\(conversationID)"
        guard let channel = lock.withLock({ activeChannels[topic] }) else { return nil }
        return channel.push(
            ConversationClientEvent.newMessage.rawValue,
            payload: ["content": content, "type": type]
        )
    }

    /// Push a typing indicator event to the conversation channel.
    @discardableResult
    public func sendTyping(conversationID: String, isTyping: Bool) -> Push? {
        let topic = "conversation:\(conversationID)"
        guard let channel = lock.withLock({ activeChannels[topic] }) else { return nil }
        return channel.push(
            ConversationClientEvent.typing.rawValue,
            payload: ["is_typing": isTyping]
        )
    }

    /// Push a read receipt event to the conversation channel.
    @discardableResult
    public func sendRead(conversationID: String, messageID: String) -> Push? {
        let topic = "conversation:\(conversationID)"
        guard let channel = lock.withLock({ activeChannels[topic] }) else { return nil }
        return channel.push(
            ConversationClientEvent.read.rawValue,
            payload: ["message_id": messageID]
        )
    }

    /// Push a reaction event to the conversation channel.
    @discardableResult
    public func sendReaction(conversationID: String, messageID: String, emoji: String) -> Push? {
        let topic = "conversation:\(conversationID)"
        guard let channel = lock.withLock({ activeChannels[topic] }) else { return nil }
        return channel.push(
            ConversationClientEvent.react.rawValue,
            payload: ["message_id": messageID, "emoji": emoji]
        )
    }

    /// Push an approval decision event to the agent channel.
    @discardableResult
    public func sendApprovalDecision(
        conversationID: String,
        requestID: String,
        decision: String,
        scope: String
    ) -> Push? {
        let topic = "agent:\(conversationID)"
        guard let channel = lock.withLock({ activeChannels[topic] }) else { return nil }
        return channel.push(
            AgentClientEvent.approvalDecision.rawValue,
            payload: ["request_id": requestID, "decision": decision, "scope": scope]
        )
    }

    // MARK: - Channel Lifecycle

    /// Leave a conversation channel and remove it from tracked channels.
    public func leaveConversation(id: String) {
        let topic = "conversation:\(id)"
        let channel: Channel? = lock.withLock {
            joinedTopics.remove(topic)
            return activeChannels.removeValue(forKey: topic)
        }
        channel?.leave()
    }

    /// Leave an agent channel and remove it from tracked channels.
    public func leaveAgentChannel(conversationID: String) {
        let topic = "agent:\(conversationID)"
        let channel: Channel? = lock.withLock {
            joinedTopics.remove(topic)
            return activeChannels.removeValue(forKey: topic)
        }
        channel?.leave()
    }

    /// Leave a channel.
    public func leave(_ channel: Channel) {
        lock.withLock {
            // Remove from tracked channels if present
            if let topic = activeChannels.first(where: { $0.value === channel })?.key {
                activeChannels.removeValue(forKey: topic)
                joinedTopics.remove(topic)
            }
        }
        channel.leave()
    }

    // MARK: - Private Helpers

    /// Converts a Phoenix message payload dictionary to JSON Data for decoding.
    private func jsonData(from payload: Payload) -> Data? {
        try? JSONSerialization.data(withJSONObject: payload, options: [])
    }

    /// ConversationChannel can emit either `%{message: ...}` or a direct message payload.
    static func decodeConversationMessage(payload: Payload) -> Message? {
        guard let data = try? JSONSerialization.data(withJSONObject: payload, options: []) else {
            return nil
        }

        if let wrapped = try? JSONDecoder.waiagents.decode(MessageEventWrapper.self, from: data) {
            return wrapped.message
        }

        return try? JSONDecoder.waiagents.decode(Message.self, from: data)
    }
}

private struct MessageEventWrapper: Codable, Sendable {
    let message: Message
}
