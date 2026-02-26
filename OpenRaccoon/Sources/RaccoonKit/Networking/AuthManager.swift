import Foundation
import KeychainAccess

public actor AuthManager {
    private let keychain: Keychain
    private var accessToken: String?
    private var refreshToken: String?
    private var tokenExpiry: Date?
    public let baseURL: URL?

    /// In-flight refresh task to coalesce concurrent refresh requests.
    private var activeRefreshTask: Task<String, Error>?

    /// Response from the /auth/refresh endpoint.
    private struct RefreshResponse: Codable, Sendable {
        let accessToken: String
        let refreshToken: String
        let expiresIn: TimeInterval
    }

    public init(serviceName: String = "com.openraccoon.app", baseURL: URL? = nil) {
        self.keychain = Keychain(service: serviceName)
        self.baseURL = baseURL
        self.accessToken = try? keychain.get("access_token")
        self.refreshToken = try? keychain.get("refresh_token")
        if let expiryString = try? keychain.get("token_expiry"),
           let expiryInterval = Double(expiryString) {
            self.tokenExpiry = Date(timeIntervalSince1970: expiryInterval)
        }
    }

    public func validAccessToken() async throws -> String {
        // Return immediately if access token is still valid
        if let token = accessToken, let expiry = tokenExpiry, expiry > Date() {
            return token
        }

        // Attempt to refresh if a refresh token exists
        if refreshToken != nil {
            return try await coalescedRefresh()
        }

        throw APIError.unauthorized
    }

    /// Coalesces concurrent token refresh requests into a single network call.
    /// If a refresh is already in flight, subsequent callers await the same task.
    private func coalescedRefresh() async throws -> String {
        if let existing = activeRefreshTask {
            return try await existing.value
        }

        let task = Task<String, Error> { [weak self] in
            guard let self else { throw APIError.unauthorized }
            return try await self.refreshAccessToken()
        }
        activeRefreshTask = task

        do {
            let token = try await task.value
            activeRefreshTask = nil
            return token
        } catch {
            activeRefreshTask = nil
            throw error
        }
    }

    /// Refreshes the access token using the stored refresh token.
    /// On success, stores new tokens and returns the new access token.
    /// On failure, clears all tokens and throws `.unauthorized`.
    private func refreshAccessToken() async throws -> String {
        guard let currentRefresh = refreshToken else {
            throw APIError.unauthorized
        }

        guard let baseURL else {
            throw APIError.unauthorized
        }

        let endpoint = APIEndpoint.refresh(refreshToken: currentRefresh)
        var request = try endpoint.urlRequest(baseURL: baseURL)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            try clearTokens()
            throw APIError.unauthorized
        }

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            try clearTokens()
            throw APIError.unauthorized
        }

        let refreshResponse: RefreshResponse
        do {
            refreshResponse = try JSONDecoder.raccoon.decode(RefreshResponse.self, from: data)
        } catch {
            try clearTokens()
            throw APIError.unauthorized
        }

        try setTokens(
            access: refreshResponse.accessToken,
            refresh: refreshResponse.refreshToken,
            expiresIn: refreshResponse.expiresIn
        )

        return refreshResponse.accessToken
    }

    public func setTokens(access: String, refresh: String, expiresIn: TimeInterval) throws {
        self.accessToken = access
        self.refreshToken = refresh
        self.tokenExpiry = Date().addingTimeInterval(expiresIn)
        try keychain.set(access, key: "access_token")
        try keychain.set(refresh, key: "refresh_token")
        try keychain.set(String(tokenExpiry!.timeIntervalSince1970), key: "token_expiry")
    }

    public func clearTokens() throws {
        self.accessToken = nil
        self.refreshToken = nil
        self.tokenExpiry = nil
        try keychain.remove("access_token")
        try keychain.remove("refresh_token")
        try keychain.remove("token_expiry")
    }

    public var isAuthenticated: Bool {
        accessToken != nil
    }

    public var currentRefreshToken: String? {
        refreshToken
    }
}
