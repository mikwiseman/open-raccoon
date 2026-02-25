import Foundation

public struct FeedItem: Codable, Identifiable, Sendable, Equatable {
    public let id: String
    public let creatorID: String
    public var type: FeedItemType
    public var referenceID: String
    public var referenceType: ReferenceType
    public var title: String?
    public var description: String?
    public var thumbnailURL: URL?
    public var qualityScore: Double
    public var trendingScore: Double
    public var likeCount: Int
    public var forkCount: Int
    public var viewCount: Int
    public let createdAt: Date
    public var updatedAt: Date

    public enum FeedItemType: String, Codable, Sendable {
        case agentShowcase = "agent_showcase"
        case pageShowcase = "page_showcase"
        case toolShowcase = "tool_showcase"
        case remix
        case creation
    }

    public enum ReferenceType: String, Codable, Sendable {
        case agent
        case page
        case tool
    }

    enum CodingKeys: String, CodingKey {
        case id
        case creatorID = "creatorId"
        case type
        case referenceID = "referenceId"
        case referenceType
        case title
        case description
        case thumbnailURL = "thumbnailUrl"
        case qualityScore
        case trendingScore
        case likeCount
        case forkCount
        case viewCount
        case createdAt
        case updatedAt
    }

    public init(
        id: String,
        creatorID: String,
        type: FeedItemType,
        referenceID: String,
        referenceType: ReferenceType,
        title: String? = nil,
        description: String? = nil,
        thumbnailURL: URL? = nil,
        qualityScore: Double = 0,
        trendingScore: Double = 0,
        likeCount: Int = 0,
        forkCount: Int = 0,
        viewCount: Int = 0,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.creatorID = creatorID
        self.type = type
        self.referenceID = referenceID
        self.referenceType = referenceType
        self.title = title
        self.description = description
        self.thumbnailURL = thumbnailURL
        self.qualityScore = qualityScore
        self.trendingScore = trendingScore
        self.likeCount = likeCount
        self.forkCount = forkCount
        self.viewCount = viewCount
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
