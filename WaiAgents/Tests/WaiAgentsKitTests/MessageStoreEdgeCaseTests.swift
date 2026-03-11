import Foundation
import Testing
@testable import WaiAgentsKit

// MARK: - Helpers

private func makeMessage(
    id: String,
    conversationID: String = "conv_1",
    text: String = "test"
) -> Message {
    Message(
        id: id,
        conversationID: conversationID,
        senderType: .human,
        type: .text,
        content: MessageContent(text: text)
    )
}

@Suite("MessageStore Edge Cases")
struct MessageStoreEdgeCaseTests {

    // MARK: - Initial State

    @Test("Initial state: messages dictionary is empty")
    @MainActor
    func initialMessagesEmpty() {
        let store = MessageStore()
        #expect(store.messages.isEmpty)
    }

    @Test("Initial state: pageInfos dictionary is empty")
    @MainActor
    func initialPageInfosEmpty() {
        let store = MessageStore()
        #expect(store.pageInfos.isEmpty)
    }

    @Test("Initial state: isLoading is false")
    @MainActor
    func initialIsLoadingFalse() {
        let store = MessageStore()
        #expect(store.isLoading == false)
    }

    @Test("Initial state: isLoadingMore is false")
    @MainActor
    func initialIsLoadingMoreFalse() {
        let store = MessageStore()
        #expect(store.isLoadingMore == false)
    }

    // MARK: - messages(for:)

    @Test("messages(for:) returns empty array for unknown conversation")
    @MainActor
    func messagesForUnknownConversation() {
        let store = MessageStore()
        #expect(store.messages(for: "nonexistent").isEmpty)
    }

    @Test("messages(for:) returns stored messages for a known conversation")
    @MainActor
    func messagesForKnownConversation() {
        let store = MessageStore()
        let msg = makeMessage(id: "m1")
        store.messages["conv_1"] = [msg]
        let result = store.messages(for: "conv_1")
        #expect(result.count == 1)
        #expect(result[0].id == "m1")
    }

    @Test("messages(for:) returns different arrays for different conversations")
    @MainActor
    func messagesForDifferentConversations() {
        let store = MessageStore()
        store.messages["conv_a"] = [makeMessage(id: "m1", conversationID: "conv_a")]
        store.messages["conv_b"] = [
            makeMessage(id: "m2", conversationID: "conv_b"),
            makeMessage(id: "m3", conversationID: "conv_b"),
        ]
        #expect(store.messages(for: "conv_a").count == 1)
        #expect(store.messages(for: "conv_b").count == 2)
    }

    // MARK: - hasMore(for:)

    @Test("hasMore returns false for unknown conversation")
    @MainActor
    func hasMoreForUnknownConversation() {
        let store = MessageStore()
        #expect(store.hasMore(for: "nonexistent") == false)
    }

    @Test("hasMore returns true when pageInfo says so")
    @MainActor
    func hasMoreReturnsTrue() {
        let store = MessageStore()
        store.pageInfos["conv_1"] = PageInfo(nextCursor: "cursor_abc", hasMore: true)
        #expect(store.hasMore(for: "conv_1") == true)
    }

    @Test("hasMore returns false when pageInfo.hasMore is false")
    @MainActor
    func hasMoreReturnsFalse() {
        let store = MessageStore()
        store.pageInfos["conv_1"] = PageInfo(nextCursor: nil, hasMore: false)
        #expect(store.hasMore(for: "conv_1") == false)
    }

    @Test("hasMore returns false when pageInfo has hasMore=true but after updating to false")
    @MainActor
    func hasMoreUpdatesCorrectly() {
        let store = MessageStore()
        store.pageInfos["conv_1"] = PageInfo(nextCursor: "c1", hasMore: true)
        #expect(store.hasMore(for: "conv_1") == true)

        store.pageInfos["conv_1"] = PageInfo(nextCursor: nil, hasMore: false)
        #expect(store.hasMore(for: "conv_1") == false)
    }

    // MARK: - appendMessage

    @Test("appendMessage to empty conversation creates the array")
    @MainActor
    func appendToEmptyConversation() {
        let store = MessageStore()
        let msg = makeMessage(id: "m1")
        store.appendMessage(msg, to: "conv_1")

        #expect(store.messages(for: "conv_1").count == 1)
        #expect(store.messages(for: "conv_1")[0].id == "m1")
    }

    @Test("appendMessage adds to the end of existing messages")
    @MainActor
    func appendToExistingMessages() {
        let store = MessageStore()
        store.messages["conv_1"] = [makeMessage(id: "m1")]
        store.appendMessage(makeMessage(id: "m2"), to: "conv_1")

        let msgs = store.messages(for: "conv_1")
        #expect(msgs.count == 2)
        #expect(msgs[0].id == "m1")
        #expect(msgs[1].id == "m2")
    }

    @Test("appendMessage preserves ordering with many messages")
    @MainActor
    func appendPreservesOrdering() {
        let store = MessageStore()
        for i in 1...10 {
            store.appendMessage(makeMessage(id: "m\(i)"), to: "conv_1")
        }

        let msgs = store.messages(for: "conv_1")
        #expect(msgs.count == 10)
        for i in 1...10 {
            #expect(msgs[i - 1].id == "m\(i)")
        }
    }

    @Test("appendMessage to different conversations does not cross-contaminate")
    @MainActor
    func appendIsolatesBetweenConversations() {
        let store = MessageStore()
        store.appendMessage(makeMessage(id: "m1", conversationID: "conv_a"), to: "conv_a")
        store.appendMessage(makeMessage(id: "m2", conversationID: "conv_b"), to: "conv_b")

        #expect(store.messages(for: "conv_a").count == 1)
        #expect(store.messages(for: "conv_b").count == 1)
        #expect(store.messages(for: "conv_a")[0].id == "m1")
        #expect(store.messages(for: "conv_b")[0].id == "m2")
    }

    @Test("appendMessage allows duplicate message IDs (no dedup)")
    @MainActor
    func appendAllowsDuplicateIDs() {
        let store = MessageStore()
        store.appendMessage(makeMessage(id: "m1", text: "first"), to: "conv_1")
        store.appendMessage(makeMessage(id: "m1", text: "duplicate"), to: "conv_1")

        let msgs = store.messages(for: "conv_1")
        #expect(msgs.count == 2)
        #expect(msgs[0].content.text == "first")
        #expect(msgs[1].content.text == "duplicate")
    }

    // MARK: - updateMessage

    @Test("updateMessage replaces matching message content")
    @MainActor
    func updateMessageReplacesContent() {
        let store = MessageStore()
        store.messages["conv_1"] = [makeMessage(id: "m1", text: "original")]

        let updated = makeMessage(id: "m1", text: "updated")
        store.updateMessage(updated, in: "conv_1")

        #expect(store.messages(for: "conv_1")[0].content.text == "updated")
    }

    @Test("updateMessage does nothing when message ID is not found")
    @MainActor
    func updateMessageIDNotFound() {
        let store = MessageStore()
        store.messages["conv_1"] = [makeMessage(id: "m1", text: "original")]

        let unrelated = makeMessage(id: "m_nonexistent", text: "ghost")
        store.updateMessage(unrelated, in: "conv_1")

        #expect(store.messages(for: "conv_1").count == 1)
        #expect(store.messages(for: "conv_1")[0].content.text == "original")
    }

    @Test("updateMessage does nothing when conversation does not exist")
    @MainActor
    func updateMessageConversationNotFound() {
        let store = MessageStore()
        let msg = makeMessage(id: "m1")
        store.updateMessage(msg, in: "nonexistent_conv")
        #expect(store.messages(for: "nonexistent_conv").isEmpty)
    }

    @Test("updateMessage preserves other messages in the conversation")
    @MainActor
    func updatePreservesOtherMessages() {
        let store = MessageStore()
        store.messages["conv_1"] = [
            makeMessage(id: "m1", text: "first"),
            makeMessage(id: "m2", text: "second"),
            makeMessage(id: "m3", text: "third"),
        ]

        store.updateMessage(makeMessage(id: "m2", text: "edited"), in: "conv_1")

        let msgs = store.messages(for: "conv_1")
        #expect(msgs[0].content.text == "first")
        #expect(msgs[1].content.text == "edited")
        #expect(msgs[2].content.text == "third")
    }

    @Test("updateMessage only updates the first match when duplicates exist")
    @MainActor
    func updateMessageFirstMatchOnly() {
        let store = MessageStore()
        store.messages["conv_1"] = [
            makeMessage(id: "m1", text: "first occurrence"),
            makeMessage(id: "m1", text: "second occurrence"),
        ]

        store.updateMessage(makeMessage(id: "m1", text: "updated"), in: "conv_1")

        let msgs = store.messages(for: "conv_1")
        #expect(msgs[0].content.text == "updated")
        #expect(msgs[1].content.text == "second occurrence")
    }

    // MARK: - removeMessage

    @Test("removeMessage removes the matching message")
    @MainActor
    func removeMessageByID() {
        let store = MessageStore()
        store.messages["conv_1"] = [
            makeMessage(id: "m1"),
            makeMessage(id: "m2"),
            makeMessage(id: "m3"),
        ]

        store.removeMessage(id: "m2", from: "conv_1")

        let msgs = store.messages(for: "conv_1")
        #expect(msgs.count == 2)
        #expect(msgs.map(\.id) == ["m1", "m3"])
    }

    @Test("removeMessage does nothing for non-existent message ID")
    @MainActor
    func removeMessageNonExistentID() {
        let store = MessageStore()
        store.messages["conv_1"] = [makeMessage(id: "m1")]

        store.removeMessage(id: "m_ghost", from: "conv_1")

        #expect(store.messages(for: "conv_1").count == 1)
    }

    @Test("removeMessage does nothing for non-existent conversation")
    @MainActor
    func removeMessageNonExistentConversation() {
        let store = MessageStore()
        store.removeMessage(id: "m1", from: "nonexistent")
        #expect(store.messages(for: "nonexistent").isEmpty)
    }

    @Test("removeMessage removes all occurrences with same ID")
    @MainActor
    func removeMessageRemovesAllDuplicates() {
        let store = MessageStore()
        store.messages["conv_1"] = [
            makeMessage(id: "m1", text: "a"),
            makeMessage(id: "m1", text: "b"),
            makeMessage(id: "m2", text: "c"),
        ]

        store.removeMessage(id: "m1", from: "conv_1")

        let msgs = store.messages(for: "conv_1")
        #expect(msgs.count == 1)
        #expect(msgs[0].id == "m2")
    }

    @Test("removeMessage leaves an empty array, not nil, after removing last message")
    @MainActor
    func removeLastMessageLeavesEmptyArray() {
        let store = MessageStore()
        store.messages["conv_1"] = [makeMessage(id: "m1")]

        store.removeMessage(id: "m1", from: "conv_1")

        // messages[conversationID] should still exist as an empty array
        #expect(store.messages["conv_1"] != nil)
        #expect(store.messages(for: "conv_1").isEmpty)
    }

    // MARK: - Clearing Messages

    @Test("Setting messages for a conversation to empty clears them")
    @MainActor
    func clearMessagesForConversation() {
        let store = MessageStore()
        store.messages["conv_1"] = [makeMessage(id: "m1"), makeMessage(id: "m2")]
        #expect(store.messages(for: "conv_1").count == 2)

        store.messages["conv_1"] = []
        #expect(store.messages(for: "conv_1").isEmpty)
    }

    @Test("Removing a conversation key clears messages entirely")
    @MainActor
    func removeConversationKeyNilsOut() {
        let store = MessageStore()
        store.messages["conv_1"] = [makeMessage(id: "m1")]
        store.messages["conv_1"] = nil
        // messages(for:) falls back to empty array
        #expect(store.messages(for: "conv_1").isEmpty)
    }

    @Test("Clearing all messages resets the entire dictionary")
    @MainActor
    func clearAllMessages() {
        let store = MessageStore()
        store.messages["conv_a"] = [makeMessage(id: "m1", conversationID: "conv_a")]
        store.messages["conv_b"] = [makeMessage(id: "m2", conversationID: "conv_b")]

        store.messages = [:]

        #expect(store.messages(for: "conv_a").isEmpty)
        #expect(store.messages(for: "conv_b").isEmpty)
        #expect(store.messages.isEmpty)
    }

    // MARK: - PageInfo Management

    @Test("PageInfo can be set and cleared independently per conversation")
    @MainActor
    func pageInfoPerConversation() {
        let store = MessageStore()
        store.pageInfos["conv_a"] = PageInfo(nextCursor: "c1", hasMore: true)
        store.pageInfos["conv_b"] = PageInfo(nextCursor: nil, hasMore: false)

        #expect(store.hasMore(for: "conv_a") == true)
        #expect(store.hasMore(for: "conv_b") == false)

        store.pageInfos["conv_a"] = nil
        #expect(store.hasMore(for: "conv_a") == false) // falls back to false
    }

    @Test("Clearing all pageInfos resets hasMore for all conversations")
    @MainActor
    func clearAllPageInfos() {
        let store = MessageStore()
        store.pageInfos["conv_a"] = PageInfo(nextCursor: "c1", hasMore: true)
        store.pageInfos["conv_b"] = PageInfo(nextCursor: "c2", hasMore: true)

        store.pageInfos = [:]

        #expect(store.hasMore(for: "conv_a") == false)
        #expect(store.hasMore(for: "conv_b") == false)
    }

    // MARK: - Interleaved Operations

    @Test("Append then update then remove sequence works correctly")
    @MainActor
    func appendUpdateRemoveSequence() {
        let store = MessageStore()

        store.appendMessage(makeMessage(id: "m1", text: "hello"), to: "conv_1")
        store.appendMessage(makeMessage(id: "m2", text: "world"), to: "conv_1")
        #expect(store.messages(for: "conv_1").count == 2)

        store.updateMessage(makeMessage(id: "m1", text: "hello updated"), in: "conv_1")
        #expect(store.messages(for: "conv_1")[0].content.text == "hello updated")

        store.removeMessage(id: "m2", from: "conv_1")
        #expect(store.messages(for: "conv_1").count == 1)
        #expect(store.messages(for: "conv_1")[0].id == "m1")
    }

    @Test("Replacing entire messages array for a conversation resets the state")
    @MainActor
    func replacingMessagesArrayResets() {
        let store = MessageStore()
        store.appendMessage(makeMessage(id: "m1"), to: "conv_1")
        store.appendMessage(makeMessage(id: "m2"), to: "conv_1")

        store.messages["conv_1"] = [makeMessage(id: "m3")]

        #expect(store.messages(for: "conv_1").count == 1)
        #expect(store.messages(for: "conv_1")[0].id == "m3")
    }
}
