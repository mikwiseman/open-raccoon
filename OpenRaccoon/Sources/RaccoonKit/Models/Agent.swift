import Foundation

public struct Agent: Codable, Identifiable, Sendable, Equatable {
    public let id: String
    public let creatorID: String
    public var name: String
    public var slug: String
    public var description: String?
    public var avatarURL: URL?
    public var systemPrompt: String
    public var model: String
    public var temperature: Double
    public var maxTokens: Int
    public var tools: [ToolConfig]?
    public var mcpServers: [McpServerConfig]?
    public var visibility: Visibility
    public var category: String?
    public var usageCount: Int
    public var ratingSum: Int
    public var ratingCount: Int
    public var metadata: [String: AnyCodable]?
    public let createdAt: Date
    public var updatedAt: Date

    public enum Visibility: String, Codable, Sendable {
        case `public`
        case unlisted
        case `private`
    }

    public struct ToolConfig: Codable, Sendable, Equatable {
        public var name: String
        public var enabled: Bool
        public var config: [String: AnyCodable]?

        public init(name: String, enabled: Bool = true, config: [String: AnyCodable]? = nil) {
            self.name = name
            self.enabled = enabled
            self.config = config
        }
    }

    public struct McpServerConfig: Codable, Sendable, Equatable {
        public var name: String
        public var url: String
        public var authToken: String?
        public var tools: [String]?

        public init(name: String, url: String, authToken: String? = nil, tools: [String]? = nil) {
            self.name = name
            self.url = url
            self.authToken = authToken
            self.tools = tools
        }
    }

    /// Computed average rating from ratingSum / ratingCount
    public var averageRating: Double {
        guard ratingCount > 0 else { return 0 }
        return Double(ratingSum) / Double(ratingCount)
    }

    enum CodingKeys: String, CodingKey {
        case id
        case creatorID = "creatorId"
        case name
        case slug
        case description
        case avatarURL = "avatarUrl"
        case systemPrompt
        case model
        case temperature
        case maxTokens
        case tools
        case mcpServers
        case visibility
        case category
        case usageCount
        case ratingSum
        case ratingCount
        case metadata
        case createdAt
        case updatedAt
    }

    public init(
        id: String,
        creatorID: String,
        name: String,
        slug: String,
        description: String? = nil,
        avatarURL: URL? = nil,
        systemPrompt: String,
        model: String = "claude-sonnet-4-6",
        temperature: Double = 0.7,
        maxTokens: Int = 4096,
        tools: [ToolConfig]? = nil,
        mcpServers: [McpServerConfig]? = nil,
        visibility: Visibility = .private,
        category: String? = nil,
        usageCount: Int = 0,
        ratingSum: Int = 0,
        ratingCount: Int = 0,
        metadata: [String: AnyCodable]? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.creatorID = creatorID
        self.name = name
        self.slug = slug
        self.description = description
        self.avatarURL = avatarURL
        self.systemPrompt = systemPrompt
        self.model = model
        self.temperature = temperature
        self.maxTokens = maxTokens
        self.tools = tools
        self.mcpServers = mcpServers
        self.visibility = visibility
        self.category = category
        self.usageCount = usageCount
        self.ratingSum = ratingSum
        self.ratingCount = ratingCount
        self.metadata = metadata
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
