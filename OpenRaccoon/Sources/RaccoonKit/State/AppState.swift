import SwiftUI

@MainActor
@Observable
public final class AppState {
    public var currentUser: User?
    public var isAuthenticated: Bool { currentUser != nil }
    public var selectedConversationID: String?
    public var selectedFeedItemID: String?
    public var selectedFeedItem: FeedItem?
    public var selectedMarketplaceAgent: Agent?
    public var isWorkspaceOpen: Bool = false
    public var connectionState: WebSocketClient.ConnectionState = .disconnected

    public let conversationStore: ConversationStore
    public let messageStore: MessageStore
    public let authStore: AuthStore

    public let authManager: AuthManager
    public let apiClient: APIClient
    public var webSocketClient: WebSocketClient?
    private let baseURL: URL

    public init(baseURL: URL = URL(string: "https://openraccoon.com")!) {
        self.baseURL = baseURL
        self.conversationStore = ConversationStore()
        self.messageStore = MessageStore()

        self.authManager = AuthManager(baseURL: baseURL)
        self.apiClient = APIClient(baseURL: baseURL, authManager: authManager)
        self.authStore = AuthStore(apiClient: apiClient, authManager: authManager)
    }

    // MARK: - Authentication

    /// Logs in with email/password, sets currentUser, and connects WebSocket.
    public func login(email: String, password: String) async throws {
        let user = try await authStore.login(email: email, password: password)
        currentUser = user
        let token = try await authStore.validAccessToken()
        connectWebSocket(accessToken: token)
    }

    /// Registers a new account, sets currentUser, and connects WebSocket.
    public func register(username: String, email: String, password: String) async throws {
        let user = try await authStore.register(username: username, email: email, password: password)
        currentUser = user
        let token = try await authStore.validAccessToken()
        connectWebSocket(accessToken: token)
    }

    /// Sends a magic link to the given email address.
    public func requestMagicLink(email: String) async throws {
        try await authStore.requestMagicLink(email: email)
    }

    /// Verifies a magic link token, sets currentUser, and connects WebSocket.
    public func verifyMagicLink(token: String) async throws {
        let user = try await authStore.verifyMagicLink(token: token)
        currentUser = user
        let accessToken = try await authStore.validAccessToken()
        connectWebSocket(accessToken: accessToken)
    }

    /// Revokes refresh token on server, clears local tokens, disconnects WebSocket.
    public func logout() async {
        disconnectWebSocket()
        currentUser = nil
        selectedConversationID = nil
        try? await authStore.logout()
    }

    /// Called on app launch. Checks for stored tokens, refreshes if needed,
    /// loads the user profile via GET /api/v1/users/me, and connects WebSocket.
    public func restoreSession() async {
        guard await authStore.hasStoredTokens() else { return }

        do {
            let token = try await authStore.validAccessToken()
            let user = try await authStore.fetchCurrentUser()
            currentUser = user
            connectWebSocket(accessToken: token)
        } catch {
            // Tokens are invalid or expired and refresh failed.
            // Clear everything so the user sees the login screen.
            try? await authStore.clearTokens()
            currentUser = nil
        }
    }

    // MARK: - WebSocket

    /// Sets up the WebSocket connection after authentication.
    public func connectWebSocket(accessToken: String) {
        // Disconnect any existing client before creating a new one
        if webSocketClient != nil {
            disconnectWebSocket()
        }

        let client = WebSocketClient(
            baseURL: baseURL.absoluteString,
            accessToken: accessToken,
            authManager: authManager
        )
        webSocketClient = client

        client.onConnectionStateChanged = { [weak self] state in
            self?.connectionState = state
        }

        client.onAuthFailure = { [weak self] in
            Task { await self?.logout() }
        }

        client.connect()
    }

    public func disconnectWebSocket() {
        webSocketClient?.disconnect()
        webSocketClient = nil
        connectionState = .disconnected
    }

    /// The current user's ID, if authenticated.
    public var currentUserID: String? {
        currentUser?.id
    }
}
