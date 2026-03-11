import Foundation
import Testing
@testable import WaiAgentsKit

@Suite("Agent Model Extended Tests")
struct AgentModelExtendedTests {

    // MARK: - ToolConfig

    @Test("ToolConfig decodes from JSON with all fields")
    func toolConfigDecodeFull() throws {
        let json = """
        {
            "name": "web_search",
            "enabled": true,
            "config": {
                "max_results": 10,
                "safe_search": true
            }
        }
        """.data(using: .utf8)!
        let tool = try JSONDecoder.waiagents.decode(Agent.ToolConfig.self, from: json)
        #expect(tool.name == "web_search")
        #expect(tool.enabled == true)
        #expect(tool.config?["max_results"]?.intValue == 10)
        #expect(tool.config?["safe_search"]?.boolValue == true)
    }

    @Test("ToolConfig decodes with minimal fields")
    func toolConfigDecodeMinimal() throws {
        let json = """
        {"name": "calculator", "enabled": false}
        """.data(using: .utf8)!
        let tool = try JSONDecoder.waiagents.decode(Agent.ToolConfig.self, from: json)
        #expect(tool.name == "calculator")
        #expect(tool.enabled == false)
        #expect(tool.config == nil)
    }

    @Test("ToolConfig round-trips through encoding")
    func toolConfigRoundTrip() throws {
        let original = Agent.ToolConfig(
            name: "code_exec",
            enabled: true,
            config: ["timeout": .int(30)]
        )
        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(Agent.ToolConfig.self, from: data)
        #expect(decoded == original)
    }

    // MARK: - McpServerConfig

    @Test("McpServerConfig decodes from JSON with all fields")
    func mcpServerConfigDecodeFull() throws {
        let json = """
        {
            "name": "memory_server",
            "url": "https://mcp.example.com",
            "auth_token": "tok_abc",
            "tools": ["remember", "recall", "forget"]
        }
        """.data(using: .utf8)!
        let config = try JSONDecoder.waiagents.decode(Agent.McpServerConfig.self, from: json)
        #expect(config.name == "memory_server")
        #expect(config.url == "https://mcp.example.com")
        #expect(config.authToken == "tok_abc")
        #expect(config.tools == ["remember", "recall", "forget"])
    }

    @Test("McpServerConfig decodes with minimal fields")
    func mcpServerConfigDecodeMinimal() throws {
        let json = """
        {"name": "basic_server", "url": "https://basic.example.com"}
        """.data(using: .utf8)!
        let config = try JSONDecoder.waiagents.decode(Agent.McpServerConfig.self, from: json)
        #expect(config.name == "basic_server")
        #expect(config.authToken == nil)
        #expect(config.tools == nil)
    }

    @Test("McpServerConfig round-trips through encoding")
    func mcpServerConfigRoundTrip() throws {
        let original = Agent.McpServerConfig(
            name: "search",
            url: "https://search.mcp.io",
            authToken: "secret",
            tools: ["web_search"]
        )
        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(Agent.McpServerConfig.self, from: data)
        #expect(decoded == original)
    }

    // MARK: - Agent with Tools and MCP Servers

    @Test("Agent decodes with tools array")
    func agentWithTools() throws {
        let json = """
        {
            "id": "agent_tools",
            "creator_id": "user_1",
            "name": "Tool Agent",
            "slug": "tool-agent",
            "tools": [
                {"name": "web_search", "enabled": true},
                {"name": "calculator", "enabled": false}
            ],
            "created_at": "2026-03-01T10:00:00Z",
            "updated_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!

        let agent = try JSONDecoder.waiagents.decode(Agent.self, from: json)
        #expect(agent.tools?.count == 2)
        #expect(agent.tools?[0].name == "web_search")
        #expect(agent.tools?[0].enabled == true)
        #expect(agent.tools?[1].name == "calculator")
        #expect(agent.tools?[1].enabled == false)
    }

    @Test("Agent decodes with mcp_servers array")
    func agentWithMcpServers() throws {
        let json = """
        {
            "id": "agent_mcp",
            "creator_id": "user_1",
            "name": "MCP Agent",
            "slug": "mcp-agent",
            "mcp_servers": [
                {"name": "memory", "url": "https://memory.mcp.io"}
            ],
            "created_at": "2026-03-01T10:00:00Z",
            "updated_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!

        let agent = try JSONDecoder.waiagents.decode(Agent.self, from: json)
        #expect(agent.mcpServers?.count == 1)
        #expect(agent.mcpServers?[0].name == "memory")
    }

    @Test("Agent decodes with metadata")
    func agentWithMetadata() throws {
        let json = """
        {
            "id": "agent_meta",
            "creator_id": "user_1",
            "name": "Meta Agent",
            "slug": "meta-agent",
            "metadata": {
                "version": "2.0",
                "features": ["streaming", "tools"],
                "config": {"max_context": 100000}
            },
            "created_at": "2026-03-01T10:00:00Z",
            "updated_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!

        let agent = try JSONDecoder.waiagents.decode(Agent.self, from: json)
        #expect(agent.metadata?["version"]?.stringValue == "2.0")
        #expect(agent.metadata?["features"]?.arrayValue?.count == 2)
        #expect(agent.metadata?["config"]?.dictionaryValue?["max_context"]?.intValue == 100000)
    }

    // MARK: - All Visibility Variants

    @Test("Agent decodes all visibility variants")
    func agentVisibilityVariants() throws {
        for (raw, expected) in [("public", Agent.Visibility.public),
                                ("unlisted", Agent.Visibility.unlisted),
                                ("private", Agent.Visibility.private)] {
            let json = """
            {
                "id": "a", "creator_id": "u", "name": "N", "slug": "s",
                "visibility": "\(raw)",
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z"
            }
            """.data(using: .utf8)!
            let agent = try JSONDecoder.waiagents.decode(Agent.self, from: json)
            #expect(agent.visibility == expected)
        }
    }

    // MARK: - Agent Round Trip with Full Data

    @Test("Agent round-trips with tools, MCP servers, and metadata")
    func agentFullRoundTrip() throws {
        let fixedDate = Date(timeIntervalSince1970: 1_000_000)
        let original = Agent(
            id: "agent_full_rt",
            creatorID: "user_rt",
            name: "Full RT Agent",
            slug: "full-rt",
            description: "A fully configured agent",
            systemPrompt: "You are a helpful assistant.",
            model: "claude-opus-4-6",
            temperature: 0.5,
            maxTokens: 8192,
            tools: [Agent.ToolConfig(name: "search", enabled: true)],
            mcpServers: [Agent.McpServerConfig(name: "mem", url: "https://mem.io")],
            visibility: .public,
            category: "coding",
            usageCount: 100,
            ratingSum: 450,
            ratingCount: 100,
            createdAt: fixedDate,
            updatedAt: fixedDate
        )

        let data = try JSONEncoder.waiagents.encode(original)
        let decoded = try JSONDecoder.waiagents.decode(Agent.self, from: data)
        #expect(decoded == original)
    }

    // MARK: - Average Rating Edge Cases

    @Test("averageRating prefers API value over computed")
    func averageRatingPrefersAPI() {
        let agent = Agent(
            id: "a1", creatorID: "u1", name: "Test", slug: "test",
            ratingSum: 45, ratingCount: 10,
            averageRatingFromAPI: 3.0
        )
        // API value 3.0 should win over computed 4.5
        #expect(agent.averageRating == 3.0)
    }

    @Test("averageRating computes from sum/count when API value is nil")
    func averageRatingComputed() {
        let agent = Agent(
            id: "a1", creatorID: "u1", name: "Test", slug: "test",
            ratingSum: 30, ratingCount: 6,
            averageRatingFromAPI: nil
        )
        #expect(agent.averageRating == 5.0)
    }

    @Test("averageRating returns 0 when ratingCount is nil")
    func averageRatingNilCount() {
        let agent = Agent(
            id: "a1", creatorID: "u1", name: "Test", slug: "test",
            ratingSum: nil, ratingCount: nil,
            averageRatingFromAPI: nil
        )
        #expect(agent.averageRating == 0)
    }

    @Test("Agent decodes with avatar URL")
    func agentWithAvatarURL() throws {
        let json = """
        {
            "id": "agent_avatar",
            "creator_id": "user_1",
            "name": "Avatar Agent",
            "slug": "avatar-agent",
            "avatar_url": "https://example.com/agent-avatar.png",
            "created_at": "2026-03-01T10:00:00Z",
            "updated_at": "2026-03-01T10:00:00Z"
        }
        """.data(using: .utf8)!

        let agent = try JSONDecoder.waiagents.decode(Agent.self, from: json)
        #expect(agent.avatarURL?.absoluteString == "https://example.com/agent-avatar.png")
    }
}
