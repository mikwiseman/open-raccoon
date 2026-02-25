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

    public init(baseURL: URL = URL(string: "https://api.openraccoon.com")!) {
        self.conversationStore = ConversationStore()
        self.messageStore = MessageStore()
        self.authStore = AuthStore()

        self.authManager = AuthManager(baseURL: baseURL)
        self.apiClient = APIClient(baseURL: baseURL, authManager: authManager)
    }

    /// Sets up the WebSocket connection after authentication.
    public func connectWebSocket(accessToken: String) {
        guard let baseURL = URL(string: "https://api.openraccoon.com") else { return }
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
