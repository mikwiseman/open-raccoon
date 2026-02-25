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
}

/// Wraps `{"page": {...}}` responses.
public struct PageResponse: Codable, Sendable {
    public let page: Page
}
