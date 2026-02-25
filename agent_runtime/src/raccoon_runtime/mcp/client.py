"""MCP (Model Context Protocol) client stub.

Connects to MCP servers and executes tools on behalf of agents.
Tool call deadline: 20s default, 120s max for explicitly long-running tools.
"""


class MCPClient:
    """Connects to MCP servers and executes tools."""

    async def connect(self, server_url: str) -> None:
        """Establish a connection to an MCP server."""
        raise NotImplementedError("MCPClient.connect not yet implemented")

    async def discover_tools(self) -> list[dict]:
        """Discover available tools from connected MCP servers."""
        raise NotImplementedError("MCPClient.discover_tools not yet implemented")

    async def execute_tool(self, tool_name: str, arguments: dict) -> dict:
        """Execute a tool on the connected MCP server."""
        raise NotImplementedError("MCPClient.execute_tool not yet implemented")
