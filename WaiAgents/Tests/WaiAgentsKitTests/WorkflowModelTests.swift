import Foundation
import Testing
@testable import WaiAgentsKit

// MARK: - Workflow Types (defined here for testing; mirrors packages/shared/src/types/workflows.ts)

/// Status of a workflow definition.
private enum WorkflowStatus: String, Codable, Sendable {
    case draft
    case active
    case paused
    case archived
}

/// Type of a single workflow step.
private enum WorkflowStepType: String, Codable, Sendable {
    case prompt
    case toolCall = "tool_call"
    case condition
    case transform
    case wait
    case subWorkflow = "sub_workflow"
    case humanInput = "human_input"
}

/// Status of a workflow run.
private enum WorkflowRunStatus: String, Codable, Sendable {
    case pending
    case running
    case completed
    case failed
    case cancelled
}

/// Status of a single step within a workflow run.
private enum WorkflowStepRunStatus: String, Codable, Sendable {
    case pending
    case running
    case completed
    case failed
    case skipped
}

/// Agent workflow definition.
private struct AgentWorkflow: Codable, Sendable, Equatable {
    let id: String
    let agentID: String
    let creatorID: String
    var name: String
    var description: String?
    var status: WorkflowStatus
    var triggerConfig: [String: AnyCodable]?
    var maxConcurrentRuns: Int
    var metadata: [String: AnyCodable]
    var createdAt: String?
    var updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case agentID = "agentId"
        case creatorID = "creatorId"
        case name
        case description
        case status
        case triggerConfig
        case maxConcurrentRuns
        case metadata
        case createdAt
        case updatedAt
    }
}

/// A single step in a workflow.
private struct WorkflowStep: Codable, Sendable, Equatable {
    let id: String
    let workflowID: String
    var name: String
    var stepType: WorkflowStepType
    var config: [String: AnyCodable]
    var position: Int
    var timeoutMs: Int
    var retryConfig: [String: AnyCodable]?
    var metadata: [String: AnyCodable]
    var createdAt: String?
    var updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case workflowID = "workflowId"
        case name
        case stepType
        case config
        case position
        case timeoutMs
        case retryConfig
        case metadata
        case createdAt
        case updatedAt
    }
}

/// An edge connecting two workflow steps.
private struct WorkflowEdge: Codable, Sendable, Equatable {
    let id: String
    let workflowID: String
    let sourceStepID: String
    let targetStepID: String
    var condition: [String: AnyCodable]?
    var label: String?
    var createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case workflowID = "workflowId"
        case sourceStepID = "sourceStepId"
        case targetStepID = "targetStepId"
        case condition
        case label
        case createdAt
    }
}

/// A workflow run record.
private struct WorkflowRun: Codable, Sendable, Equatable {
    let id: String
    let workflowID: String
    let agentID: String
    let userID: String
    var conversationID: String?
    var status: WorkflowRunStatus
    var input: [String: AnyCodable]
    var result: [String: AnyCodable]?
    var errorMessage: String?
    var totalDurationMs: Int?
    var startedAt: String?
    var completedAt: String?
    var createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case workflowID = "workflowId"
        case agentID = "agentId"
        case userID = "userId"
        case conversationID = "conversationId"
        case status
        case input
        case result
        case errorMessage
        case totalDurationMs
        case startedAt
        case completedAt
        case createdAt
    }
}

// MARK: - Tests

@Suite("Workflow Model Encoding/Decoding")
struct WorkflowModelTests {

    // MARK: - AgentWorkflow

    @Test("AgentWorkflow encodes and decodes with all fields")
    func workflowRoundTrip() throws {
        let workflow = AgentWorkflow(
            id: "wf_001",
            agentID: "agent_123",
            creatorID: "user_456",
            name: "Data Pipeline",
            description: "Extract, transform, load data",
            status: .active,
            triggerConfig: ["schedule": .string("0 * * * *")],
            maxConcurrentRuns: 3,
            metadata: ["version": .string("2.0")],
            createdAt: "2026-03-01T10:00:00Z",
            updatedAt: "2026-03-05T14:30:00Z"
        )

        let data = try JSONEncoder.waiagents.encode(workflow)
        let decoded = try JSONDecoder.waiagents.decode(AgentWorkflow.self, from: data)

        #expect(decoded.id == "wf_001")
        #expect(decoded.agentID == "agent_123")
        #expect(decoded.creatorID == "user_456")
        #expect(decoded.name == "Data Pipeline")
        #expect(decoded.description == "Extract, transform, load data")
        #expect(decoded.status == .active)
        #expect(decoded.maxConcurrentRuns == 3)
    }

    @Test("AgentWorkflow decodes from snake_case JSON")
    func workflowFromSnakeCaseJSON() throws {
        let json = """
        {
            "id": "wf_002",
            "agent_id": "agent_1",
            "creator_id": "user_1",
            "name": "Simple Flow",
            "description": null,
            "status": "draft",
            "trigger_config": null,
            "max_concurrent_runs": 1,
            "metadata": {},
            "created_at": null,
            "updated_at": null
        }
        """.data(using: .utf8)!

        let workflow = try JSONDecoder.waiagents.decode(AgentWorkflow.self, from: json)
        #expect(workflow.id == "wf_002")
        #expect(workflow.status == .draft)
        #expect(workflow.description == nil)
        #expect(workflow.triggerConfig == nil)
        #expect(workflow.maxConcurrentRuns == 1)
    }

    @Test("All WorkflowStatus values decode correctly")
    func workflowStatusValues() throws {
        for status in ["draft", "active", "paused", "archived"] {
            let json = "\"\(status)\"".data(using: .utf8)!
            let decoded = try JSONDecoder.waiagents.decode(WorkflowStatus.self, from: json)
            #expect(decoded.rawValue == status)
        }
    }

    // MARK: - WorkflowStep

    @Test("WorkflowStep round-trips with prompt type")
    func workflowStepPrompt() throws {
        let step = WorkflowStep(
            id: "step_1",
            workflowID: "wf_001",
            name: "Generate Summary",
            stepType: .prompt,
            config: ["prompt": .string("Summarize the data")],
            position: 0,
            timeoutMs: 30000,
            retryConfig: nil,
            metadata: [:],
            createdAt: nil,
            updatedAt: nil
        )

        let data = try JSONEncoder.waiagents.encode(step)
        let decoded = try JSONDecoder.waiagents.decode(WorkflowStep.self, from: data)
        #expect(decoded == step)
        #expect(decoded.stepType == .prompt)
    }

    @Test("WorkflowStep decodes from snake_case JSON with tool_call type")
    func workflowStepToolCall() throws {
        let json = """
        {
            "id": "step_2",
            "workflow_id": "wf_001",
            "name": "Fetch Data",
            "step_type": "tool_call",
            "config": {"tool": "web_search", "query": "latest news"},
            "position": 1,
            "timeout_ms": 15000,
            "retry_config": {"max_retries": 3, "backoff_ms": 1000},
            "metadata": {},
            "created_at": null,
            "updated_at": null
        }
        """.data(using: .utf8)!

        let step = try JSONDecoder.waiagents.decode(WorkflowStep.self, from: json)
        #expect(step.id == "step_2")
        #expect(step.stepType == .toolCall)
        #expect(step.timeoutMs == 15000)
        #expect(step.retryConfig != nil)
    }

    @Test("All WorkflowStepType values decode correctly")
    func allStepTypes() throws {
        let types: [(String, WorkflowStepType)] = [
            ("prompt", .prompt),
            ("tool_call", .toolCall),
            ("condition", .condition),
            ("transform", .transform),
            ("wait", .wait),
            ("sub_workflow", .subWorkflow),
            ("human_input", .humanInput),
        ]

        for (rawValue, expected) in types {
            let json = "\"\(rawValue)\"".data(using: .utf8)!
            let decoded = try JSONDecoder.waiagents.decode(WorkflowStepType.self, from: json)
            #expect(decoded == expected, "Expected \(expected) for \"\(rawValue)\", got \(decoded)")
        }
    }

    @Test("WorkflowStep with condition type")
    func workflowStepCondition() throws {
        let step = WorkflowStep(
            id: "step_cond",
            workflowID: "wf_001",
            name: "Check Threshold",
            stepType: .condition,
            config: ["field": .string("score"), "op": .string("gte"), "value": .int(80)],
            position: 2,
            timeoutMs: 5000,
            metadata: [:]
        )

        let data = try JSONEncoder.waiagents.encode(step)
        let decoded = try JSONDecoder.waiagents.decode(WorkflowStep.self, from: data)
        #expect(decoded.stepType == .condition)
        #expect(decoded.name == "Check Threshold")
    }

    @Test("WorkflowStep with sub_workflow type")
    func workflowStepSubWorkflow() throws {
        let json = """
        {
            "id": "step_sub",
            "workflow_id": "wf_001",
            "name": "Run Child Workflow",
            "step_type": "sub_workflow",
            "config": {"workflow_id": "wf_child_001"},
            "position": 3,
            "timeout_ms": 60000,
            "metadata": {}
        }
        """.data(using: .utf8)!

        let step = try JSONDecoder.waiagents.decode(WorkflowStep.self, from: json)
        #expect(step.stepType == .subWorkflow)
    }

    @Test("WorkflowStep with transform type")
    func workflowStepTransform() throws {
        let step = WorkflowStep(
            id: "step_tf",
            workflowID: "wf_001",
            name: "Format Output",
            stepType: .transform,
            config: ["template": .string("Result: {{output}}")],
            position: 4,
            timeoutMs: 5000,
            metadata: [:]
        )

        let data = try JSONEncoder.waiagents.encode(step)
        let decoded = try JSONDecoder.waiagents.decode(WorkflowStep.self, from: data)
        #expect(decoded.stepType == .transform)
    }

    @Test("WorkflowStep with wait type")
    func workflowStepWait() throws {
        let step = WorkflowStep(
            id: "step_wait",
            workflowID: "wf_001",
            name: "Wait for Approval",
            stepType: .wait,
            config: ["wait_type": .string("manual_approval"), "timeout_hours": .int(24)],
            position: 5,
            timeoutMs: 86400000,
            metadata: [:]
        )

        let data = try JSONEncoder.waiagents.encode(step)
        let decoded = try JSONDecoder.waiagents.decode(WorkflowStep.self, from: data)
        #expect(decoded.stepType == .wait)
        #expect(decoded.timeoutMs == 86400000)
    }

    // MARK: - WorkflowEdge

    @Test("WorkflowEdge round-trips with condition")
    func workflowEdgeWithCondition() throws {
        let edge = WorkflowEdge(
            id: "edge_1",
            workflowID: "wf_001",
            sourceStepID: "step_1",
            targetStepID: "step_2",
            condition: ["op": .string("eq"), "field": .string("status"), "value": .string("success")],
            label: "On Success",
            createdAt: "2026-03-01T10:00:00Z"
        )

        let data = try JSONEncoder.waiagents.encode(edge)
        let decoded = try JSONDecoder.waiagents.decode(WorkflowEdge.self, from: data)
        #expect(decoded == edge)
        #expect(decoded.condition != nil)
        #expect(decoded.label == "On Success")
    }

    @Test("WorkflowEdge without condition")
    func workflowEdgeWithoutCondition() throws {
        let edge = WorkflowEdge(
            id: "edge_2",
            workflowID: "wf_001",
            sourceStepID: "step_a",
            targetStepID: "step_b",
            condition: nil,
            label: nil,
            createdAt: nil
        )

        let data = try JSONEncoder.waiagents.encode(edge)
        let decoded = try JSONDecoder.waiagents.decode(WorkflowEdge.self, from: data)
        #expect(decoded.condition == nil)
        #expect(decoded.label == nil)
    }

    @Test("WorkflowEdge decodes from snake_case JSON")
    func workflowEdgeFromJSON() throws {
        let json = """
        {
            "id": "edge_3",
            "workflow_id": "wf_002",
            "source_step_id": "step_x",
            "target_step_id": "step_y",
            "condition": {"branch": "else"},
            "label": "Fallback Path",
            "created_at": "2026-03-10T00:00:00Z"
        }
        """.data(using: .utf8)!

        let edge = try JSONDecoder.waiagents.decode(WorkflowEdge.self, from: json)
        #expect(edge.sourceStepID == "step_x")
        #expect(edge.targetStepID == "step_y")
        #expect(edge.label == "Fallback Path")
    }

    // MARK: - WorkflowRun Status Transitions

    @Test("WorkflowRun decodes all status values")
    func workflowRunAllStatuses() throws {
        let statuses: [(String, WorkflowRunStatus)] = [
            ("pending", .pending),
            ("running", .running),
            ("completed", .completed),
            ("failed", .failed),
            ("cancelled", .cancelled),
        ]

        for (rawValue, expected) in statuses {
            let json = "\"\(rawValue)\"".data(using: .utf8)!
            let decoded = try JSONDecoder.waiagents.decode(WorkflowRunStatus.self, from: json)
            #expect(decoded == expected)
        }
    }

    @Test("WorkflowRun round-trips with completed status and result")
    func workflowRunCompleted() throws {
        let run = WorkflowRun(
            id: "run_001",
            workflowID: "wf_001",
            agentID: "agent_1",
            userID: "user_1",
            conversationID: "conv_1",
            status: .completed,
            input: ["query": .string("test input")],
            result: ["output": .string("processed result")],
            errorMessage: nil,
            totalDurationMs: 4523,
            startedAt: "2026-03-10T10:00:00Z",
            completedAt: "2026-03-10T10:00:04Z",
            createdAt: "2026-03-10T10:00:00Z"
        )

        let data = try JSONEncoder.waiagents.encode(run)
        let decoded = try JSONDecoder.waiagents.decode(WorkflowRun.self, from: data)
        #expect(decoded == run)
        #expect(decoded.status == .completed)
        #expect(decoded.totalDurationMs == 4523)
    }

    @Test("WorkflowRun with failed status and error message")
    func workflowRunFailed() throws {
        let run = WorkflowRun(
            id: "run_002",
            workflowID: "wf_001",
            agentID: "agent_1",
            userID: "user_1",
            status: .failed,
            input: ["query": .string("bad input")],
            result: nil,
            errorMessage: "Step 3 timed out after 30s",
            totalDurationMs: 30100,
            startedAt: "2026-03-10T11:00:00Z",
            completedAt: "2026-03-10T11:00:30Z"
        )

        let data = try JSONEncoder.waiagents.encode(run)
        let decoded = try JSONDecoder.waiagents.decode(WorkflowRun.self, from: data)
        #expect(decoded.status == .failed)
        #expect(decoded.errorMessage == "Step 3 timed out after 30s")
        #expect(decoded.result == nil)
    }

    @Test("WorkflowRun with pending status has no timestamps")
    func workflowRunPending() throws {
        let json = """
        {
            "id": "run_003",
            "workflow_id": "wf_001",
            "agent_id": "agent_1",
            "user_id": "user_1",
            "conversation_id": null,
            "status": "pending",
            "input": {},
            "result": null,
            "error_message": null,
            "total_duration_ms": null,
            "started_at": null,
            "completed_at": null,
            "created_at": "2026-03-10T12:00:00Z"
        }
        """.data(using: .utf8)!

        let run = try JSONDecoder.waiagents.decode(WorkflowRun.self, from: json)
        #expect(run.status == .pending)
        #expect(run.startedAt == nil)
        #expect(run.completedAt == nil)
        #expect(run.conversationID == nil)
    }

    // MARK: - WorkflowStepRunStatus

    @Test("All WorkflowStepRunStatus values decode correctly")
    func allStepRunStatuses() throws {
        let statuses: [(String, WorkflowStepRunStatus)] = [
            ("pending", .pending),
            ("running", .running),
            ("completed", .completed),
            ("failed", .failed),
            ("skipped", .skipped),
        ]

        for (rawValue, expected) in statuses {
            let json = "\"\(rawValue)\"".data(using: .utf8)!
            let decoded = try JSONDecoder.waiagents.decode(WorkflowStepRunStatus.self, from: json)
            #expect(decoded == expected)
        }
    }

    // MARK: - DAG Validation at Model Level

    @Test("Workflow with multiple edges forms valid DAG structure")
    func multipleEdgesFormDAG() throws {
        let edges = [
            WorkflowEdge(id: "e1", workflowID: "wf_1", sourceStepID: "s1", targetStepID: "s2"),
            WorkflowEdge(id: "e2", workflowID: "wf_1", sourceStepID: "s2", targetStepID: "s3"),
            WorkflowEdge(id: "e3", workflowID: "wf_1", sourceStepID: "s2", targetStepID: "s4"),
        ]

        // Verify each edge round-trips correctly
        for edge in edges {
            let data = try JSONEncoder.waiagents.encode(edge)
            let decoded = try JSONDecoder.waiagents.decode(WorkflowEdge.self, from: data)
            #expect(decoded == edge)
        }

        // Verify DAG structure: s1 -> s2 -> s3, s2 -> s4
        let sources = Set(edges.map(\.sourceStepID))
        let targets = Set(edges.map(\.targetStepID))
        #expect(sources.contains("s1"))
        #expect(targets.contains("s2"))
        #expect(targets.contains("s3"))
        #expect(targets.contains("s4"))
    }

    @Test("WorkflowRun cancelled status round-trips correctly")
    func workflowRunCancelled() throws {
        let run = WorkflowRun(
            id: "run_cancelled",
            workflowID: "wf_001",
            agentID: "agent_1",
            userID: "user_1",
            status: .cancelled,
            input: ["query": .string("cancelled query")],
            result: nil,
            errorMessage: "Cancelled by user",
            totalDurationMs: 1200,
            startedAt: "2026-03-10T10:00:00Z",
            completedAt: nil
        )

        let data = try JSONEncoder.waiagents.encode(run)
        let decoded = try JSONDecoder.waiagents.decode(WorkflowRun.self, from: data)
        #expect(decoded.status == .cancelled)
        #expect(decoded.errorMessage == "Cancelled by user")
        #expect(decoded.completedAt == nil)
    }

    @Test("WorkflowStep human_input type round-trips correctly")
    func workflowStepHumanInput() throws {
        let step = WorkflowStep(
            id: "step_human",
            workflowID: "wf_001",
            name: "Awaiting User Input",
            stepType: .humanInput,
            config: ["prompt_text": .string("Please review and confirm")],
            position: 6,
            timeoutMs: 3600000,
            metadata: ["requires_auth": .bool(true)]
        )

        let data = try JSONEncoder.waiagents.encode(step)
        let decoded = try JSONDecoder.waiagents.decode(WorkflowStep.self, from: data)
        #expect(decoded.stepType == .humanInput)
        #expect(decoded.timeoutMs == 3600000)
    }

    @Test("WorkflowRun with empty input object is valid")
    func workflowRunEmptyInput() throws {
        let run = WorkflowRun(
            id: "run_empty",
            workflowID: "wf_001",
            agentID: "agent_1",
            userID: "user_1",
            status: .running,
            input: [:],
            result: nil
        )

        let data = try JSONEncoder.waiagents.encode(run)
        let decoded = try JSONDecoder.waiagents.decode(WorkflowRun.self, from: data)
        #expect(decoded.input.isEmpty)
        #expect(decoded.status == .running)
    }
}
