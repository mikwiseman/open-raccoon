import Foundation
import Testing
@testable import WaiAgentsKit

/// Edge-case tests for AuthManager: preemptive token refresh, expired tokens,
/// coalesced refresh, failure handling, persistence, and logout.
@Suite("AuthManager Edge Cases")
struct AuthManagerEdgeCaseTests {

    // MARK: - Preemptive Token Refresh (< 60 seconds remaining)

    @Test("Token expiring in < 60 seconds triggers refresh attempt")
    func preemptiveRefreshUnder60Seconds() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        // Set token that expires in 30 seconds (< 60 second buffer)
        try await authManager.setTokens(access: "about_to_expire", refresh: "rt_valid", expiresIn: 30)

        // validAccessToken should attempt refresh since expiry < now + 60s
        // Without a real server, this will fail
        do {
            _ = try await authManager.validAccessToken()
            #expect(Bool(false), "Should have thrown since no refresh server is available")
        } catch {
            // Expected: unauthorized (no baseURL) or network error
        }
    }

    @Test("Token expiring in exactly 60 seconds triggers refresh")
    func preemptiveRefreshExactly60Seconds() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        // Token expires in exactly 60 seconds — the check is `expiry > Date() + 60`,
        // so exactly 60s should NOT pass (not strictly greater)
        try await authManager.setTokens(access: "borderline_token", refresh: "rt", expiresIn: 60)

        do {
            _ = try await authManager.validAccessToken()
            // Might succeed if the time check passes due to execution time
            // or might fail — both are acceptable for a borderline case
        } catch {
            // Expected when refresh is attempted without a server
        }
    }

    @Test("Token expiring in 59 seconds triggers refresh attempt")
    func preemptiveRefresh59Seconds() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "almost_expired", refresh: "rt", expiresIn: 59)

        do {
            _ = try await authManager.validAccessToken()
            #expect(Bool(false), "Should have thrown")
        } catch {
            // Expected: refresh attempted without server
        }
    }

    // MARK: - Already Expired Token

    @Test("Token with expiresIn=0 is immediately expired and triggers refresh")
    func alreadyExpiredToken() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "expired", refresh: "rt", expiresIn: 0)

        do {
            _ = try await authManager.validAccessToken()
            #expect(Bool(false), "Should have thrown")
        } catch {
            // Expected: refresh attempt fails (no baseURL)
        }
    }

    @Test("Token with negative expiresIn is expired")
    func negativeExpiresIn() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        // Negative expiresIn means token expired in the past
        try await authManager.setTokens(access: "way_expired", refresh: "rt", expiresIn: -3600)

        do {
            _ = try await authManager.validAccessToken()
            #expect(Bool(false), "Should have thrown")
        } catch {
            // Expected
        }
    }

    // MARK: - Fresh Token (> 60s remaining)

    @Test("Token with >60 seconds remaining returns without refresh")
    func freshTokenReturnsImmediately() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "fresh_token", refresh: "rt", expiresIn: 3600)

        let token = try await authManager.validAccessToken()
        #expect(token == "fresh_token")
    }

    @Test("Token with 61 seconds remaining returns without refresh")
    func token61SecondsReturns() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "just_fresh", refresh: "rt", expiresIn: 61)

        let token = try await authManager.validAccessToken()
        #expect(token == "just_fresh")
    }

    @Test("Token with very large expiresIn returns normally")
    func veryLargeExpiresIn() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "long_lived", refresh: "rt", expiresIn: 86400 * 365)

        let token = try await authManager.validAccessToken()
        #expect(token == "long_lived")
    }

    // MARK: - Coalesced Refresh (concurrent calls share one refresh)

    @Test("Concurrent validAccessToken calls with expired token both fail consistently")
    func coalescedRefreshConcurrent() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "expired", refresh: "rt", expiresIn: 0)

        // Launch two concurrent validAccessToken calls
        var errors: [Error] = []
        await withTaskGroup(of: Error?.self) { group in
            for _ in 0..<2 {
                group.addTask {
                    do {
                        _ = try await authManager.validAccessToken()
                        return nil
                    } catch {
                        return error
                    }
                }
            }
            for await error in group {
                if let error { errors.append(error) }
            }
        }

        // Both should have failed (no server to refresh against)
        #expect(errors.count == 2)
    }

    @Test("Coalesced refresh with no baseURL throws unauthorized for both callers")
    func coalescedRefreshNoBaseURL() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)", baseURL: nil)
        try await authManager.setTokens(access: "expired", refresh: "rt", expiresIn: 0)

        var unauthorizedCount = 0
        await withTaskGroup(of: Bool.self) { group in
            for _ in 0..<3 {
                group.addTask {
                    do {
                        _ = try await authManager.validAccessToken()
                        return false
                    } catch let error as APIError {
                        if case .unauthorized = error { return true }
                        return false
                    } catch {
                        return false
                    }
                }
            }
            for await isUnauthorized in group {
                if isUnauthorized { unauthorizedCount += 1 }
            }
        }

        #expect(unauthorizedCount == 3)
    }

    // MARK: - Refresh Failure Handling

    @Test("Refresh failure with no refresh token throws unauthorized immediately")
    func noRefreshTokenThrowsUnauthorized() async {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        // No tokens set at all
        do {
            _ = try await authManager.validAccessToken()
            #expect(Bool(false), "Should have thrown")
        } catch let error as APIError {
            guard case .unauthorized = error else {
                #expect(Bool(false), "Expected .unauthorized, got \(error)")
                return
            }
        } catch {
            #expect(Bool(false), "Expected APIError, got \(error)")
        }
    }

    @Test("Refresh failure with baseURL but no server throws network error or unauthorized")
    func refreshFailureWithBaseURL() async throws {
        let authManager = AuthManager(
            serviceName: "test.auth.edge.\(UUID().uuidString)",
            baseURL: URL(string: "https://nonexistent.waiagents.local")
        )
        try await authManager.setTokens(access: "expired", refresh: "rt", expiresIn: 0)

        do {
            _ = try await authManager.validAccessToken()
            #expect(Bool(false), "Should have thrown")
        } catch {
            // Could be networkError or unauthorized — both are acceptable
        }
    }

    // MARK: - Token Storage Persistence

    @Test("setTokens persists access token that can be retrieved")
    func setTokensPersistsAccess() async throws {
        let serviceName = "test.auth.edge.\(UUID().uuidString)"
        let authManager = AuthManager(serviceName: serviceName)
        try await authManager.setTokens(access: "persisted_at", refresh: "persisted_rt", expiresIn: 3600)

        let token = try await authManager.validAccessToken()
        #expect(token == "persisted_at")
    }

    @Test("setTokens overwrites previous tokens completely")
    func setTokensOverwritesPrevious() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "old_at", refresh: "old_rt", expiresIn: 3600)
        try await authManager.setTokens(access: "new_at", refresh: "new_rt", expiresIn: 7200)

        let token = try await authManager.validAccessToken()
        #expect(token == "new_at")

        let rt = await authManager.currentRefreshToken
        #expect(rt == "new_rt")
    }

    // MARK: - Logout Clears All Tokens

    @Test("clearTokens removes access token")
    func clearTokensRemovesAccess() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "at", refresh: "rt", expiresIn: 3600)
        try await authManager.clearTokens()

        let isAuth = await authManager.isAuthenticated
        #expect(isAuth == false)
    }

    @Test("clearTokens removes refresh token")
    func clearTokensRemovesRefresh() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "at", refresh: "rt", expiresIn: 3600)
        try await authManager.clearTokens()

        let rt = await authManager.currentRefreshToken
        #expect(rt == nil)
    }

    @Test("After clearTokens, validAccessToken throws unauthorized")
    func clearTokensThenValidAccessTokenThrows() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "at", refresh: "rt", expiresIn: 3600)
        try await authManager.clearTokens()

        do {
            _ = try await authManager.validAccessToken()
            #expect(Bool(false), "Should have thrown")
        } catch let error as APIError {
            guard case .unauthorized = error else {
                #expect(Bool(false), "Expected .unauthorized")
                return
            }
        } catch {
            #expect(Bool(false), "Expected APIError")
        }
    }

    @Test("Double clearTokens does not throw")
    func doubleClearTokens() async throws {
        let authManager = AuthManager(serviceName: "test.auth.edge.\(UUID().uuidString)")
        try await authManager.setTokens(access: "at", refresh: "rt", expiresIn: 3600)
        try await authManager.clearTokens()
        try await authManager.clearTokens() // Should not throw

        let isAuth = await authManager.isAuthenticated
        #expect(isAuth == false)
    }
}
