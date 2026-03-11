import Foundation
import Testing
@testable import WaiAgentsKit

@Suite("Token Storage")
struct TokenStorageTests {

    // MARK: - InMemoryTokenStorage

    @Test("InMemoryTokenStorage stores and retrieves values")
    func inMemoryStoreAndRetrieve() throws {
        let storage = InMemoryTokenStorage()
        try storage.set("test_value", key: "test_key")
        let result = try storage.get("test_key")
        #expect(result == "test_value")
    }

    @Test("InMemoryTokenStorage returns nil for non-existent key")
    func inMemoryNonExistentKey() throws {
        let storage = InMemoryTokenStorage()
        let result = try storage.get("nonexistent")
        #expect(result == nil)
    }

    @Test("InMemoryTokenStorage removes values")
    func inMemoryRemove() throws {
        let storage = InMemoryTokenStorage()
        try storage.set("value", key: "key")
        #expect(try storage.get("key") == "value")

        try storage.remove("key")
        #expect(try storage.get("key") == nil)
    }

    @Test("InMemoryTokenStorage overwrites existing values")
    func inMemoryOverwrite() throws {
        let storage = InMemoryTokenStorage()
        try storage.set("old_value", key: "key")
        try storage.set("new_value", key: "key")
        #expect(try storage.get("key") == "new_value")
    }

    @Test("InMemoryTokenStorage isolates different keys")
    func inMemoryIsolation() throws {
        let storage = InMemoryTokenStorage()
        try storage.set("value_a", key: "key_a")
        try storage.set("value_b", key: "key_b")
        #expect(try storage.get("key_a") == "value_a")
        #expect(try storage.get("key_b") == "value_b")
    }

    @Test("InMemoryTokenStorage remove for non-existent key does nothing")
    func inMemoryRemoveNonExistent() throws {
        let storage = InMemoryTokenStorage()
        try storage.remove("nonexistent")
        // Should not throw
    }

    @Test("InMemoryTokenStorage handles empty string values")
    func inMemoryEmptyString() throws {
        let storage = InMemoryTokenStorage()
        try storage.set("", key: "empty")
        #expect(try storage.get("empty") == "")
    }

    @Test("InMemoryTokenStorage handles long values")
    func inMemoryLongValue() throws {
        let storage = InMemoryTokenStorage()
        let longValue = String(repeating: "a", count: 10000)
        try storage.set(longValue, key: "long_key")
        #expect(try storage.get("long_key") == longValue)
    }

    // MARK: - AuthManager Token Flow Integration

    @Test("AuthManager stores and retrieves tokens through InMemoryTokenStorage path")
    func authManagerTokenFlowWithInMemory() async throws {
        let authManager = AuthManager(serviceName: "test.storage.\(UUID().uuidString)")
        try await authManager.setTokens(access: "at_test", refresh: "rt_test", expiresIn: 3600)

        let isAuth = await authManager.isAuthenticated
        #expect(isAuth == true)

        let refreshToken = await authManager.currentRefreshToken
        #expect(refreshToken == "rt_test")

        let accessToken = try await authManager.validAccessToken()
        #expect(accessToken == "at_test")
    }

    @Test("AuthManager clearTokens removes all tokens")
    func authManagerClearTokens() async throws {
        let authManager = AuthManager(serviceName: "test.storage.\(UUID().uuidString)")
        try await authManager.setTokens(access: "at", refresh: "rt", expiresIn: 3600)
        try await authManager.clearTokens()

        let isAuth = await authManager.isAuthenticated
        #expect(isAuth == false)

        let rt = await authManager.currentRefreshToken
        #expect(rt == nil)
    }

    @Test("AuthManager with zero expiry marks token as expired")
    func authManagerZeroExpiry() async throws {
        let authManager = AuthManager(serviceName: "test.storage.\(UUID().uuidString)")
        try await authManager.setTokens(access: "expired_at", refresh: "rt", expiresIn: 0)

        // Token is expired, but isAuthenticated just checks existence
        let isAuth = await authManager.isAuthenticated
        #expect(isAuth == true)

        // validAccessToken should attempt refresh, which will fail
        do {
            _ = try await authManager.validAccessToken()
            #expect(Bool(false), "Should have thrown")
        } catch {
            // Expected: unauthorized because no baseURL for refresh
        }
    }

    @Test("AuthManager baseURL is nil by default when not provided")
    func authManagerDefaultBaseURL() async {
        let authManager = AuthManager(serviceName: "test.storage.\(UUID().uuidString)")
        let baseURL = await authManager.baseURL
        #expect(baseURL == nil)
    }

    @Test("AuthManager baseURL is set when provided")
    func authManagerCustomBaseURL() async {
        let url = URL(string: "https://example.com")!
        let authManager = AuthManager(serviceName: "test.storage.\(UUID().uuidString)", baseURL: url)
        let baseURL = await authManager.baseURL
        #expect(baseURL == url)
    }
}
