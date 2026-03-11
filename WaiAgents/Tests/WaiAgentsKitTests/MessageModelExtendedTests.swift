import Foundation
import Testing
@testable import WaiAgentsKit

@Suite("Message Model Extended Tests")
struct MessageModelExtendedTests {

    // MARK: - SenderType Raw Values

    @Test("All SenderType raw values match API contract")
    func senderTypeRawValues() {
        #expect(Message.SenderType.human.rawValue == "human")
        #expect(Message.SenderType.agent.rawValue == "agent")
        #expect(Message.SenderType.bridge.rawValue == "bridge")
        #expect(Message.SenderType.system.rawValue == "system")
    }

    // MARK: - MessageType Raw Values

    @Test("All MessageType raw values match API contract")
    func messageTypeRawValues() {
        #expect(Message.MessageType.text.rawValue == "text")
        #expect(Message.MessageType.media.rawValue == "media")
        #expect(Message.MessageType.code.rawValue == "code")
        #expect(Message.MessageType.embed.rawValue == "embed")
        #expect(Message.MessageType.system.rawValue == "system")
        #expect(Message.MessageType.agentStatus.rawValue == "agent_status")
    }

    // MARK: - Full Message Decode

    @Test("Message decodes with all optional fields present")
    func messageFullDecode() throws {
        let json = """
        {
            "id": "msg_full",
            "conversation_id": "conv_1",
            "sender_id": "user_1",
            "sender_type": "human",
            "type": "text",
            "content": {"text": "Hello with metadata"},
            "metadata": {
                "reply_to": "msg_prev",
                "thread_id": "thread_1",
                "encryption": "e2e",
                "agent_model": "claude-opus-4-6",
                "agent_tools_used": ["web_search"]
            },
            "reactions": [
                {"id": "r1", "message_id": "msg_full", "user_id": "user_2", "emoji": "thumbsup", "created_at": "2026-03-01T10:01:00Z"}
            ],
            "edited_at": "2026-03-01T10:05:00Z",
            "deleted_at": null,
            "created_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!

        let msg = try JSONDecoder.waiagents.decode(Message.self, from: json)
        #expect(msg.id == "msg_full")
        #expect(msg.conversationID == "conv_1")
        #expect(msg.senderID == "user_1")
        #expect(msg.senderType == .human)
        #expect(msg.type == .text)
        #expect(msg.content.text == "Hello with metadata")
        #expect(msg.metadata?.replyTo == "msg_prev")
        #expect(msg.metadata?.threadID == "thread_1")
        #expect(msg.metadata?.encryption == .e2e)
        #expect(msg.metadata?.agentModel == "claude-opus-4-6")
        #expect(msg.metadata?.agentToolsUsed == ["web_search"])
        #expect(msg.reactions?.count == 1)
        #expect(msg.editedAt != nil)
        #expect(msg.deletedAt == nil)
    }

    // MARK: - Minimal Message Decode

    @Test("Message decodes with only required fields")
    func messageMinimalDecode() throws {
        let json = """
        {
            "id": "msg_min",
            "conversation_id": "conv_1",
            "sender_type": "system",
            "type": "system",
            "content": {"text": "System message"},
            "created_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!

        let msg = try JSONDecoder.waiagents.decode(Message.self, from: json)
        #expect(msg.id == "msg_min")
        #expect(msg.senderID == nil)
        #expect(msg.senderType == .system)
        #expect(msg.type == .system)
        #expect(msg.metadata == nil)
        #expect(msg.reactions == nil)
        #expect(msg.editedAt == nil)
        #expect(msg.deletedAt == nil)
    }

    // MARK: - Round Trip

    @Test("Message round-trips through encoding and decoding")
    func messageRoundTrip() throws {
        let original = Message(
            id: "msg_rt",
            conversationID: "conv_rt",
            senderID: "user_rt",
            senderType: .human,
            type: .text,
            content: MessageContent(text: "Round trip message"),
            metadata: MessageMetadata(replyTo: "msg_prev")
        )

        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(Message.self, from: data)
        #expect(decoded.id == original.id)
        #expect(decoded.conversationID == original.conversationID)
        #expect(decoded.senderID == original.senderID)
        #expect(decoded.senderType == original.senderType)
        #expect(decoded.type == original.type)
        #expect(decoded.content.text == original.content.text)
        #expect(decoded.metadata?.replyTo == original.metadata?.replyTo)
    }

    // MARK: - Code Message

    @Test("Code message decodes with language and code content")
    func codeMessageDecode() throws {
        let json = """
        {
            "id": "msg_code",
            "conversation_id": "conv_1",
            "sender_id": "agent_1",
            "sender_type": "agent",
            "type": "code",
            "content": {"text": "Here's the code:", "code": "func hello() { print(\\"hi\\") }", "language": "swift"},
            "created_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!

        let msg = try JSONDecoder.waiagents.decode(Message.self, from: json)
        #expect(msg.type == .code)
        #expect(msg.content.code != nil)
        #expect(msg.content.language == "swift")
    }

    // MARK: - Media Message

    @Test("Media message decodes with media URL")
    func mediaMessageDecode() throws {
        let json = """
        {
            "id": "msg_media",
            "conversation_id": "conv_1",
            "sender_id": "user_1",
            "sender_type": "human",
            "type": "media",
            "content": {"text": "Check this out", "media_url": "https://example.com/photo.jpg"},
            "created_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!

        let msg = try JSONDecoder.waiagents.decode(Message.self, from: json)
        #expect(msg.type == .media)
        #expect(msg.content.mediaURL?.absoluteString == "https://example.com/photo.jpg")
    }

    // MARK: - Agent Status Message

    @Test("Agent status message decodes")
    func agentStatusMessageDecode() throws {
        let json = """
        {
            "id": "msg_status",
            "conversation_id": "conv_1",
            "sender_id": "agent_1",
            "sender_type": "agent",
            "type": "agent_status",
            "content": {"text": "Searching the web..."},
            "created_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!

        let msg = try JSONDecoder.waiagents.decode(Message.self, from: json)
        #expect(msg.type == .agentStatus)
        #expect(msg.senderType == .agent)
        #expect(msg.content.text == "Searching the web...")
    }

    // MARK: - Embed Message

    @Test("Embed message decodes with embed content")
    func embedMessageDecode() throws {
        let json = """
        {
            "id": "msg_embed",
            "conversation_id": "conv_1",
            "sender_id": "agent_1",
            "sender_type": "agent",
            "type": "embed",
            "content": {
                "embed": {
                    "title": "GitHub",
                    "description": "Code hosting platform",
                    "url": "https://github.com"
                }
            },
            "created_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!

        let msg = try JSONDecoder.waiagents.decode(Message.self, from: json)
        #expect(msg.type == .embed)
        #expect(msg.content.embed?.title == "GitHub")
        #expect(msg.content.embed?.description == "Code hosting platform")
        #expect(msg.content.embed?.url?.absoluteString == "https://github.com")
    }

    // MARK: - Equatable

    @Test("Message equality compares IDs and content")
    func messageEquality() {
        let now = Date(timeIntervalSince1970: 1_000_000)
        let a = Message(id: "m1", conversationID: "c1", senderType: .human, type: .text, content: MessageContent(text: "Hi"), createdAt: now)
        let b = Message(id: "m1", conversationID: "c1", senderType: .human, type: .text, content: MessageContent(text: "Hi"), createdAt: now)
        let c = Message(id: "m2", conversationID: "c1", senderType: .human, type: .text, content: MessageContent(text: "Hi"), createdAt: now)
        #expect(a == b)
        #expect(a != c)
    }

    // MARK: - Deleted Message

    @Test("Message with deletedAt is recognized as deleted")
    func deletedMessage() {
        let msg = Message(
            id: "m1",
            conversationID: "c1",
            senderType: .human,
            type: .text,
            content: MessageContent(text: "Deleted"),
            deletedAt: Date()
        )
        #expect(msg.deletedAt != nil)
    }

    // MARK: - Edited Message

    @Test("Message with editedAt is recognized as edited")
    func editedMessage() {
        let msg = Message(
            id: "m1",
            conversationID: "c1",
            senderType: .human,
            type: .text,
            content: MessageContent(text: "Edited"),
            editedAt: Date()
        )
        #expect(msg.editedAt != nil)
    }

    // MARK: - Multiple Reactions

    @Test("Message with multiple reactions decodes correctly")
    func multipleReactions() throws {
        let json = """
        {
            "id": "msg_rx",
            "conversation_id": "conv_1",
            "sender_type": "human",
            "type": "text",
            "content": {"text": "Great!"},
            "reactions": [
                {"id": "r1", "message_id": "msg_rx", "user_id": "u1", "emoji": "thumbsup", "created_at": "2026-03-01T10:00:00Z"},
                {"id": "r2", "message_id": "msg_rx", "user_id": "u2", "emoji": "heart", "created_at": "2026-03-01T10:01:00Z"},
                {"id": "r3", "message_id": "msg_rx", "user_id": "u3", "emoji": "fire", "created_at": "2026-03-01T10:02:00Z"}
            ],
            "created_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!

        let msg = try JSONDecoder.waiagents.decode(Message.self, from: json)
        #expect(msg.reactions?.count == 3)
        #expect(msg.reactions?[0].emoji == "thumbsup")
        #expect(msg.reactions?[1].emoji == "heart")
        #expect(msg.reactions?[2].emoji == "fire")
    }
}
