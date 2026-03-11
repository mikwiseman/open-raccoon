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

// MARK: - Tool Approval Request (agent-events)

/// Payload for the `tool_approval_request` agent event (from `agent-events.ts`).
public struct ToolApprovalRequestPayload: Codable, Sendable {
    public let requestID: String
    public let toolName: String
    public let argsPreview: String
    public let scopes: [String]

    enum CodingKeys: String, CodingKey {
        case requestID = "requestId"
        case toolName
        case argsPreview
        case scopes
    }

    public init(requestID: String, toolName: String, argsPreview: String, scopes: [String]) {
        self.requestID = requestID
        self.toolName = toolName
        self.argsPreview = argsPreview
        self.scopes = scopes
    }
}

// MARK: - Crew Channel Events

/// Events received from server on `crew:{crewId}` channel.
public enum CrewServerEvent: String, Sendable {
    case stepStarted = "crew:step_started"
    case stepCompleted = "crew:step_completed"
    case finished = "crew:finished"
    case error = "crew:error"
}

/// Payload for the `crew:step_started` event.
public struct CrewStepStartedPayload: Codable, Sendable {
    public let crewID: String
    public let stepIndex: Int
    public let agentID: String
    public let role: String
    public let parallelGroup: String?

    enum CodingKeys: String, CodingKey {
        case crewID = "crewId"
        case stepIndex
        case agentID = "agentId"
        case role
        case parallelGroup
    }
}

/// Payload for the `crew:step_completed` event.
public struct CrewStepCompletedPayload: Codable, Sendable {
    public let crewID: String
    public let stepIndex: Int
    public let agentID: String
    public let role: String
    public let response: String

    enum CodingKeys: String, CodingKey {
        case crewID = "crewId"
        case stepIndex
        case agentID = "agentId"
        case role
        case response
    }
}

/// Payload for the `crew:finished` event.
public struct CrewFinishedPayload: Codable, Sendable {
    public let crewID: String
    public let totalSteps: Int
    public let finalResponse: String

    enum CodingKeys: String, CodingKey {
        case crewID = "crewId"
        case totalSteps
        case finalResponse
    }
}

/// Payload for the `crew:error` event.
public struct CrewErrorPayload: Codable, Sendable {
    public let crewID: String
    public let error: String
    public let stepIndex: Int?

    enum CodingKeys: String, CodingKey {
        case crewID = "crewId"
        case error
        case stepIndex
    }
}

// MARK: - Trigger Channel Events

/// Events received from server on `agent:{agentId}` channel for triggers.
public enum TriggerServerEvent: String, Sendable {
    case fired = "trigger:fired"
}

/// Payload for the `trigger:fired` event.
public struct TriggerFiredPayload: Codable, Sendable {
    public let triggerID: String
    public let agentID: String
    public let triggerType: String
    public let conversationID: String
    public let firedAt: String

    enum CodingKeys: String, CodingKey {
        case triggerID = "triggerId"
        case agentID = "agentId"
        case triggerType
        case conversationID = "conversationId"
        case firedAt
    }
}
