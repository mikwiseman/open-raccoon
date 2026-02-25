import SwiftUI

@MainActor
@Observable
public final class MessageStore {
    public var messages: [String: [Message]] = [:]  // conversationID -> messages
    public var isLoading = false

    public init() {}

    public func messages(for conversationID: String) -> [Message] {
        messages[conversationID] ?? []
    }
}
