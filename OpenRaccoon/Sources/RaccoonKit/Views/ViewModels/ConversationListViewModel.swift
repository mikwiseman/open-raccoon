import SwiftUI

@MainActor
@Observable
public final class ConversationListViewModel: Sendable {
    public var isLoading = false

    public init() {}
}
