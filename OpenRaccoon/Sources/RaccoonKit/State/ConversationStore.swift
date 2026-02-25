import SwiftUI

@MainActor
@Observable
public final class ConversationStore {
    public var conversations: [Conversation] = []
    public var isLoading = false

    public init() {}

    public func conversation(byID id: String) -> Conversation? {
        conversations.first { $0.id == id }
    }
}
