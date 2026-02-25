import SwiftUI

@MainActor
@Observable
public final class FeedViewModel {
    public var feedItems: [FeedItem] = []
    public var isLoading = false
    public var isRefreshing = false
    public var error: String?

    private let apiClient: APIClient

    private var nextCursor: String?
    private var hasMore: Bool = true
    private var currentTab: FeedTab = .forYou

    public enum FeedTab: String, CaseIterable, Sendable {
        case forYou = "For You"
        case trending = "Trending"
        case following = "Following"
        case new = "New"
    }

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    public func loadFeed(tab: FeedTab) async {
        currentTab = tab
        isLoading = true
        error = nil

        do {
            let response: PaginatedResponse<FeedItem> = try await apiClient.request(
                endpoint(for: tab, cursor: nil)
            )
            feedItems = response.items
            nextCursor = response.pageInfo.nextCursor
            hasMore = response.pageInfo.hasMore
        } catch {
            self.error = String(describing: error)
        }

        isLoading = false
    }

    public func refresh(tab: FeedTab) async {
        isRefreshing = true
        await loadFeed(tab: tab)
        isRefreshing = false
    }

    public func loadMore() async {
        guard hasMore, let cursor = nextCursor else { return }

        do {
            let response: PaginatedResponse<FeedItem> = try await apiClient.request(
                endpoint(for: currentTab, cursor: cursor)
            )
            feedItems.append(contentsOf: response.items)
            nextCursor = response.pageInfo.nextCursor
            hasMore = response.pageInfo.hasMore
        } catch {
            self.error = String(describing: error)
        }
    }

    public func likeItem(id: String) async {
        do {
            try await apiClient.requestVoid(.likeFeedItem(id: id))
            if let index = feedItems.firstIndex(where: { $0.id == id }) {
                feedItems[index].likeCount += 1
            }
        } catch {
            self.error = String(describing: error)
        }
    }

    public func unlikeItem(id: String) async {
        do {
            try await apiClient.requestVoid(.unlikeFeedItem(id: id))
            if let index = feedItems.firstIndex(where: { $0.id == id }) {
                feedItems[index].likeCount = max(0, feedItems[index].likeCount - 1)
            }
        } catch {
            self.error = String(describing: error)
        }
    }

    private func endpoint(for tab: FeedTab, cursor: String?) -> APIEndpoint {
        switch tab {
        case .forYou:
            return .feed(cursor: cursor, limit: 20)
        case .trending:
            return .trending(cursor: cursor, limit: 20)
        case .following:
            return .feed(cursor: cursor, limit: 20)
        case .new:
            return .newFeedItems(cursor: cursor, limit: 20)
        }
    }
}
