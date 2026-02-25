import SwiftUI

@MainActor
@Observable
public final class ConversationListViewModel: Sendable {
    public var conversations: [Conversation] = []
    public var isLoading = false
    public var error: String?

    private let apiClient: APIClient

    private var nextCursor: String?
    private var hasMore: Bool = true

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    public func loadConversations() async {
        isLoading = true
        error = nil

        do {
            let response: PaginatedResponse<Conversation> = try await apiClient.request(
                .listConversations(cursor: nil, limit: 30)
            )
            conversations = response.items
            nextCursor = response.pageInfo.nextCursor
            hasMore = response.pageInfo.hasMore
        } catch {
            self.error = String(describing: error)
        }

        isLoading = false
    }

    public func loadMore() async {
        guard hasMore, let cursor = nextCursor else { return }

        do {
            let response: PaginatedResponse<Conversation> = try await apiClient.request(
                .listConversations(cursor: cursor, limit: 30)
            )
            conversations.append(contentsOf: response.items)
            nextCursor = response.pageInfo.nextCursor
            hasMore = response.pageInfo.hasMore
        } catch {
            self.error = String(describing: error)
        }
    }
}
