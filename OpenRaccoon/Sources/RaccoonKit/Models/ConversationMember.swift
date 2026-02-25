import Foundation

public struct ConversationMember: Codable, Identifiable, Sendable, Equatable {
    public let id: String
    public let conversationID: String
    public let userID: String
    public var role: MemberRole
    public var muted: Bool
    public var lastReadAt: Date?
    public let joinedAt: Date

    public enum MemberRole: String, Codable, Sendable {
        case owner
        case admin
        case member
    }

    enum CodingKeys: String, CodingKey {
        case id
        case conversationID = "conversationId"
        case userID = "userId"
        case role
        case muted
        case lastReadAt
        case joinedAt
    }

    public init(
        id: String,
        conversationID: String,
        userID: String,
        role: MemberRole = .member,
        muted: Bool = false,
        lastReadAt: Date? = nil,
        joinedAt: Date = Date()
    ) {
        self.id = id
        self.conversationID = conversationID
        self.userID = userID
        self.role = role
        self.muted = muted
        self.lastReadAt = lastReadAt
        self.joinedAt = joinedAt
    }
}
