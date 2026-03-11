import Foundation
import Testing
@testable import WaiAgentsKit

@Suite("Conversation Model Extended Tests")
struct ConversationModelExtendedTests {

    // MARK: - Full Decode

    @Test("Conversation decodes from JSON with all fields present")
    func conversationDecodesAllFields() throws {
        let json = """
        {
            "id": "conv_full",
            "type": "agent",
            "title": "My Agent Chat",
            "avatar_url": "https://example.com/avatar.png",
            "creator_id": "user_1",
            "agent_id": "agent_1",
            "bridge_id": null,
            "metadata": {"theme": "dark"},
            "last_message_at": "2026-03-10T15:00:00Z",
            "created_at": "2026-03-01T10:00:00Z",
            "updated_at": "2026-03-10T15:00:00Z"
        }
        """.data(using: .utf8)!

        let conv = try JSONDecoder.waiagents.decode(Conversation.self, from: json)
        #expect(conv.id == "conv_full")
        #expect(conv.type == .agent)
        #expect(conv.title == "My Agent Chat")
        #expect(conv.avatarURL?.absoluteString == "https://example.com/avatar.png")
        #expect(conv.creatorID == "user_1")
        #expect(conv.agentID == "agent_1")
        #expect(conv.bridgeID == nil)
        #expect(conv.metadata?["theme"]?.stringValue == "dark")
        #expect(conv.lastMessageAt != nil)
    }

    // MARK: - Minimal Decode

    @Test("Conversation decodes with only required fields")
    func conversationDecodesMinimal() throws {
        let json = """
        {"id": "conv_min", "type": "dm", "created_at": "2026-03-01T10:00:00Z"}
        """.data(using: .utf8)!

        let conv = try JSONDecoder.waiagents.decode(Conversation.self, from: json)
        #expect(conv.id == "conv_min")
        #expect(conv.type == .dm)
        #expect(conv.title == nil)
        #expect(conv.avatarURL == nil)
        #expect(conv.creatorID == nil)
        #expect(conv.agentID == nil)
        #expect(conv.bridgeID == nil)
        #expect(conv.metadata == nil)
        #expect(conv.lastMessageAt == nil)
        #expect(conv.updatedAt == nil)
    }

    // MARK: - Bridge Conversation

    @Test("Conversation decodes bridge type with bridgeID")
    func bridgeConversation() throws {
        let json = """
        {
            "id": "conv_bridge",
            "type": "bridge",
            "title": "Telegram Chat",
            "bridge_id": "bridge_telegram",
            "metadata": {"platform": "telegram", "chat_id": "12345"},
            "created_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!

        let conv = try JSONDecoder.waiagents.decode(Conversation.self, from: json)
        #expect(conv.type == .bridge)
        #expect(conv.bridgeID == "bridge_telegram")
        #expect(conv.metadata?["platform"]?.stringValue == "telegram")
        #expect(conv.metadata?["chat_id"]?.stringValue == "12345")
    }

    // MARK: - Group Conversation

    @Test("Conversation decodes group type")
    func groupConversation() throws {
        let json = """
        {
            "id": "conv_group",
            "type": "group",
            "title": "Team Chat",
            "creator_id": "user_1",
            "created_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!

        let conv = try JSONDecoder.waiagents.decode(Conversation.self, from: json)
        #expect(conv.type == .group)
        #expect(conv.title == "Team Chat")
        #expect(conv.creatorID == "user_1")
    }

    // MARK: - Round Trip

    @Test("Conversation round-trips through encoding and decoding")
    func conversationRoundTrip() throws {
        let original = Conversation(
            id: "conv_rt",
            type: .agent,
            title: "Round Trip",
            creatorID: "user_1",
            agentID: "agent_1",
            metadata: ["key": .string("value")]
        )

        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(Conversation.self, from: data)
        #expect(decoded.id == original.id)
        #expect(decoded.type == original.type)
        #expect(decoded.title == original.title)
        #expect(decoded.creatorID == original.creatorID)
        #expect(decoded.agentID == original.agentID)
        #expect(decoded.metadata?["key"]?.stringValue == "value")
    }

    // MARK: - Equatable

    @Test("Conversation equality compares all fields")
    func conversationEquality() {
        let fixedDate = Date(timeIntervalSince1970: 1_000_000)
        let a = Conversation(id: "c1", type: .dm, title: "Chat", createdAt: fixedDate, updatedAt: fixedDate)
        let b = Conversation(id: "c1", type: .dm, title: "Chat", createdAt: fixedDate, updatedAt: fixedDate)
        let c = Conversation(id: "c2", type: .dm, title: "Chat", createdAt: fixedDate, updatedAt: fixedDate)
        #expect(a == b)
        #expect(a != c)
    }

    @Test("Conversation with different type is not equal")
    func conversationTypeInequality() {
        let a = Conversation(id: "c1", type: .dm)
        let b = Conversation(id: "c1", type: .agent)
        #expect(a != b)
    }

    // MARK: - ConversationType raw values

    @Test("ConversationType raw values match API contract")
    func conversationTypeRawValues() {
        #expect(Conversation.ConversationType.dm.rawValue == "dm")
        #expect(Conversation.ConversationType.group.rawValue == "group")
        #expect(Conversation.ConversationType.agent.rawValue == "agent")
        #expect(Conversation.ConversationType.bridge.rawValue == "bridge")
    }

    // MARK: - lastMessageAt Sorting

    @Test("Conversations can be sorted by lastMessageAt")
    func sortByLastMessage() {
        let now = Date()
        let c1 = Conversation(id: "c1", type: .dm, lastMessageAt: now.addingTimeInterval(-100))
        let c2 = Conversation(id: "c2", type: .dm, lastMessageAt: now)
        let c3 = Conversation(id: "c3", type: .dm, lastMessageAt: now.addingTimeInterval(-200))

        let sorted = [c1, c2, c3].sorted { ($0.lastMessageAt ?? .distantPast) > ($1.lastMessageAt ?? .distantPast) }
        #expect(sorted[0].id == "c2")
        #expect(sorted[1].id == "c1")
        #expect(sorted[2].id == "c3")
    }

    @Test("Conversations with nil lastMessageAt sort to end")
    func sortNilLastMessage() {
        let now = Date()
        let c1 = Conversation(id: "c1", type: .dm, lastMessageAt: now)
        let c2 = Conversation(id: "c2", type: .dm, lastMessageAt: nil)

        let sorted = [c2, c1].sorted { ($0.lastMessageAt ?? .distantPast) > ($1.lastMessageAt ?? .distantPast) }
        #expect(sorted[0].id == "c1")
        #expect(sorted[1].id == "c2")
    }
}
