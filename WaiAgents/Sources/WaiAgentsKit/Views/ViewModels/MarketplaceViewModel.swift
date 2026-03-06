import SwiftUI

@MainActor
@Observable
public final class MarketplaceViewModel {
    public var agents: [Agent] = []
    public var isLoading = false
    public var error: String?

    private let apiClient: APIClient

    private var nextCursor: String?
    private var hasMore: Bool = true

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    public func loadAgents() async {
        isLoading = true
        error = nil

        do {
            let response: PaginatedResponse<Agent> = try await apiClient.request(
                .marketplace(cursor: nil, limit: 30)
            )
            agents = response.items
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
            let response: PaginatedResponse<Agent> = try await apiClient.request(
                .marketplace(cursor: cursor, limit: 30)
            )
            agents.append(contentsOf: response.items)
            nextCursor = response.pageInfo.nextCursor
            hasMore = response.pageInfo.hasMore
        } catch {
            self.error = String(describing: error)
        }
    }

    public func searchAgents(query: String) async {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            await loadAgents()
            return
        }

        isLoading = true
        error = nil

        do {
            let response: PaginatedResponse<Agent> = try await apiClient.request(
                .searchMarketplace(query: query)
            )
            agents = response.items
            nextCursor = response.pageInfo.nextCursor
            hasMore = response.pageInfo.hasMore
        } catch {
            self.error = String(describing: error)
        }

        isLoading = false
    }
}
