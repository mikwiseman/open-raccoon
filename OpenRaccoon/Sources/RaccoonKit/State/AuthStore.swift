import SwiftUI

@MainActor
@Observable
public final class AuthStore {
    public var isLoggingIn = false
    public var isRegistering = false
    public var loginError: String?
    public var isSendingMagicLink = false
    public var magicLinkSent = false
    public var magicLinkError: String?

    private let apiClient: APIClient
    private let authManager: AuthManager

    /// Auto-reset task for magicLinkSent flag.
    private var magicLinkResetTask: Task<Void, Never>?

    public init(apiClient: APIClient, authManager: AuthManager) {
        self.apiClient = apiClient
        self.authManager = authManager
    }

    /// Calls the login endpoint, stores tokens, and returns the authenticated User.
    public func login(email: String, password: String) async throws -> User {
        isLoggingIn = true
        loginError = nil
        defer { isLoggingIn = false }

        let response: AuthResponse
        do {
            response = try await apiClient.request(.login(email: email, password: password))
        } catch {
            loginError = Self.readableError(error)
            throw error
        }

        try await authManager.setTokens(
            access: response.tokens.accessToken,
            refresh: response.tokens.refreshToken,
            expiresIn: response.tokens.expiresIn
        )

        return response.user
    }

    /// Calls the register endpoint, stores tokens, and returns the new User.
    public func register(username: String, email: String, password: String) async throws -> User {
        isRegistering = true
        loginError = nil
        defer { isRegistering = false }

        let response: AuthResponse
        do {
            response = try await apiClient.request(.register(username: username, email: email, password: password))
        } catch {
            loginError = Self.readableError(error)
            throw error
        }

        try await authManager.setTokens(
            access: response.tokens.accessToken,
            refresh: response.tokens.refreshToken,
            expiresIn: response.tokens.expiresIn
        )

        return response.user
    }

    /// Fetches the current user profile using GET /api/v1/users/me.
    public func fetchCurrentUser() async throws -> User {
        let response: UserResponse = try await apiClient.request(.me)
        return response.user
    }

    /// Clears stored tokens via the auth manager.
    public func clearTokens() async throws {
        try await authManager.clearTokens()
    }

    /// Returns whether the auth manager currently holds tokens.
    public func hasStoredTokens() async -> Bool {
        await authManager.isAuthenticated
    }

    /// Returns the current access token if valid (may trigger a refresh).
    public func validAccessToken() async throws -> String {
        try await authManager.validAccessToken()
    }

    /// Sends a magic link email to the given address.
    /// Auto-resets `magicLinkSent` after 60 seconds so the user can retry.
    public func requestMagicLink(email: String) async throws {
        isSendingMagicLink = true
        magicLinkError = nil
        // Reset on retry so the UI goes back to the input state
        magicLinkSent = false
        magicLinkResetTask?.cancel()
        defer { isSendingMagicLink = false }

        do {
            let _: MagicLinkResponse = try await apiClient.request(.requestMagicLink(email: email))
            magicLinkSent = true
            scheduleMagicLinkReset()
        } catch {
            magicLinkError = Self.readableError(error)
            throw error
        }
    }

    /// Schedules automatic reset of the magicLinkSent flag after a timeout.
    private func scheduleMagicLinkReset() {
        magicLinkResetTask?.cancel()
        magicLinkResetTask = Task { @MainActor [weak self] in
            try? await Task.sleep(for: .seconds(60))
            guard !Task.isCancelled else { return }
            self?.magicLinkSent = false
        }
    }

    /// Verifies a magic link token, stores tokens, and returns the authenticated User.
    public func verifyMagicLink(token: String) async throws -> User {
        let response: AuthResponse = try await apiClient.request(.verifyMagicLink(token: token))
        try await authManager.setTokens(
            access: response.tokens.accessToken,
            refresh: response.tokens.refreshToken,
            expiresIn: response.tokens.expiresIn
        )
        return response.user
    }

    /// Resets magic link state for a fresh attempt.
    public func resetMagicLinkState() {
        magicLinkResetTask?.cancel()
        magicLinkResetTask = nil
        magicLinkSent = false
        magicLinkError = nil
    }

    // MARK: - Private

    private static func readableError(_ error: Error) -> String {
        switch error {
        case APIError.unauthorized:
            return "Invalid email or password."
        case APIError.httpError(_, let errorResponse):
            return errorResponse?.error.message ?? "Server error. Please try again."
        case APIError.networkError:
            return "Network error. Check your connection."
        case APIError.decodingError:
            return "Unexpected server response."
        case APIError.invalidResponse:
            return "Invalid server response."
        default:
            return error.localizedDescription
        }
    }
}
