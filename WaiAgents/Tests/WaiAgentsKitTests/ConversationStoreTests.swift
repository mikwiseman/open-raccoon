import Foundation
import Testing
@testable import WaiAgentsKit

@Suite("ConversationStore")
struct ConversationStoreTests {

    private func makeConversation(id: String, title: String? = nil, type: Conversation.ConversationType = .dm) -> Conversation {
        Conversation(id: id, type: type, title: title)
    }

    // MARK: - Initial State

    @Test("Initial state has empty conversations array")
    @MainActor
    func initialStateEmpty() {
        let store = ConversationStore()
        #expect(store.conversations.isEmpty)
    }

    @Test("Initial state has isLoading set to false")
    @MainActor
    func initialStateNotLoading() {
        let store = ConversationStore()
        #expect(store.isLoading == false)
    }

    // MARK: - conversation(byID:)

    @Test("conversation(byID:) returns nil when no conversations exist")
    @MainActor
    func conversationByIDNil() {
        let store = ConversationStore()
        #expect(store.conversation(byID: "nonexistent") == nil)
    }

    @Test("conversation(byID:) returns the matching conversation")
    @MainActor
    func conversationByIDFound() {
        let store = ConversationStore()
        let conv = makeConversation(id: "conv_1", title: "Test Chat")
        store.conversations = [conv]
        let result = store.conversation(byID: "conv_1")
        #expect(result?.id == "conv_1")
        #expect(result?.title == "Test Chat")
    }

    @Test("conversation(byID:) returns nil for non-matching ID")
    @MainActor
    func conversationByIDNotFound() {
        let store = ConversationStore()
        store.conversations = [makeConversation(id: "conv_1")]
        #expect(store.conversation(byID: "conv_2") == nil)
    }

    // MARK: - upsert

    @Test("upsert inserts a new conversation at the beginning")
    @MainActor
    func upsertInsertsNew() {
        let store = ConversationStore()
        let existing = makeConversation(id: "conv_existing")
        store.conversations = [existing]

        let newConv = makeConversation(id: "conv_new", title: "New Chat")
        store.upsert(newConv)

        #expect(store.conversations.count == 2)
        #expect(store.conversations[0].id == "conv_new")
        #expect(store.conversations[1].id == "conv_existing")
    }

    @Test("upsert updates an existing conversation in place")
    @MainActor
    func upsertUpdatesExisting() {
        let store = ConversationStore()
        let original = makeConversation(id: "conv_1", title: "Original")
        store.conversations = [original]

        let updated = makeConversation(id: "conv_1", title: "Updated Title")
        store.upsert(updated)

        #expect(store.conversations.count == 1)
        #expect(store.conversations[0].title == "Updated Title")
    }

    @Test("upsert preserves order of other conversations when updating")
    @MainActor
    func upsertPreservesOrder() {
        let store = ConversationStore()
        store.conversations = [
            makeConversation(id: "c1"),
            makeConversation(id: "c2"),
            makeConversation(id: "c3"),
        ]

        let updated = makeConversation(id: "c2", title: "Updated")
        store.upsert(updated)

        #expect(store.conversations.count == 3)
        #expect(store.conversations[0].id == "c1")
        #expect(store.conversations[1].id == "c2")
        #expect(store.conversations[1].title == "Updated")
        #expect(store.conversations[2].id == "c3")
    }

    // MARK: - remove

    @Test("remove removes the conversation with matching ID")
    @MainActor
    func removeByID() {
        let store = ConversationStore()
        store.conversations = [
            makeConversation(id: "c1"),
            makeConversation(id: "c2"),
            makeConversation(id: "c3"),
        ]

        store.remove(id: "c2")

        #expect(store.conversations.count == 2)
        #expect(store.conversations.map(\.id) == ["c1", "c3"])
    }

    @Test("remove does nothing for non-existent ID")
    @MainActor
    func removeNonExistent() {
        let store = ConversationStore()
        store.conversations = [makeConversation(id: "c1")]

        store.remove(id: "c_nonexistent")

        #expect(store.conversations.count == 1)
    }

    @Test("remove on empty store does nothing")
    @MainActor
    func removeFromEmptyStore() {
        let store = ConversationStore()
        store.remove(id: "c1")
        #expect(store.conversations.isEmpty)
    }

    // MARK: - Conversations Array Management

    @Test("Setting conversations replaces entire array")
    @MainActor
    func setConversationsReplaces() {
        let store = ConversationStore()
        store.conversations = [makeConversation(id: "c1")]
        #expect(store.conversations.count == 1)

        store.conversations = [
            makeConversation(id: "c2"),
            makeConversation(id: "c3"),
        ]
        #expect(store.conversations.count == 2)
        #expect(store.conversations[0].id == "c2")
    }

    @Test("Multiple upserts of new conversations accumulate at the beginning")
    @MainActor
    func multipleUpsertsAccumulate() {
        let store = ConversationStore()
        store.upsert(makeConversation(id: "c1"))
        store.upsert(makeConversation(id: "c2"))
        store.upsert(makeConversation(id: "c3"))

        #expect(store.conversations.count == 3)
        // Each new insert goes to position 0
        #expect(store.conversations[0].id == "c3")
        #expect(store.conversations[1].id == "c2")
        #expect(store.conversations[2].id == "c1")
    }
}
