import Foundation

public struct PaginatedResponse<T: Codable & Sendable>: Codable, Sendable {
    public let items: [T]
    public let pageInfo: PageInfo

    public init(items: [T], pageInfo: PageInfo) {
        self.items = items
        self.pageInfo = pageInfo
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawResponse = try container.decode([String: AnyCodable].self)
        let normalized = WaiAgentsResponseDecoding.normalizeTopLevelDictionary(rawResponse)
        let payload = try WaiAgentsResponseDecoding.decodeNormalized(
            NormalizedPaginatedPayload<T>.self,
            from: .dictionary(normalized)
        )

        self.items = payload.items
        self.pageInfo = payload.pageInfo
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

private struct NormalizedPaginatedPayload<T: Codable & Sendable>: Codable, Sendable {
    let items: [T]
    let pageInfo: PageInfo
}
