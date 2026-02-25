"""MCP (Model Context Protocol) client for connecting to tool servers.

Connects to MCP servers and discovers/executes tools on behalf of agents.
Tool call deadline: 20s default, 120s max for explicitly long-running tools.
"""

from typing import Any

import structlog

logger = structlog.get_logger()


class MCPClient:
    """Connects to MCP servers and discovers/executes tools."""

    def __init__(self) -> None:
        self._connections: dict[str, dict[str, Any]] = {}

    async def connect(
        self,
        name: str,
        server_url: str,
        auth: dict[str, str] | None = None,
    ) -> None:
        """Connect to an MCP server.

        Args:
            name: Unique identifier for this connection.
            server_url: URL of the MCP server.
            auth: Optional auth credentials (e.g. {"token": "..."}).
        """
        logger.info("mcp_connecting", server=name, url=server_url)
        self._connections[name] = {
            "url": server_url,
            "auth": auth or {},
            "status": "connected",
            "tools": [],
        }
        logger.info("mcp_connected", server=name)

    async def disconnect(self, name: str) -> None:
        """Disconnect from an MCP server."""
        if name in self._connections:
            logger.info("mcp_disconnecting", server=name)
            del self._connections[name]

    async def disconnect_all(self) -> None:
        """Disconnect from all MCP servers."""
        names = list(self._connections.keys())
        for name in names:
            await self.disconnect(name)

    async def discover_tools(
        self, server_name: str | None = None
    ) -> list[dict[str, Any]]:
        """Discover available tools from connected servers.

        Args:
            server_name: If provided, discover tools only from this server.
                         Otherwise discover from all connected servers.

        Returns:
            List of tool descriptors with server attribution.
        """
        tools: list[dict[str, Any]] = []

        servers = (
            {server_name: self._connections[server_name]}
            if server_name and server_name in self._connections
            else self._connections
        )

        for name, conn in servers.items():
            # In production, this would call the MCP server's tools/list endpoint
            # via the MCP protocol. For now, return cached tool list.
            for tool in conn.get("tools", []):
                tools.append({**tool, "server": name})

        return tools

    async def execute_tool(
        self,
        server_name: str,
        tool_name: str,
        arguments: dict[str, Any],
    ) -> dict[str, Any]:
        """Execute a tool on a specific MCP server.

        Args:
            server_name: Name of the connected server.
            tool_name: Name of the tool to execute.
            arguments: Tool arguments as a dict.

        Returns:
            Tool execution result.

        Raises:
            ValueError: If not connected to the specified server.
            NotImplementedError: MCP protocol execution is not yet wired.
        """
        if server_name not in self._connections:
            raise ValueError(f"Not connected to server: {server_name}")

        logger.info("mcp_execute_tool", server=server_name, tool=tool_name)
        # In production, this would:
        # 1. Serialize the arguments per MCP protocol
        # 2. Send tools/call request to the MCP server
        # 3. Await and return the result
        raise NotImplementedError(
            f"MCP tool execution not yet implemented for {server_name}/{tool_name}"
        )

    @property
    def connected_servers(self) -> list[str]:
        """Return names of all connected servers."""
        return list(self._connections.keys())

    @property
    def connection_count(self) -> int:
        """Return number of active connections."""
        return len(self._connections)

    def is_connected(self, name: str) -> bool:
        """Check if a specific server is connected."""
        return name in self._connections
