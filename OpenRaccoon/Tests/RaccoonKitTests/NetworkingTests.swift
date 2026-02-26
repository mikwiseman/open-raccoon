import Foundation
import Testing
@testable import RaccoonKit

@Suite("Networking")
struct NetworkingTests {
    @Test("JSON decoder handles fractional-second timestamps from API")
    func decoderSupportsFractionalSeconds() throws {
        let json = """
        {
            "id": "conv_123",
            "type": "dm",
            "title": "Fractional Date",
            "created_at": "2026-02-25T19:13:12.147649Z",
            "updated_at": "2026-02-25T19:13:12.147649Z"
        }
        """.data(using: .utf8)!

        let conversation = try JSONDecoder.raccoon.decode(Conversation.self, from: json)
        #expect(conversation.id == "conv_123")
        #expect(conversation.createdAt <= Date())
    }

    @Test("WebSocket decoder handles wrapped conversation payloads")
    @MainActor
    func decodeWrappedConversationMessagePayload() {
        let payload: [String: Any] = [
            "message": [
                "id": "msg_wrapped",
                "conversation_id": "conv_123",
                "sender_id": "user_123",
                "sender_type": "human",
                "type": "text",
                "content": ["text": "hello"],
                "metadata": [:],
                "created_at": "2026-02-25T19:13:12.147649Z"
            ]
        ]

        let decoded = WebSocketClient.decodeConversationMessage(payload: payload)
        #expect(decoded?.id == "msg_wrapped")
        #expect(decoded?.content.text == "hello")
    }

    @Test("WebSocket decoder handles direct conversation payloads")
    @MainActor
    func decodeDirectConversationMessagePayload() {
        let payload: [String: Any] = [
            "id": "msg_direct",
            "conversation_id": "conv_123",
            "sender_id": "user_456",
            "sender_type": "human",
            "type": "text",
            "content": ["text": "world"],
            "metadata": [:],
            "created_at": "2026-02-25T19:13:12.147649Z"
        ]

        let decoded = WebSocketClient.decodeConversationMessage(payload: payload)
        #expect(decoded?.id == "msg_direct")
        #expect(decoded?.content.text == "world")
    }
}
