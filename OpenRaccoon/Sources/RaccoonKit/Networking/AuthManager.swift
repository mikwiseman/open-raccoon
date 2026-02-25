import Foundation
import KeychainAccess

public actor AuthManager {
    private let keychain: Keychain
    private var accessToken: String?
    private var refreshToken: String?
    private var tokenExpiry: Date?

    public init(serviceName: String = "com.openraccoon.app") {
        self.keychain = Keychain(service: serviceName)
        self.accessToken = try? keychain.get("access_token")
        self.refreshToken = try? keychain.get("refresh_token")
        if let expiryString = try? keychain.get("token_expiry"),
           let expiryInterval = Double(expiryString) {
            self.tokenExpiry = Date(timeIntervalSince1970: expiryInterval)
        }
    }

    public func validAccessToken() async throws -> String {
        if let token = accessToken, let expiry = tokenExpiry, expiry > Date() {
            return token
        }
        throw APIError.unauthorized
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
