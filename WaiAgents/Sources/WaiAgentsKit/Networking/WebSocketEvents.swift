import Foundation

// MARK: - Conversation Channel Events

/// Events sent from client to server on `conversation:{id}` channel.
public enum ConversationClientEvent: String, Sendable {
    case newMessage = "new_message"
    case typing = "typing"
    case read = "read"
    case react = "react"
}

/// Events received from server on `conversation:{id}` channel.
public enum ConversationServerEvent: String, Sendable {
    case newMessage = "new_message"
    case messageUpdated = "message_updated"
    case typing = "typing"
    case presenceState = "presence_state"
    case presenceDiff = "presence_diff"
}

// MARK: - Agent Channel Events

/// Events sent from client to server on `agent:{conversation_id}` channel.
public enum AgentClientEvent: String, Sendable {
    case approvalDecision = "approval_decision"
}

/// Events received from server on `agent:{conversation_id}` channel.
public enum AgentServerEvent: String, Sendable {
    case token = "token"
    case status = "status"
    case approvalRequested = "approval_requested"
    case approvalGranted = "approval_granted"
    case approvalDenied = "approval_denied"
    case approvalRevoked = "approval_revoked"
    case toolCall = "tool_call"
    case toolResult = "tool_result"
    case codeBlock = "code_block"
    case complete = "complete"
    case error = "error"
}

// MARK: - User Channel Events

/// Events received from server on `user:{id}` channel.
public enum UserServerEvent: String, Sendable {
    case notification = "notification"
    case bridgeStatus = "bridge_status"
    case conversationUpdated = "conversation_updated"
}

// MARK: - Event Payloads

/// Payload for the `approval_requested` agent event.
public struct ApprovalRequestPayload: Codable, Sendable {
    public let requestID: String
    public let tool: String
    public let argsPreview: [String: AnyCodable]?
    public let scopes: [String]

    enum CodingKeys: String, CodingKey {
        case requestID = "requestId"
        case tool
        case argsPreview
        case scopes
    }
}

/// Payload for the `approval_decision` client event.
public struct ApprovalDecisionPayload: Codable, Sendable {
    public let requestID: String
    public let decision: String  // "approve" or "deny"
    public let scope: String?    // "allow_once", "allow_for_session", "always_for_agent_tool"

    enum CodingKeys: String, CodingKey {
        case requestID = "requestId"
        case decision
        case scope
    }

    public init(requestID: String, decision: String, scope: String? = nil) {
        self.requestID = requestID
        self.decision = decision
        self.scope = scope
    }
}

/// Payload for the `typing` event.
public struct TypingPayload: Codable, Sendable {
    public let userID: String?
    public let isTyping: Bool

    enum CodingKeys: String, CodingKey {
        case userID = "userId"
        case isTyping
    }

    public init(userID: String? = nil, isTyping: Bool) {
        self.userID = userID
        self.isTyping = isTyping
    }
}

/// Payload for the `bridge_status` user channel event.
public struct BridgeStatusPayload: Codable, Sendable {
    public let bridgeID: String
    public let status: String

    enum CodingKeys: String, CodingKey {
        case bridgeID = "bridgeId"
        case status
    }
}

/// Payload for the `code_block` agent event.
public struct CodeBlockPayload: Codable, Sendable {
    public let language: String
    public let code: String
}

/// Payload for the `tool_call` agent event.
public struct ToolCallPayload: Codable, Sendable {
    public let tool: String
    public let args: [String: AnyCodable]?
}

/// Payload for the `tool_result` agent event.
public struct ToolResultPayload: Codable, Sendable {
    public let tool: String
    public let result: AnyCodable
}
