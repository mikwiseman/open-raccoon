import SwiftUI

@MainActor
@Observable
public final class AppState {
    public var currentUser: User?
    public var isAuthenticated: Bool { currentUser != nil }
    public var selectedConversationID: String?
    public var isWorkspaceOpen: Bool = false

    public let conversationStore: ConversationStore
    public let messageStore: MessageStore
    public let authStore: AuthStore

    public let authManager: AuthManager
    public let apiClient: APIClient
    public var webSocketClient: WebSocketClient?

    public init(baseURL: URL = URL(string: "http://45.55.219.10")!) {
        self.conversationStore = ConversationStore()
        self.messageStore = MessageStore()
        self.authStore = AuthStore()

        self.authManager = AuthManager(baseURL: baseURL)
        self.apiClient = APIClient(baseURL: baseURL, authManager: authManager)
    }

    /// Sets up the WebSocket connection after authentication.
    public func connectWebSocket(accessToken: String) {
        guard let baseURL = URL(string: "http://45.55.219.10") else { return }
        webSocketClient = WebSocketClient(
            baseURL: baseURL.absoluteString,
            accessToken: accessToken
        )
        webSocketClient?.connect()
    }

    public func disconnectWebSocket() {
        webSocketClient?.disconnect()
        webSocketClient = nil
    }

    /// The current user's ID, if authenticated.
    public var currentUserID: String? {
        currentUser?.id
    }
}
