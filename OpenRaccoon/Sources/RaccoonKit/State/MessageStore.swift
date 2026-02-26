import SwiftUI

@MainActor
@Observable
public final class MessageStore {
    public var messages: [String: [Message]] = [:]  // conversationID -> messages
    public var pageInfos: [String: PageInfo] = [:]  // conversationID -> pageInfo
    public var isLoading = false
    public var isLoadingMore = false

    public init() {}

    public func messages(for conversationID: String) -> [Message] {
        messages[conversationID] ?? []
    }

    public func hasMore(for conversationID: String) -> Bool {
        pageInfos[conversationID]?.hasMore ?? false
    }

    public func loadMessages(conversationID: String, apiClient: APIClient) async throws {
        isLoading = true
        let response: PaginatedResponse<Message> = try await apiClient.request(
            .listMessages(conversationID: conversationID, cursor: nil, limit: 50)
        )
        messages[conversationID] = response.items
        pageInfos[conversationID] = response.pageInfo
        isLoading = false
    }

    public func loadMoreMessages(conversationID: String, apiClient: APIClient) async throws {
        guard let pageInfo = pageInfos[conversationID],
              pageInfo.hasMore,
              let cursor = pageInfo.nextCursor,
              !isLoadingMore else { return }

        isLoadingMore = true
        let response: PaginatedResponse<Message> = try await apiClient.request(
            .listMessages(conversationID: conversationID, cursor: cursor, limit: 50)
        )
        var existing = messages[conversationID] ?? []
        existing.append(contentsOf: response.items)
        messages[conversationID] = existing
        pageInfos[conversationID] = response.pageInfo
        isLoadingMore = false
    }

    public func appendMessage(_ message: Message, to conversationID: String) {
        var existing = messages[conversationID] ?? []
        existing.append(message)
        messages[conversationID] = existing
    }

    public func updateMessage(_ message: Message, in conversationID: String) {
        guard var existing = messages[conversationID] else { return }
        if let index = existing.firstIndex(where: { $0.id == message.id }) {
            existing[index] = message
            messages[conversationID] = existing
        }
    }

    public func removeMessage(id: String, from conversationID: String) {
        guard var existing = messages[conversationID] else { return }
        existing.removeAll { $0.id == id }
        messages[conversationID] = existing
    }
}
