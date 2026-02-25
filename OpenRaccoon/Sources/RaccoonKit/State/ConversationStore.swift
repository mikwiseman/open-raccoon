import SwiftUI

@MainActor
@Observable
public final class ConversationStore {
    public var conversations: [Conversation] = []
    public var isLoading = false

    public init() {}

    public func conversation(byID id: String) -> Conversation? {
        conversations.first { $0.id == id }
    }

    public func loadConversations(apiClient: APIClient) async throws {
        isLoading = true
        let response: PaginatedResponse<Conversation> = try await apiClient.request(
            .listConversations(cursor: nil, limit: 50)
        )
        conversations = response.items
        isLoading = false
    }

    public func upsert(_ conversation: Conversation) {
        if let index = conversations.firstIndex(where: { $0.id == conversation.id }) {
            conversations[index] = conversation
        } else {
            conversations.insert(conversation, at: 0)
        }
    }

    public func remove(id: String) {
        conversations.removeAll { $0.id == id }
    }
}
