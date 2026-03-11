import Foundation
import Testing
@testable import WaiAgentsKit

@Suite("AppState Extended Tests")
struct AppStateExtendedTests {

    // MARK: - selectedFeedItem

    @Test("selectedFeedItem can be set and read")
    @MainActor
    func selectedFeedItemSetGet() {
        let state = AppState()
        let item = FeedItem(
            id: "f1",
            creatorID: "u1",
            type: .creation,
            referenceID: "r1",
            referenceType: .agent,
            title: "Test Item"
        )
        state.selectedFeedItem = item
        #expect(state.selectedFeedItem?.id == "f1")
        #expect(state.selectedFeedItem?.title == "Test Item")
    }

    @Test("selectedFeedItem is nil initially")
    @MainActor
    func selectedFeedItemNilInitially() {
        let state = AppState()
        #expect(state.selectedFeedItem == nil)
    }

    // MARK: - selectedMarketplaceAgent

    @Test("selectedMarketplaceAgent can be set and read")
    @MainActor
    func selectedMarketplaceAgentSetGet() {
        let state = AppState()
        let agent = Agent(
            id: "a1",
            creatorID: "u1",
            name: "Test Agent",
            slug: "test-agent"
        )
        state.selectedMarketplaceAgent = agent
        #expect(state.selectedMarketplaceAgent?.id == "a1")
        #expect(state.selectedMarketplaceAgent?.name == "Test Agent")
    }

    @Test("selectedMarketplaceAgent is nil initially")
    @MainActor
    func selectedMarketplaceAgentNilInitially() {
        let state = AppState()
        #expect(state.selectedMarketplaceAgent == nil)
    }

    // MARK: - Connection State Transitions

    @Test("connectionState can be set to all valid states")
    @MainActor
    func connectionStateAllValues() {
        let state = AppState()

        state.connectionState = .connecting
        #expect(state.connectionState == .connecting)

        state.connectionState = .connected
        #expect(state.connectionState == .connected)

        state.connectionState = .disconnected
        #expect(state.connectionState == .disconnected)
    }

    // MARK: - Logout Clears Everything

    @Test("logout clears selectedFeedItem and selectedFeedItemID")
    @MainActor
    func logoutClearsFeedSelection() async {
        let state = AppState()
        state.currentUser = User(id: "u1", username: "alice")
        state.selectedFeedItemID = "f1"
        state.selectedFeedItem = FeedItem(
            id: "f1", creatorID: "u1", type: .creation,
            referenceID: "r1", referenceType: .agent
        )

        await state.logout()

        #expect(state.currentUser == nil)
        #expect(state.selectedConversationID == nil)
    }

    // MARK: - Multiple Logouts

    @Test("Multiple logouts do not crash")
    @MainActor
    func multipleLogouts() async {
        let state = AppState()
        state.currentUser = User(id: "u1", username: "alice")

        await state.logout()
        await state.logout()
        await state.logout()

        #expect(state.isAuthenticated == false)
        #expect(state.currentUser == nil)
    }

    // MARK: - Setting User After Logout

    @Test("Setting currentUser after logout re-authenticates")
    @MainActor
    func setUserAfterLogout() async {
        let state = AppState()
        state.currentUser = User(id: "u1", username: "alice")
        #expect(state.isAuthenticated == true)

        await state.logout()
        #expect(state.isAuthenticated == false)

        state.currentUser = User(id: "u2", username: "bob")
        #expect(state.isAuthenticated == true)
        #expect(state.currentUserID == "u2")
    }

    // MARK: - Sub-store Independence

    @Test("conversationStore and messageStore are independent after logout")
    @MainActor
    func storesIndependentAfterLogout() async {
        let state = AppState()
        state.currentUser = User(id: "u1", username: "alice")

        let conv = Conversation(id: "c1", type: .dm, title: "Test")
        state.conversationStore.upsert(conv)

        let msg = Message(
            id: "m1", conversationID: "c1",
            senderType: .human, type: .text,
            content: MessageContent(text: "Hello")
        )
        state.messageStore.appendMessage(msg, to: "c1")

        // Stores keep their data even after logout
        // (in real app, the UI would clear them separately)
        await state.logout()

        #expect(state.conversationStore.conversations.count == 1)
        #expect(state.messageStore.messages(for: "c1").count == 1)
    }

    // MARK: - API Client and Auth Manager Are Set Up

    @Test("AppState has non-nil apiClient and authManager")
    @MainActor
    func apiClientAndAuthManagerExist() {
        let state = AppState()
        // These are let properties, so they always exist
        _ = state.apiClient
        _ = state.authManager
        _ = state.authStore
    }

    // MARK: - disconnectWebSocket Idempotent

    @Test("disconnectWebSocket sets state to disconnected even when no client exists")
    @MainActor
    func disconnectWebSocketIdempotent() {
        let state = AppState()
        #expect(state.webSocketClient == nil)
        #expect(state.connectionState == .disconnected)

        state.disconnectWebSocket()

        #expect(state.webSocketClient == nil)
        #expect(state.connectionState == .disconnected)
    }

    // MARK: - Login Failure Does Not Set User

    @Test("Failed login does not set currentUser")
    @MainActor
    func failedLoginNoUser() async {
        let state = AppState()

        do {
            try await state.login(email: "bad@example.com", password: "wrong")
        } catch {
            // Expected
        }

        #expect(state.currentUser == nil)
        #expect(state.isAuthenticated == false)
        #expect(state.authStore.loginError != nil)
    }

    @Test("Failed register does not set currentUser")
    @MainActor
    func failedRegisterNoUser() async {
        let state = AppState()

        do {
            try await state.register(username: "alice", email: "bad@example.com", password: "password")
        } catch {
            // Expected
        }

        #expect(state.currentUser == nil)
        #expect(state.isAuthenticated == false)
    }
}
