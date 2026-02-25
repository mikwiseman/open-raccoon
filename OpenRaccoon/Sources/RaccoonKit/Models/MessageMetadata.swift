import Foundation

public struct MessageMetadata: Codable, Sendable, Equatable {
    public var bridgeSource: BridgeSource?
    public var agentModel: String?
    public var agentToolsUsed: [String]?
    public var encryption: EncryptionType?
    public var editHistory: [EditEntry]?
    public var replyTo: String?
    public var threadID: String?

    public struct BridgeSource: Codable, Sendable, Equatable {
        public var platform: String
        public var externalMessageID: String?
        public var senderName: String?

        enum CodingKeys: String, CodingKey {
            case platform
            case externalMessageID = "externalMessageId"
            case senderName
        }

        public init(
            platform: String,
            externalMessageID: String? = nil,
            senderName: String? = nil
        ) {
            self.platform = platform
            self.externalMessageID = externalMessageID
            self.senderName = senderName
        }
    }

    public enum EncryptionType: String, Codable, Sendable {
        case e2e
        case server
        case none
    }

    public struct EditEntry: Codable, Sendable, Equatable {
        public var previousText: String
        public var editedAt: Date

        public init(previousText: String, editedAt: Date) {
            self.previousText = previousText
            self.editedAt = editedAt
        }
    }

    enum CodingKeys: String, CodingKey {
        case bridgeSource
        case agentModel
        case agentToolsUsed
        case encryption
        case editHistory
        case replyTo
        case threadID = "threadId"
    }

    public init(
        bridgeSource: BridgeSource? = nil,
        agentModel: String? = nil,
        agentToolsUsed: [String]? = nil,
        encryption: EncryptionType? = nil,
        editHistory: [EditEntry]? = nil,
        replyTo: String? = nil,
        threadID: String? = nil
    ) {
        self.bridgeSource = bridgeSource
        self.agentModel = agentModel
        self.agentToolsUsed = agentToolsUsed
        self.encryption = encryption
        self.editHistory = editHistory
        self.replyTo = replyTo
        self.threadID = threadID
    }
}
