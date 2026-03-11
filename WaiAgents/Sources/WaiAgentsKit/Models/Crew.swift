import Foundation

public struct Crew: Identifiable, Sendable, Equatable {
    public let id: String
    public let creatorID: String
    public var name: String
    public var slug: String?
    public var description: String?
    public var visibility: Visibility
    public var steps: [CrewStep]
    public var category: String?
    public var usageCount: Int
    public var ratingSum: Int
    public var ratingCount: Int
    public var metadata: [String: AnyCodable]?
    public let createdAt: Date?
    public var updatedAt: Date?

    public enum Visibility: String, Codable, Sendable {
        case `public`
        case unlisted
        case `private`
    }

    enum CodingKeys: String, CodingKey {
        case id
        case creatorID = "creatorId"
        case name
        case slug
        case description
        case visibility
        case steps
        case category
        case usageCount
        case ratingSum
        case ratingCount
        case metadata
        case createdAt
        case updatedAt
    }

    public var averageRating: Double {
        guard ratingCount > 0 else { return 0 }
        return Double(ratingSum) / Double(ratingCount)
    }

    public init(
        id: String,
        creatorID: String,
        name: String,
        slug: String? = nil,
        description: String? = nil,
        visibility: Visibility = .private,
        steps: [CrewStep] = [],
        category: String? = nil,
        usageCount: Int = 0,
        ratingSum: Int = 0,
        ratingCount: Int = 0,
        metadata: [String: AnyCodable]? = nil,
        createdAt: Date? = nil,
        updatedAt: Date? = nil
    ) {
        self.id = id
        self.creatorID = creatorID
        self.name = name
        self.slug = slug
        self.description = description
        self.visibility = visibility
        self.steps = steps
        self.category = category
        self.usageCount = usageCount
        self.ratingSum = ratingSum
        self.ratingCount = ratingCount
        self.metadata = metadata
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

extension Crew: Codable {
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        creatorID = try container.decode(String.self, forKey: .creatorID)
        name = try container.decode(String.self, forKey: .name)
        slug = try container.decodeIfPresent(String.self, forKey: .slug)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        visibility = try container.decode(Visibility.self, forKey: .visibility)
        steps = try container.decode([CrewStep].self, forKey: .steps)
        category = try container.decodeIfPresent(String.self, forKey: .category)
        usageCount = try container.decodeIfPresent(Int.self, forKey: .usageCount) ?? 0
        ratingSum = try container.decodeIfPresent(Int.self, forKey: .ratingSum) ?? 0
        ratingCount = try container.decodeIfPresent(Int.self, forKey: .ratingCount) ?? 0
        metadata = try container.decodeIfPresent([String: AnyCodable].self, forKey: .metadata)
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt)
        updatedAt = try container.decodeIfPresent(Date.self, forKey: .updatedAt)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(creatorID, forKey: .creatorID)
        try container.encode(name, forKey: .name)
        try container.encodeIfPresent(slug, forKey: .slug)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encode(visibility, forKey: .visibility)
        try container.encode(steps, forKey: .steps)
        try container.encodeIfPresent(category, forKey: .category)
        try container.encode(usageCount, forKey: .usageCount)
        try container.encode(ratingSum, forKey: .ratingSum)
        try container.encode(ratingCount, forKey: .ratingCount)
        try container.encodeIfPresent(metadata, forKey: .metadata)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(updatedAt, forKey: .updatedAt)
    }
}

// MARK: - CrewStep

public struct CrewStep: Codable, Sendable, Equatable {
    public var agentID: String
    public var role: String
    public var parallelGroup: String?

    enum CodingKeys: String, CodingKey {
        case agentID = "agentId"
        case role
        case parallelGroup
    }

    public init(agentID: String, role: String, parallelGroup: String? = nil) {
        self.agentID = agentID
        self.role = role
        self.parallelGroup = parallelGroup
    }
}
