import Foundation

public struct Message: Codable, Identifiable, Sendable, Equatable {
    public let id: String
    public let conversationID: String
    public let senderID: String?
    public let senderType: SenderType
    public let type: MessageType
    public var content: MessageContent
    public var metadata: MessageMetadata?
    public var reactions: [MessageReaction]?
    public var editedAt: Date?
    public var deletedAt: Date?
    public let createdAt: Date

    public enum SenderType: String, Codable, Sendable {
        case human
        case agent
        case bridge
        case system
    }

    public enum MessageType: String, Codable, Sendable {
        case text
        case media
        case code
        case embed
        case system
        case agentStatus = "agent_status"
    }

    enum CodingKeys: String, CodingKey {
        case id
        case conversationID = "conversationId"
        case senderID = "senderId"
        case senderType
        case type
        case content
        case metadata
        case reactions
        case editedAt
        case deletedAt
        case createdAt
    }

    public init(
        id: String,
        conversationID: String,
        senderID: String? = nil,
        senderType: SenderType,
        type: MessageType,
        content: MessageContent,
        metadata: MessageMetadata? = nil,
        reactions: [MessageReaction]? = nil,
        editedAt: Date? = nil,
        deletedAt: Date? = nil,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.conversationID = conversationID
        self.senderID = senderID
        self.senderType = senderType
        self.type = type
        self.content = content
        self.metadata = metadata
        self.reactions = reactions
        self.editedAt = editedAt
        self.deletedAt = deletedAt
        self.createdAt = createdAt
    }
}
