import SwiftUI

@MainActor
@Observable
public final class MessageStore {
    public var messages: [String: [Message]] = [:]  // conversationID -> messages
    public var isLoading = false

    public init() {}

    public func messages(for conversationID: String) -> [Message] {
        messages[conversationID] ?? []
    }

    public func loadMessages(conversationID: String, apiClient: APIClient) async throws {
        isLoading = true
        let response: PaginatedResponse<Message> = try await apiClient.request(
            .listMessages(conversationID: conversationID, cursor: nil, limit: 50)
        )
        messages[conversationID] = response.items
        isLoading = false
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
}
