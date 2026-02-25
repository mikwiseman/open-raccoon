import SwiftUI

@MainActor
@Observable
public final class AuthStore {
    public var isLoggingIn = false
    public var isRegistering = false
    public var loginError: String?

    public init() {}
}
