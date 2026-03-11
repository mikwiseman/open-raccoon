import Foundation

public struct AgentTrigger: Identifiable, Sendable, Equatable {
    public let id: String
    public let agentID: String
    public let creatorID: String
    public var name: String
    public var triggerType: TriggerType
    public let token: String
    public var hmacConfigured: Bool
    public var conditionFilter: TriggerConditionGroup?
    public var messageTemplate: String?
    public var cronExpression: String?
    public var enabled: Bool
    public var lastFiredAt: Date?
    public var fireCount: Int
    public var metadata: [String: AnyCodable]?
    public let createdAt: Date?
    public var updatedAt: Date?

    public enum TriggerType: String, Codable, Sendable {
        case webhook
        case schedule
        case condition
    }

    enum CodingKeys: String, CodingKey {
        case id
        case agentID = "agentId"
        case creatorID = "creatorId"
        case name
        case triggerType
        case token
        case hmacConfigured
        case conditionFilter
        case messageTemplate
        case cronExpression
        case enabled
        case lastFiredAt
        case fireCount
        case metadata
        case createdAt
        case updatedAt
    }

    public init(
        id: String,
        agentID: String,
        creatorID: String,
        name: String,
        triggerType: TriggerType = .webhook,
        token: String = "",
        hmacConfigured: Bool = false,
        conditionFilter: TriggerConditionGroup? = nil,
        messageTemplate: String? = nil,
        cronExpression: String? = nil,
        enabled: Bool = true,
        lastFiredAt: Date? = nil,
        fireCount: Int = 0,
        metadata: [String: AnyCodable]? = nil,
        createdAt: Date? = nil,
        updatedAt: Date? = nil
    ) {
        self.id = id
        self.agentID = agentID
        self.creatorID = creatorID
        self.name = name
        self.triggerType = triggerType
        self.token = token
        self.hmacConfigured = hmacConfigured
        self.conditionFilter = conditionFilter
        self.messageTemplate = messageTemplate
        self.cronExpression = cronExpression
        self.enabled = enabled
        self.lastFiredAt = lastFiredAt
        self.fireCount = fireCount
        self.metadata = metadata
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

extension AgentTrigger: Codable {
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        agentID = try container.decode(String.self, forKey: .agentID)
        creatorID = try container.decode(String.self, forKey: .creatorID)
        name = try container.decode(String.self, forKey: .name)
        triggerType = try container.decode(TriggerType.self, forKey: .triggerType)
        token = try container.decode(String.self, forKey: .token)
        hmacConfigured = try container.decodeIfPresent(Bool.self, forKey: .hmacConfigured) ?? false
        conditionFilter = try container.decodeIfPresent(TriggerConditionGroup.self, forKey: .conditionFilter)
        messageTemplate = try container.decodeIfPresent(String.self, forKey: .messageTemplate)
        cronExpression = try container.decodeIfPresent(String.self, forKey: .cronExpression)
        enabled = try container.decodeIfPresent(Bool.self, forKey: .enabled) ?? true
        lastFiredAt = try container.decodeIfPresent(Date.self, forKey: .lastFiredAt)
        fireCount = try container.decodeIfPresent(Int.self, forKey: .fireCount) ?? 0
        metadata = try container.decodeIfPresent([String: AnyCodable].self, forKey: .metadata)
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt)
        updatedAt = try container.decodeIfPresent(Date.self, forKey: .updatedAt)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(agentID, forKey: .agentID)
        try container.encode(creatorID, forKey: .creatorID)
        try container.encode(name, forKey: .name)
        try container.encode(triggerType, forKey: .triggerType)
        try container.encode(token, forKey: .token)
        try container.encode(hmacConfigured, forKey: .hmacConfigured)
        try container.encodeIfPresent(conditionFilter, forKey: .conditionFilter)
        try container.encodeIfPresent(messageTemplate, forKey: .messageTemplate)
        try container.encodeIfPresent(cronExpression, forKey: .cronExpression)
        try container.encode(enabled, forKey: .enabled)
        try container.encodeIfPresent(lastFiredAt, forKey: .lastFiredAt)
        try container.encode(fireCount, forKey: .fireCount)
        try container.encodeIfPresent(metadata, forKey: .metadata)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(updatedAt, forKey: .updatedAt)
    }
}

// MARK: - Trigger Condition Types

public struct TriggerCondition: Codable, Sendable, Equatable {
    public var field: String
    public var op: ConditionOperator
    public var value: String?

    public enum ConditionOperator: String, Codable, Sendable {
        case eq
        case neq
        case contains
        case exists
    }

    public init(field: String, op: ConditionOperator, value: String? = nil) {
        self.field = field
        self.op = op
        self.value = value
    }
}

public struct TriggerConditionGroup: Codable, Sendable, Equatable {
    public var all: [TriggerCondition]?
    public var any: [TriggerCondition]?

    public init(all: [TriggerCondition]? = nil, any: [TriggerCondition]? = nil) {
        self.all = all
        self.any = any
    }
}
