import Foundation
import Testing
@testable import WaiAgentsKit

@Suite("WebSocketClient Edge Cases")
struct WebSocketClientEdgeCaseTests {

    // MARK: - ConnectionState Enum

    @Test("ConnectionState rawValues match expected strings")
    func connectionStateRawValues() {
        #expect(WebSocketClient.ConnectionState.connecting.rawValue == "connecting")
        #expect(WebSocketClient.ConnectionState.connected.rawValue == "connected")
        #expect(WebSocketClient.ConnectionState.disconnected.rawValue == "disconnected")
    }

    @Test("ConnectionState is Sendable conformant")
    func connectionStateIsSendable() {
        let state: any Sendable = WebSocketClient.ConnectionState.connected
        #expect(state as? WebSocketClient.ConnectionState == .connected)
    }

    // MARK: - decodeConversationMessage (static)

    @Test("decodeConversationMessage returns nil for empty payload")
    @MainActor
    func decodeEmptyPayload() {
        let decoded = WebSocketClient.decodeConversationMessage(payload: [:])
        #expect(decoded == nil)
    }

    @Test("decodeConversationMessage returns nil for invalid payload structure")
    @MainActor
    func decodeInvalidPayload() {
        let payload: [String: Any] = ["garbage": "data", "random": 42]
        let decoded = WebSocketClient.decodeConversationMessage(payload: payload)
        #expect(decoded == nil)
    }

    @Test("decodeConversationMessage handles wrapped payload with nested message key")
    @MainActor
    func decodeWrappedPayloadNested() {
        let payload: [String: Any] = [
            "message": [
                "id": "msg_wrap_test",
                "conversation_id": "conv_1",
                "sender_id": "user_1",
                "sender_type": "agent",
                "type": "text",
                "content": ["text": "wrapped message"],
                "created_at": "2026-03-01T10:00:00Z",
            ]
        ]

        let decoded = WebSocketClient.decodeConversationMessage(payload: payload)
        #expect(decoded?.id == "msg_wrap_test")
        #expect(decoded?.senderType == .agent)
        #expect(decoded?.content.text == "wrapped message")
    }

    @Test("decodeConversationMessage handles direct payload without message wrapper")
    @MainActor
    func decodeDirectPayload() {
        let payload: [String: Any] = [
            "id": "msg_direct_test",
            "conversation_id": "conv_2",
            "sender_type": "human",
            "type": "text",
            "content": ["text": "direct message"],
            "created_at": "2026-03-01T10:00:00Z",
        ]

        let decoded = WebSocketClient.decodeConversationMessage(payload: payload)
        #expect(decoded?.id == "msg_direct_test")
        #expect(decoded?.senderType == .human)
        #expect(decoded?.content.text == "direct message")
    }

    @Test("decodeConversationMessage returns nil when message key exists but has invalid content")
    @MainActor
    func decodeWrappedInvalidMessage() {
        let payload: [String: Any] = [
            "message": ["not": "a valid message"]
        ]

        let decoded = WebSocketClient.decodeConversationMessage(payload: payload)
        #expect(decoded == nil)
    }

    @Test("decodeConversationMessage handles message with null sender_id")
    @MainActor
    func decodeMessageWithNullSenderID() {
        let payload: [String: Any] = [
            "id": "msg_system",
            "conversation_id": "conv_1",
            "sender_type": "system",
            "type": "system",
            "content": ["text": "User joined the conversation"],
            "created_at": "2026-03-01T10:00:00Z",
        ]

        let decoded = WebSocketClient.decodeConversationMessage(payload: payload)
        #expect(decoded?.id == "msg_system")
        #expect(decoded?.senderID == nil)
        #expect(decoded?.senderType == .system)
    }

    @Test("decodeConversationMessage handles message with code content type")
    @MainActor
    func decodeCodeMessage() {
        let payload: [String: Any] = [
            "id": "msg_code",
            "conversation_id": "conv_1",
            "sender_id": "agent_1",
            "sender_type": "agent",
            "type": "code",
            "content": ["code": "print('hi')", "language": "python"],
            "created_at": "2026-03-01T10:00:00Z",
        ]

        let decoded = WebSocketClient.decodeConversationMessage(payload: payload)
        #expect(decoded?.id == "msg_code")
        #expect(decoded?.type == .code)
        #expect(decoded?.content.code == "print('hi')")
        #expect(decoded?.content.language == "python")
    }

    @Test("decodeConversationMessage handles message with bridge sender type")
    @MainActor
    func decodeBridgeMessage() {
        let payload: [String: Any] = [
            "id": "msg_bridge",
            "conversation_id": "conv_1",
            "sender_id": "bridge_1",
            "sender_type": "bridge",
            "type": "text",
            "content": ["text": "message from telegram"],
            "created_at": "2026-03-01T10:00:00Z",
        ]

        let decoded = WebSocketClient.decodeConversationMessage(payload: payload)
        #expect(decoded?.id == "msg_bridge")
        #expect(decoded?.senderType == .bridge)
    }

    @Test("decodeConversationMessage handles fractional-second timestamps")
    @MainActor
    func decodeFractionalSeconds() {
        let payload: [String: Any] = [
            "id": "msg_frac",
            "conversation_id": "conv_1",
            "sender_type": "human",
            "type": "text",
            "content": ["text": "test"],
            "created_at": "2026-03-01T10:00:00.123456Z",
        ]

        let decoded = WebSocketClient.decodeConversationMessage(payload: payload)
        #expect(decoded?.id == "msg_frac")
    }

    // MARK: - WebSocket Event Enums

    @Test("ConversationServerEvent raw values match API contract")
    func conversationServerEventRawValues() {
        #expect(ConversationServerEvent.newMessage.rawValue == "new_message")
        #expect(ConversationServerEvent.messageUpdated.rawValue == "message_updated")
        #expect(ConversationServerEvent.typing.rawValue == "typing")
        #expect(ConversationServerEvent.presenceState.rawValue == "presence_state")
        #expect(ConversationServerEvent.presenceDiff.rawValue == "presence_diff")
    }

    @Test("ConversationClientEvent raw values match API contract")
    func conversationClientEventRawValues() {
        #expect(ConversationClientEvent.newMessage.rawValue == "new_message")
        #expect(ConversationClientEvent.typing.rawValue == "typing")
        #expect(ConversationClientEvent.read.rawValue == "read")
        #expect(ConversationClientEvent.react.rawValue == "react")
    }

    @Test("AgentServerEvent raw values match API contract")
    func agentServerEventRawValues() {
        #expect(AgentServerEvent.token.rawValue == "token")
        #expect(AgentServerEvent.status.rawValue == "status")
        #expect(AgentServerEvent.approvalRequested.rawValue == "approval_requested")
        #expect(AgentServerEvent.approvalGranted.rawValue == "approval_granted")
        #expect(AgentServerEvent.approvalDenied.rawValue == "approval_denied")
        #expect(AgentServerEvent.approvalRevoked.rawValue == "approval_revoked")
        #expect(AgentServerEvent.toolCall.rawValue == "tool_call")
        #expect(AgentServerEvent.toolResult.rawValue == "tool_result")
        #expect(AgentServerEvent.codeBlock.rawValue == "code_block")
        #expect(AgentServerEvent.complete.rawValue == "complete")
        #expect(AgentServerEvent.error.rawValue == "error")
    }

    @Test("AgentClientEvent raw values match API contract")
    func agentClientEventRawValues() {
        #expect(AgentClientEvent.approvalDecision.rawValue == "approval_decision")
    }

    @Test("UserServerEvent raw values match API contract")
    func userServerEventRawValues() {
        #expect(UserServerEvent.notification.rawValue == "notification")
        #expect(UserServerEvent.bridgeStatus.rawValue == "bridge_status")
        #expect(UserServerEvent.conversationUpdated.rawValue == "conversation_updated")
    }

    // MARK: - WebSocket Event Payload Encoding/Decoding

    @Test("TypingPayload round-trips through JSON")
    func typingPayloadRoundTrip() throws {
        let original = TypingPayload(userID: "user_123", isTyping: true)
        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(TypingPayload.self, from: data)
        #expect(decoded.userID == "user_123")
        #expect(decoded.isTyping == true)
    }

    @Test("TypingPayload decodes with null userID")
    func typingPayloadNullUser() throws {
        let json = """
        {"is_typing": false}
        """.data(using: .utf8)!
        let decoded = try JSONDecoder.waiagents.decode(TypingPayload.self, from: json)
        #expect(decoded.userID == nil)
        #expect(decoded.isTyping == false)
    }

    @Test("ApprovalRequestPayload round-trips through JSON")
    func approvalRequestPayloadRoundTrip() throws {
        let original = ApprovalRequestPayload(
            requestID: "req_1",
            tool: "web_search",
            argsPreview: ["query": .string("test search")],
            scopes: ["allow_once", "allow_for_session"]
        )
        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(ApprovalRequestPayload.self, from: data)
        #expect(decoded.requestID == "req_1")
        #expect(decoded.tool == "web_search")
        #expect(decoded.scopes.count == 2)
        #expect(decoded.argsPreview?["query"]?.stringValue == "test search")
    }

    @Test("ApprovalDecisionPayload round-trips through JSON")
    func approvalDecisionPayloadRoundTrip() throws {
        let original = ApprovalDecisionPayload(
            requestID: "req_1",
            decision: "approve",
            scope: "allow_for_session"
        )
        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(ApprovalDecisionPayload.self, from: data)
        #expect(decoded.requestID == "req_1")
        #expect(decoded.decision == "approve")
        #expect(decoded.scope == "allow_for_session")
    }

    @Test("ApprovalDecisionPayload decodes with nil scope")
    func approvalDecisionPayloadNilScope() throws {
        let json = """
        {"request_id": "req_2", "decision": "deny"}
        """.data(using: .utf8)!
        let decoded = try JSONDecoder.waiagents.decode(ApprovalDecisionPayload.self, from: json)
        #expect(decoded.requestID == "req_2")
        #expect(decoded.decision == "deny")
        #expect(decoded.scope == nil)
    }

    @Test("BridgeStatusPayload round-trips through JSON")
    func bridgeStatusPayloadRoundTrip() throws {
        let json = """
        {"bridge_id": "br_1", "status": "reconnecting"}
        """.data(using: .utf8)!
        let decoded = try JSONDecoder.waiagents.decode(BridgeStatusPayload.self, from: json)
        #expect(decoded.bridgeID == "br_1")
        #expect(decoded.status == "reconnecting")
    }

    @Test("CodeBlockPayload round-trips through JSON")
    func codeBlockPayloadRoundTrip() throws {
        let original = CodeBlockPayload(language: "swift", code: "let x = 42")
        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(CodeBlockPayload.self, from: data)
        #expect(decoded.language == "swift")
        #expect(decoded.code == "let x = 42")
    }

    @Test("ToolCallPayload round-trips through JSON")
    func toolCallPayloadRoundTrip() throws {
        let original = ToolCallPayload(
            tool: "calculator",
            args: ["expression": .string("2+2"), "precision": .int(10)]
        )
        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(ToolCallPayload.self, from: data)
        #expect(decoded.tool == "calculator")
        #expect(decoded.args?["expression"]?.stringValue == "2+2")
        #expect(decoded.args?["precision"]?.intValue == 10)
    }

    @Test("ToolCallPayload decodes with nil args")
    func toolCallPayloadNilArgs() throws {
        let json = """
        {"tool": "no_args_tool"}
        """.data(using: .utf8)!
        let decoded = try JSONDecoder.waiagents.decode(ToolCallPayload.self, from: json)
        #expect(decoded.tool == "no_args_tool")
        #expect(decoded.args == nil)
    }

    @Test("ToolResultPayload round-trips through JSON")
    func toolResultPayloadRoundTrip() throws {
        let original = ToolResultPayload(
            tool: "calculator",
            result: .dictionary(["answer": .int(4), "formatted": .string("4")])
        )
        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(ToolResultPayload.self, from: data)
        #expect(decoded.tool == "calculator")
        #expect(decoded.result.dictionaryValue?["answer"]?.intValue == 4)
    }

    @Test("ToolResultPayload with simple string result")
    func toolResultPayloadStringResult() throws {
        let json = """
        {"tool": "echo", "result": "hello world"}
        """.data(using: .utf8)!
        let decoded = try JSONDecoder.waiagents.decode(ToolResultPayload.self, from: json)
        #expect(decoded.tool == "echo")
        #expect(decoded.result.stringValue == "hello world")
    }

    @Test("ApprovalRequestPayload decodes with nil argsPreview")
    func approvalRequestPayloadNilArgs() throws {
        let json = """
        {"request_id": "req_3", "tool": "dangerous_tool", "scopes": ["allow_once"]}
        """.data(using: .utf8)!
        let decoded = try JSONDecoder.waiagents.decode(ApprovalRequestPayload.self, from: json)
        #expect(decoded.requestID == "req_3")
        #expect(decoded.argsPreview == nil)
        #expect(decoded.scopes == ["allow_once"])
    }

    @Test("ApprovalRequestPayload decodes with empty scopes array")
    func approvalRequestPayloadEmptyScopes() throws {
        let json = """
        {"request_id": "req_4", "tool": "some_tool", "scopes": []}
        """.data(using: .utf8)!
        let decoded = try JSONDecoder.waiagents.decode(ApprovalRequestPayload.self, from: json)
        #expect(decoded.scopes.isEmpty)
    }
}
