import Foundation
import Testing
@testable import WaiAgentsKit

/// In-memory token storage for testing AuthManager without touching Keychain or UserDefaults.
final class InMemoryTokenStorage: TokenStorage {
    private var store: [String: String] = [:]

    func get(_ key: String) throws -> String? {
        store[key]
    }

    func set(_ value: String, key: String) throws {
        store[key] = value
    }

    func remove(_ key: String) throws {
        store.removeValue(forKey: key)
    }
}

@Suite("AuthManager")
struct AuthManagerTests {

    // MARK: - Token Storage / Retrieval

    @Test("setTokens stores access token, refresh token, and expiry")
    func setTokensStoresAll() async throws {
        let authManager = AuthManager(serviceName: "test.auth.\(UUID().uuidString)")
        try await authManager.setTokens(access: "at_123", refresh: "rt_456", expiresIn: 3600)

        let isAuth = await authManager.isAuthenticated
        #expect(isAuth == true)

        let refreshToken = await authManager.currentRefreshToken
        #expect(refreshToken == "rt_456")
    }

    @Test("clearTokens removes all stored tokens")
    func clearTokensRemovesAll() async throws {
        let authManager = AuthManager(serviceName: "test.auth.\(UUID().uuidString)")
        try await authManager.setTokens(access: "at_123", refresh: "rt_456", expiresIn: 3600)

        try await authManager.clearTokens()

        let isAuth = await authManager.isAuthenticated
        #expect(isAuth == false)

        let refreshToken = await authManager.currentRefreshToken
        #expect(refreshToken == nil)
    }

    @Test("isAuthenticated returns false when no tokens stored")
    func isAuthenticatedFalseByDefault() async {
        let authManager = AuthManager(serviceName: "test.auth.\(UUID().uuidString)")
        let isAuth = await authManager.isAuthenticated
        #expect(isAuth == false)
    }

    @Test("isAuthenticated returns true after setting tokens")
    func isAuthenticatedTrueAfterSetTokens() async throws {
        let authManager = AuthManager(serviceName: "test.auth.\(UUID().uuidString)")
        try await authManager.setTokens(access: "at", refresh: "rt", expiresIn: 3600)
        let isAuth = await authManager.isAuthenticated
        #expect(isAuth == true)
    }

    // MARK: - Token Expiry Detection

    @Test("validAccessToken returns token when not expired")
    func validAccessTokenNotExpired() async throws {
        let authManager = AuthManager(serviceName: "test.auth.\(UUID().uuidString)")
        try await authManager.setTokens(access: "fresh_token", refresh: "rt", expiresIn: 3600)
        let token = try await authManager.validAccessToken()
        #expect(token == "fresh_token")
    }

    @Test("validAccessToken throws unauthorized when no tokens exist")
    func validAccessTokenThrowsWhenNoTokens() async {
        let authManager = AuthManager(serviceName: "test.auth.\(UUID().uuidString)")
        do {
            _ = try await authManager.validAccessToken()
            #expect(Bool(false), "Should have thrown")
        } catch {
            // The error should be APIError.unauthorized
            guard case APIError.unauthorized = error else {
                #expect(Bool(false), "Expected APIError.unauthorized, got \(error)")
                return
            }
        }
    }

    @Test("validAccessToken attempts refresh when token is expired but refresh token exists")
    func validAccessTokenAttemptsRefreshWhenExpired() async throws {
        let authManager = AuthManager(serviceName: "test.auth.\(UUID().uuidString)")
        // Set tokens with 0 expiry (already expired)
        try await authManager.setTokens(access: "expired_token", refresh: "rt_valid", expiresIn: 0)

        // The token should be expired immediately. validAccessToken will attempt refresh
        // but since there's no real server, it should fail with a network or unauthorized error.
        do {
            _ = try await authManager.validAccessToken()
            #expect(Bool(false), "Should have thrown since no refresh server is available")
        } catch {
            // Expected: either unauthorized (no baseURL) or network error
            // AuthManager with nil baseURL throws unauthorized on refresh attempt
        }
    }

    // MARK: - currentRefreshToken

    @Test("currentRefreshToken returns nil when no tokens are stored")
    func currentRefreshTokenNilByDefault() async {
        let authManager = AuthManager(serviceName: "test.auth.\(UUID().uuidString)")
        let rt = await authManager.currentRefreshToken
        #expect(rt == nil)
    }

    @Test("currentRefreshToken returns the stored refresh token")
    func currentRefreshTokenAfterSet() async throws {
        let authManager = AuthManager(serviceName: "test.auth.\(UUID().uuidString)")
        try await authManager.setTokens(access: "at", refresh: "my_refresh", expiresIn: 3600)
        let rt = await authManager.currentRefreshToken
        #expect(rt == "my_refresh")
    }

    @Test("currentRefreshToken returns nil after clearTokens")
    func currentRefreshTokenNilAfterClear() async throws {
        let authManager = AuthManager(serviceName: "test.auth.\(UUID().uuidString)")
        try await authManager.setTokens(access: "at", refresh: "rt", expiresIn: 3600)
        try await authManager.clearTokens()
        let rt = await authManager.currentRefreshToken
        #expect(rt == nil)
    }

    // MARK: - Coalesced Refresh Logic

    @Test("validAccessToken with expired token and no baseURL throws unauthorized")
    func coalescedRefreshNoBaseURL() async throws {
        // AuthManager with no baseURL cannot refresh
        let authManager = AuthManager(serviceName: "test.auth.\(UUID().uuidString)", baseURL: nil)
        try await authManager.setTokens(access: "expired", refresh: "rt", expiresIn: 0)

        do {
            _ = try await authManager.validAccessToken()
            #expect(Bool(false), "Should have thrown")
        } catch {
            guard case APIError.unauthorized = error else {
                #expect(Bool(false), "Expected APIError.unauthorized, got \(error)")
                return
            }
        }
    }

    // MARK: - Token Overwrite

    @Test("setTokens overwrites previous tokens")
    func setTokensOverwrite() async throws {
        let authManager = AuthManager(serviceName: "test.auth.\(UUID().uuidString)")
        try await authManager.setTokens(access: "at_old", refresh: "rt_old", expiresIn: 3600)
        try await authManager.setTokens(access: "at_new", refresh: "rt_new", expiresIn: 7200)

        let token = try await authManager.validAccessToken()
        #expect(token == "at_new")

        let rt = await authManager.currentRefreshToken
        #expect(rt == "rt_new")
    }
}
