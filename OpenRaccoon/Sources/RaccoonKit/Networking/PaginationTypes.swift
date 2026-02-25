import Foundation

public struct PaginatedResponse<T: Codable & Sendable>: Codable, Sendable {
    public let items: [T]
    public let pageInfo: PageInfo

    public init(items: [T], pageInfo: PageInfo) {
        self.items = items
        self.pageInfo = pageInfo
    }
}

public struct PageInfo: Codable, Sendable, Equatable {
    public let nextCursor: String?
    public let hasMore: Bool

    public init(nextCursor: String?, hasMore: Bool) {
        self.nextCursor = nextCursor
        self.hasMore = hasMore
    }
}
