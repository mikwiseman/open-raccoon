import Foundation

public struct BridgeConnection: Codable, Identifiable, Sendable, Equatable {
    public let id: String
    public let userID: String
    public var platform: Platform
    public var method: BridgeMethod
    public var status: BridgeStatus
    public var metadata: [String: AnyCodable]?
    public var lastSyncAt: Date?
    public let createdAt: Date
    public var updatedAt: Date

    public enum Platform: String, Codable, Sendable {
        case telegram
        case whatsapp
        case signal
        case discord
    }

    public enum BridgeMethod: String, Codable, Sendable {
        case userLevel = "user_level"
        case bot
        case cloudAPI = "cloud_api"
    }

    public enum BridgeStatus: String, Codable, Sendable {
        case connected
        case reconnecting
        case disconnected
        case error
    }

    enum CodingKeys: String, CodingKey {
        case id
        case userID = "userId"
        case platform
        case method
        case status
        case metadata
        case lastSyncAt
        case createdAt
        case updatedAt
    }

    public init(
        id: String,
        userID: String,
        platform: Platform,
        method: BridgeMethod,
        status: BridgeStatus = .disconnected,
        metadata: [String: AnyCodable]? = nil,
        lastSyncAt: Date? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.userID = userID
        self.platform = platform
        self.method = method
        self.status = status
        self.metadata = metadata
        self.lastSyncAt = lastSyncAt
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
