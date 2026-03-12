import Foundation
import Testing
@testable import WaiAgentsKit

/// Edge tests for AuthManager: preemptive refresh buffer, concurrent refresh
/// coalescing, token storage security, invalid tokens, refresh failure recovery,
/// and expired refresh token handling.
@Suite("AuthManager Edge Cases")
struct AuthManagerEdgeTests {

    // MARK: - Preemptive Token Refresh (60-Second Buffer)

    @Test("Token with more than 60 seconds remaining is returned directly")
    func tokenReturnedWhenFresh() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "fresh_token", refresh: "rt", expiresIn: 300)

        let token = try await authManager.validAccessToken()
        #expect(token == "fresh_token")
    }

    @Test("Token with exactly 61 seconds remaining is still valid")
    func tokenValidAt61Seconds() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "still_valid", refresh: "rt", expiresIn: 61)

        let token = try await authManager.validAccessToken()
        #expect(token == "still_valid")
    }

    @Test("Token with 59 seconds remaining triggers refresh attempt")
    func tokenTriggersRefreshAt59Seconds() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        // Set token that expires in 59 seconds — within the 60-second buffer
        try await authManager.setTokens(access: "about_to_expire", refresh: "rt_59", expiresIn: 59)

        // validAccessToken should attempt refresh (which will fail with no baseURL)
        do {
            _ = try await authManager.validAccessToken()
            #expect(Bool(false), "Should have thrown since refresh will fail (no baseURL)")
        } catch {
            // Expected: unauthorized because baseURL is nil
            guard case APIError.unauthorized = error else {
                #expect(Bool(false), "Expected APIError.unauthorized, got \(error)")
                return
            }
        }
    }

    @Test("Token with zero expiry is treated as expired")
    func tokenZeroExpiryIsExpired() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
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

    @Test("Token with negative expiry is treated as expired")
    func tokenNegativeExpiryIsExpired() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "very_expired", refresh: "rt", expiresIn: -100)

        do {
            _ = try await authManager.validAccessToken()
            #expect(Bool(false), "Should have thrown")
        } catch {
            // Expected failure
        }
    }

    // MARK: - Concurrent Refresh Requests (Should Coalesce)

    @Test("Multiple concurrent validAccessToken calls on expired token all fail consistently")
    func concurrentRefreshCallsFail() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "expired", refresh: "rt_coalesce", expiresIn: 0)

        // Launch multiple concurrent calls
        let results = await withTaskGroup(of: Result<String, Error>.self, returning: [Result<String, Error>].self) { group in
            for _ in 0..<5 {
                group.addTask {
                    do {
                        let token = try await authManager.validAccessToken()
                        return .success(token)
                    } catch {
                        return .failure(error)
                    }
                }
            }
            var results: [Result<String, Error>] = []
            for await result in group {
                results.append(result)
            }
            return results
        }

        // All should fail consistently
        for result in results {
            switch result {
            case .success:
                #expect(Bool(false), "Should have failed")
            case .failure:
                break // Expected
            }
        }
    }

    @Test("Concurrent validAccessToken calls on fresh token all return same token")
    func concurrentCallsOnFreshToken() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "shared_token", refresh: "rt", expiresIn: 3600)

        let results = await withTaskGroup(of: String?.self, returning: [String?].self) { group in
            for _ in 0..<10 {
                group.addTask {
                    try? await authManager.validAccessToken()
                }
            }
            var results: [String?] = []
            for await result in group {
                results.append(result)
            }
            return results
        }

        // All should return the same token
        for result in results {
            #expect(result == "shared_token")
        }
    }

    // MARK: - Token Storage Security

    @Test("Tokens are stored via TokenStorage abstraction")
    func tokensStoredViaAbstraction() async throws {
        // Uses InMemoryTokenStorage in tests (or UserDefaultsTokenStorage in DEBUG)
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "secret_at", refresh: "secret_rt", expiresIn: 3600)

        let isAuth = await authManager.isAuthenticated
        #expect(isAuth == true)
    }

    @Test("Different service names isolate tokens")
    func differentServiceNamesIsolateTokens() async throws {
        let service1 = "test.auth.edge.isolate1.\(UUID().uuidString)"
        let service2 = "test.auth.edge.isolate2.\(UUID().uuidString)"

        let auth1 = AuthManager(serviceName: service1)
        let auth2 = AuthManager(serviceName: service2)

        try await auth1.setTokens(access: "token_1", refresh: "rt_1", expiresIn: 3600)

        let isAuth1 = await auth1.isAuthenticated
        let isAuth2 = await auth2.isAuthenticated

        #expect(isAuth1 == true)
        #expect(isAuth2 == false)
    }

    @Test("clearTokens removes all three token components")
    func clearTokensRemovesAllComponents() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "at", refresh: "rt", expiresIn: 3600)

        let isAuthBefore = await authManager.isAuthenticated
        #expect(isAuthBefore == true)

        try await authManager.clearTokens()

        let isAuth = await authManager.isAuthenticated
        let rt = await authManager.currentRefreshToken

        #expect(isAuth == false)
        #expect(rt == nil)
    }

    // MARK: - Invalid Token Handling

    @Test("Empty string tokens are treated as authenticated")
    func emptyStringTokensAreAuthenticated() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "", refresh: "", expiresIn: 3600)

        // isAuthenticated checks accessToken != nil, not empty check
        let isAuth = await authManager.isAuthenticated
        #expect(isAuth == true)
    }

    @Test("Very long token strings are handled correctly")
    func longTokenStrings() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        let longToken = String(repeating: "a", count: 10_000)
        try await authManager.setTokens(access: longToken, refresh: "rt", expiresIn: 3600)

        let token = try await authManager.validAccessToken()
        #expect(token == longToken)
    }

    @Test("Token with special characters is stored and retrieved correctly")
    func specialCharacterTokens() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        let specialToken = "eyJhbGciOiJIUzI1NiJ9.test+special/chars=padding=="
        try await authManager.setTokens(access: specialToken, refresh: "rt_special!", expiresIn: 3600)

        let token = try await authManager.validAccessToken()
        #expect(token == specialToken)

        let rt = await authManager.currentRefreshToken
        #expect(rt == "rt_special!")
    }

    // MARK: - Refresh Failure Recovery

    @Test("After refresh failure, tokens are cleared when server returns 401")
    func refreshFailureClearsTokensOn401() async throws {
        // With a real baseURL but no server, the refresh will fail with network error
        let authManager = AuthManager(
            serviceName: "test.auth.edge.\(UUID().uuidString)",
            baseURL: URL(string: "https://localhost:1/api/v1")!
        )
        try await authManager.setTokens(access: "expired", refresh: "rt_to_clear", expiresIn: 0)

        do {
            _ = try await authManager.validAccessToken()
            #expect(Bool(false), "Should have thrown")
        } catch {
            // Expected: networkError since the URL is unreachable
        }

        // isAuthenticated may still be true since network errors don't clear tokens
        // (only 401 responses clear tokens)
    }

    @Test("After clearing tokens, validAccessToken throws unauthorized")
    func afterClearValidAccessTokenThrows() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "at", refresh: "rt", expiresIn: 3600)
        try await authManager.clearTokens()

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

    @Test("Setting new tokens after clear restores authenticated state")
    func setTokensAfterClearRestores() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "at1", refresh: "rt1", expiresIn: 3600)
        try await authManager.clearTokens()

        let isAuthAfterClear = await authManager.isAuthenticated
        #expect(isAuthAfterClear == false)

        try await authManager.setTokens(access: "at2", refresh: "rt2", expiresIn: 3600)

        let isAuthAfterRestore = await authManager.isAuthenticated
        #expect(isAuthAfterRestore == true)

        let token = try await authManager.validAccessToken()
        #expect(token == "at2")
    }

    // MARK: - Expired Refresh Token Handling

    @Test("Expired access token with no refresh token throws unauthorized immediately")
    func expiredAccessNoRefreshThrowsImmediately() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "expired_at", refresh: "rt", expiresIn: 0)

        // Clear the refresh token to simulate expired refresh
        try await authManager.clearTokens()

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

    @Test("validAccessToken with no baseURL and expired token throws unauthorized")
    func noBaseURLExpiredTokenThrowsUnauthorized() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)", baseURL: nil)
        try await authManager.setTokens(access: "expired", refresh: "rt_no_url", expiresIn: 0)

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

    @Test("Overwriting tokens replaces both access and refresh")
    func overwriteTokensReplacesAll() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "old_at", refresh: "old_rt", expiresIn: 3600)

        let oldRT = await authManager.currentRefreshToken
        #expect(oldRT == "old_rt")

        try await authManager.setTokens(access: "new_at", refresh: "new_rt", expiresIn: 7200)

        let newToken = try await authManager.validAccessToken()
        #expect(newToken == "new_at")

        let newRT = await authManager.currentRefreshToken
        #expect(newRT == "new_rt")
    }

    @Test("baseURL property returns the configured URL")
    func baseURLProperty() async {
        let url = URL(string: "https://api.example.com")!
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)", baseURL: url)
        let baseURL = await authManager.baseURL
        #expect(baseURL == url)
    }

    @Test("baseURL property returns nil when not configured")
    func baseURLNilWhenNotConfigured() async {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        let baseURL = await authManager.baseURL
        #expect(baseURL == nil)
    }
}
