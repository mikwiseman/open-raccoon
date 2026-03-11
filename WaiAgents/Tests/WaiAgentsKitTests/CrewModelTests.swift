import Testing
import Foundation
@testable import WaiAgentsKit

@Suite("Crew Model Encoding/Decoding")
struct CrewModelTests {
    @Test("Crew decodes from JSON with all fields")
    func crewDecodeFull() throws {
        let json = """
        {
            "id": "crew_001",
            "creator_id": "user_123",
            "name": "Research Crew",
            "slug": "research-crew",
            "description": "A crew for research tasks",
            "visibility": "public",
            "steps": [
                {"agent_id": "agent_1", "role": "researcher"},
                {"agent_id": "agent_2", "role": "writer", "parallel_group": "draft"}
            ],
            "category": "research",
            "usage_count": 42,
            "rating_sum": 20,
            "rating_count": 5,
            "metadata": {"version": "1.0"},
            "created_at": "2026-03-01T10:00:00Z",
            "updated_at": "2026-03-02T12:00:00Z"
        }
        """.data(using: .utf8)!

        let crew = try JSONDecoder.waiagents.decode(Crew.self, from: json)
        #expect(crew.id == "crew_001")
        #expect(crew.creatorID == "user_123")
        #expect(crew.name == "Research Crew")
        #expect(crew.slug == "research-crew")
        #expect(crew.description == "A crew for research tasks")
        #expect(crew.visibility == .public)
        #expect(crew.steps.count == 2)
        #expect(crew.steps[0].agentID == "agent_1")
        #expect(crew.steps[0].role == "researcher")
        #expect(crew.steps[0].parallelGroup == nil)
        #expect(crew.steps[1].agentID == "agent_2")
        #expect(crew.steps[1].role == "writer")
        #expect(crew.steps[1].parallelGroup == "draft")
        #expect(crew.category == "research")
        #expect(crew.usageCount == 42)
        #expect(crew.ratingSum == 20)
        #expect(crew.ratingCount == 5)
        #expect(crew.averageRating == 4.0)
    }

    @Test("Crew decodes with minimal fields (nulls)")
    func crewDecodeMinimal() throws {
        let json = """
        {
            "id": "crew_002",
            "creator_id": "user_456",
            "name": "Simple Crew",
            "visibility": "private",
            "steps": [],
            "created_at": null,
            "updated_at": null
        }
        """.data(using: .utf8)!

        let crew = try JSONDecoder.waiagents.decode(Crew.self, from: json)
        #expect(crew.id == "crew_002")
        #expect(crew.slug == nil)
        #expect(crew.description == nil)
        #expect(crew.visibility == .private)
        #expect(crew.steps.isEmpty)
        #expect(crew.category == nil)
        #expect(crew.usageCount == 0)
        #expect(crew.ratingSum == 0)
        #expect(crew.ratingCount == 0)
        #expect(crew.averageRating == 0)
        #expect(crew.createdAt == nil)
        #expect(crew.updatedAt == nil)
    }

    @Test("Crew round-trips through encode/decode")
    func crewRoundTrip() throws {
        let step = CrewStep(agentID: "agent_1", role: "coder", parallelGroup: "build")
        let crew = Crew(
            id: "crew_rt",
            creatorID: "user_rt",
            name: "Round Trip Crew",
            slug: "round-trip",
            visibility: .unlisted,
            steps: [step],
            usageCount: 10,
            ratingSum: 8,
            ratingCount: 2
        )

        let data = try JSONEncoder.waiagents.encode(crew)
        let decoded = try JSONDecoder.waiagents.decode(Crew.self, from: data)
        #expect(decoded == crew)
    }

    @Test("CrewStep round-trips through encode/decode")
    func crewStepRoundTrip() throws {
        let step = CrewStep(agentID: "agent_x", role: "reviewer", parallelGroup: "review")
        let data = try JSONEncoder.waiagents.encode(step)
        let decoded = try JSONDecoder.waiagents.decode(CrewStep.self, from: data)
        #expect(decoded == step)
    }

    @Test("CrewStep without parallelGroup round-trips")
    func crewStepNoParallelGroup() throws {
        let step = CrewStep(agentID: "agent_y", role: "planner")
        let data = try JSONEncoder.waiagents.encode(step)
        let decoded = try JSONDecoder.waiagents.decode(CrewStep.self, from: data)
        #expect(decoded == step)
        #expect(decoded.parallelGroup == nil)
    }

    @Test("Crew averageRating returns 0 when ratingCount is 0")
    func crewAverageRatingZero() {
        let crew = Crew(id: "c", creatorID: "u", name: "Test", ratingSum: 0, ratingCount: 0)
        #expect(crew.averageRating == 0)
    }
}
