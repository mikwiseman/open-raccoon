import Foundation

public struct Page: Codable, Identifiable, Sendable, Equatable {
    public let id: String
    public let creatorID: String
    public var agentID: String?
    public var conversationID: String?
    public var title: String
    public var slug: String
    public var description: String?
    public var thumbnailURL: URL?
    public var r2Path: String
    public var deployURL: URL?
    public var customDomain: String?
    public var version: Int
    public var forkedFrom: String?
    public var visibility: String
    public var viewCount: Int
    public let createdAt: Date
    public var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case creatorID = "creatorId"
        case agentID = "agentId"
        case conversationID = "conversationId"
        case title
        case slug
        case description
        case thumbnailURL = "thumbnailUrl"
        case r2Path
        case deployURL = "deployUrl"
        case customDomain
        case version
        case forkedFrom
        case visibility
        case viewCount
        case createdAt
        case updatedAt
    }

    public init(
        id: String,
        creatorID: String,
        agentID: String? = nil,
        conversationID: String? = nil,
        title: String,
        slug: String,
        description: String? = nil,
        thumbnailURL: URL? = nil,
        r2Path: String,
        deployURL: URL? = nil,
        customDomain: String? = nil,
        version: Int = 1,
        forkedFrom: String? = nil,
        visibility: String = "public",
        viewCount: Int = 0,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.creatorID = creatorID
        self.agentID = agentID
        self.conversationID = conversationID
        self.title = title
        self.slug = slug
        self.description = description
        self.thumbnailURL = thumbnailURL
        self.r2Path = r2Path
        self.deployURL = deployURL
        self.customDomain = customDomain
        self.version = version
        self.forkedFrom = forkedFrom
        self.visibility = visibility
        self.viewCount = viewCount
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

public struct PageVersion: Codable, Identifiable, Sendable, Equatable {
    public let id: String
    public let pageID: String
    public let version: Int
    public let r2Path: String
    public var changes: String?
    public let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case pageID = "pageId"
        case version
        case r2Path
        case changes
        case createdAt
    }

    public init(
        id: String,
        pageID: String,
        version: Int,
        r2Path: String,
        changes: String? = nil,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.pageID = pageID
        self.version = version
        self.r2Path = r2Path
        self.changes = changes
        self.createdAt = createdAt
    }
}
