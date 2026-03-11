import Testing
import Foundation
@testable import WaiAgentsKit

@Suite("Trigger Model Encoding/Decoding")
struct TriggerModelTests {
    @Test("AgentTrigger decodes from JSON with all fields")
    func triggerDecodeFull() throws {
        let json = """
        {
            "id": "trig_001",
            "agent_id": "agent_123",
            "creator_id": "user_456",
            "name": "Deploy Webhook",
            "trigger_type": "webhook",
            "token": "tok_abc123",
            "hmac_configured": true,
            "condition_filter": {
                "all": [
                    {"field": "repo", "op": "eq", "value": "main"}
                ]
            },
            "message_template": "Deploy triggered for {{repo}}",
            "cron_expression": null,
            "enabled": true,
            "last_fired_at": "2026-03-10T15:30:00Z",
            "fire_count": 7,
            "metadata": {"source": "github"},
            "created_at": "2026-03-01T10:00:00Z",
            "updated_at": "2026-03-10T15:30:00Z"
        }
        """.data(using: .utf8)!

        let trigger = try JSONDecoder.waiagents.decode(AgentTrigger.self, from: json)
        #expect(trigger.id == "trig_001")
        #expect(trigger.agentID == "agent_123")
        #expect(trigger.creatorID == "user_456")
        #expect(trigger.name == "Deploy Webhook")
        #expect(trigger.triggerType == .webhook)
        #expect(trigger.token == "tok_abc123")
        #expect(trigger.hmacConfigured == true)
        #expect(trigger.conditionFilter != nil)
        #expect(trigger.conditionFilter?.all?.count == 1)
        #expect(trigger.conditionFilter?.all?[0].field == "repo")
        #expect(trigger.conditionFilter?.all?[0].op == .eq)
        #expect(trigger.conditionFilter?.all?[0].value == "main")
        #expect(trigger.messageTemplate == "Deploy triggered for {{repo}}")
        #expect(trigger.cronExpression == nil)
        #expect(trigger.enabled == true)
        #expect(trigger.lastFiredAt != nil)
        #expect(trigger.fireCount == 7)
    }

    @Test("AgentTrigger decodes with minimal fields")
    func triggerDecodeMinimal() throws {
        let json = """
        {
            "id": "trig_002",
            "agent_id": "agent_789",
            "creator_id": "user_111",
            "name": "Daily Report",
            "trigger_type": "schedule",
            "token": "tok_def456",
            "cron_expression": "0 9 * * *",
            "created_at": "2026-03-05T08:00:00Z",
            "updated_at": null
        }
        """.data(using: .utf8)!

        let trigger = try JSONDecoder.waiagents.decode(AgentTrigger.self, from: json)
        #expect(trigger.id == "trig_002")
        #expect(trigger.triggerType == .schedule)
        #expect(trigger.hmacConfigured == false)
        #expect(trigger.conditionFilter == nil)
        #expect(trigger.messageTemplate == nil)
        #expect(trigger.cronExpression == "0 9 * * *")
        #expect(trigger.enabled == true)
        #expect(trigger.fireCount == 0)
        #expect(trigger.updatedAt == nil)
    }

    @Test("AgentTrigger round-trips through encode/decode")
    func triggerRoundTrip() throws {
        let condition = TriggerCondition(field: "status", op: .eq, value: "active")
        let group = TriggerConditionGroup(all: [condition])
        let trigger = AgentTrigger(
            id: "trig_rt",
            agentID: "agent_rt",
            creatorID: "user_rt",
            name: "Test Trigger",
            triggerType: .condition,
            token: "tok_rt",
            hmacConfigured: false,
            conditionFilter: group,
            enabled: true,
            fireCount: 3
        )

        let data = try JSONEncoder.waiagents.encode(trigger)
        let decoded = try JSONDecoder.waiagents.decode(AgentTrigger.self, from: data)
        #expect(decoded == trigger)
    }

    @Test("TriggerCondition round-trips through encode/decode")
    func conditionRoundTrip() throws {
        let condition = TriggerCondition(field: "event", op: .contains, value: "push")
        let data = try JSONEncoder.waiagents.encode(condition)
        let decoded = try JSONDecoder.waiagents.decode(TriggerCondition.self, from: data)
        #expect(decoded == condition)
    }

    @Test("TriggerConditionGroup with both all and any")
    func conditionGroupBoth() throws {
        let group = TriggerConditionGroup(
            all: [TriggerCondition(field: "type", op: .eq, value: "deploy")],
            any: [
                TriggerCondition(field: "env", op: .eq, value: "prod"),
                TriggerCondition(field: "env", op: .eq, value: "staging"),
            ]
        )

        let data = try JSONEncoder.waiagents.encode(group)
        let decoded = try JSONDecoder.waiagents.decode(TriggerConditionGroup.self, from: data)
        #expect(decoded == group)
        #expect(decoded.all?.count == 1)
        #expect(decoded.any?.count == 2)
    }

    @Test("TriggerCondition with exists operator and no value")
    func conditionExists() throws {
        let condition = TriggerCondition(field: "headers.x-signature", op: .exists)
        let data = try JSONEncoder.waiagents.encode(condition)
        let decoded = try JSONDecoder.waiagents.decode(TriggerCondition.self, from: data)
        #expect(decoded == condition)
        #expect(decoded.value == nil)
    }

    @Test("All TriggerType cases decode correctly")
    func allTriggerTypes() throws {
        for typeCase in [("webhook", AgentTrigger.TriggerType.webhook),
                         ("schedule", AgentTrigger.TriggerType.schedule),
                         ("condition", AgentTrigger.TriggerType.condition)] {
            let json = """
            {
                "id": "t", "agent_id": "a", "creator_id": "u",
                "name": "N", "trigger_type": "\(typeCase.0)", "token": "tok"
            }
            """.data(using: .utf8)!
            let trigger = try JSONDecoder.waiagents.decode(AgentTrigger.self, from: json)
            #expect(trigger.triggerType == typeCase.1)
        }
    }

    @Test("All ConditionOperator cases decode correctly")
    func allConditionOperators() throws {
        for opCase in [("eq", TriggerCondition.ConditionOperator.eq),
                       ("neq", TriggerCondition.ConditionOperator.neq),
                       ("contains", TriggerCondition.ConditionOperator.contains),
                       ("exists", TriggerCondition.ConditionOperator.exists)] {
            let json = """
            {"field": "f", "op": "\(opCase.0)"}
            """.data(using: .utf8)!
            let condition = try JSONDecoder.waiagents.decode(TriggerCondition.self, from: json)
            #expect(condition.op == opCase.1)
        }
    }
}
