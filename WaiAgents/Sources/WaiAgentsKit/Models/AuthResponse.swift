import Foundation

public struct AuthResponse: Codable, Sendable {
    public let user: User
    public let tokens: TokenResponse
}

public struct TokenResponse: Codable, Sendable {
    public let accessToken: String
    public let refreshToken: String
    public let expiresIn: TimeInterval
}

public struct MagicLinkResponse: Codable, Sendable {
    public let message: String
}

/// Empty response for endpoints that return 204 No Content.
public struct EmptyResponse: Codable, Sendable {}

// MARK: - Single-resource response wrappers

/// Wraps `{"user": {...}}` responses from GET /users/me, etc.
public struct UserResponse: Codable, Sendable {
    public let user: User
}

/// Wraps `{"message": {...}}` responses from POST /conversations/:id/messages.
public struct MessageResponse: Codable, Sendable {
    public let message: Message
}

/// Wraps `{"conversation": {...}}` responses from POST /conversations, GET /conversations/:id, etc.
public struct ConversationResponse: Codable, Sendable {
    public let conversation: Conversation
}

/// Wraps `{"agent": {...}}` responses.
public struct AgentResponse: Codable, Sendable {
    public let agent: Agent

    public init(agent: Agent) {
        self.agent = agent
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawResponse = try container.decode([String: AnyCodable].self)
        let normalized = WaiAgentsResponseDecoding.normalizeTopLevelDictionary(rawResponse)
        let payload = try WaiAgentsResponseDecoding.decodeNormalized(
            NormalizedAgentResponse.self,
            from: .dictionary(normalized)
        )

        self.agent = payload.agent
    }
}

/// Wraps `{"page": {...}}` responses.
public struct PageResponse: Codable, Sendable {
    public let page: Page
}

/// Wraps `{"categories": [...]}` marketplace category responses.
public struct MarketplaceCategoriesResponse: Codable, Sendable {
    public let categories: [MarketplaceCategorySummary]

    public init(categories: [MarketplaceCategorySummary]) {
        self.categories = categories
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawResponse = try container.decode([String: AnyCodable].self)
        let normalized = WaiAgentsResponseDecoding.normalizeTopLevelDictionary(rawResponse)
        let payload = try WaiAgentsResponseDecoding.decodeNormalized(
            NormalizedMarketplaceCategoriesResponse.self,
            from: .dictionary(normalized)
        )

        self.categories = payload.categories
    }
}

public struct MarketplaceCategorySummary: Codable, Sendable, Equatable {
    public let category: String
    public let count: Int
}

private struct NormalizedAgentResponse: Codable, Sendable {
    let agent: Agent
}

private struct NormalizedMarketplaceCategoriesResponse: Codable, Sendable {
    let categories: [MarketplaceCategorySummary]
}
