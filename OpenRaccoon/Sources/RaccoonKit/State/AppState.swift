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

    public init() {
        self.conversationStore = ConversationStore()
        self.messageStore = MessageStore()
        self.authStore = AuthStore()
    }
}
