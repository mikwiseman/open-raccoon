"""MCP (Model Context Protocol) client for connecting to tool servers.

Connects to MCP servers and discovers/executes tools on behalf of agents.
Tool call deadline: 20s default, 120s max for explicitly long-running tools.
"""

import json
import uuid
from typing import Any

import httpx
import structlog

logger = structlog.get_logger()

# Default timeout for MCP tool execution requests (seconds)
MCP_TOOL_TIMEOUT = 20.0


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
            server_url = conn["url"]
            auth = conn.get("auth", {})

            headers: dict[str, str] = {"Content-Type": "application/json"}
            if auth.get("token"):
                headers["Authorization"] = f"Bearer {auth['token']}"

            # Send JSON-RPC request to discover tools via MCP tools/list
            request_body = {
                "jsonrpc": "2.0",
                "id": str(uuid.uuid4()),
                "method": "tools/list",
                "params": {},
            }

            async with httpx.AsyncClient(timeout=MCP_TOOL_TIMEOUT) as client:
                response = await client.post(
                    server_url,
                    json=request_body,
                    headers=headers,
                )
                response.raise_for_status()
                try:
                    result = response.json()
                except json.JSONDecodeError as e:
                    raise RuntimeError(f"MCP server returned invalid JSON: {e}")

            # Parse JSON-RPC response
            if "error" in result:
                raise RuntimeError(
                    f"MCP server {name} returned error: {result['error']}"
                )

            server_tools = result.get("result", {}).get("tools", [])
            # Cache tools on the connection
            conn["tools"] = server_tools
            for tool in server_tools:
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
            Tool execution result dict.

        Raises:
            ValueError: If not connected to the specified server.
            RuntimeError: If the MCP server returns an error.
        """
        if server_name not in self._connections:
            raise ValueError(f"Not connected to server: {server_name}")

        conn = self._connections[server_name]
        server_url = conn["url"]
        auth = conn.get("auth", {})

        headers: dict[str, str] = {"Content-Type": "application/json"}
        if auth.get("token"):
            headers["Authorization"] = f"Bearer {auth['token']}"

        logger.info("mcp_execute_tool", server=server_name, tool=tool_name)

        # Send JSON-RPC request to execute the tool via MCP tools/call
        request_body = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
            },
        }

        async with httpx.AsyncClient(timeout=MCP_TOOL_TIMEOUT) as client:
            response = await client.post(
                server_url,
                json=request_body,
                headers=headers,
            )
            response.raise_for_status()
            try:
                result = response.json()
            except json.JSONDecodeError as e:
                raise RuntimeError(f"MCP server returned invalid JSON: {e}")

        # Parse JSON-RPC response
        if "error" in result:
            raise RuntimeError(
                f"MCP tool execution error for {server_name}/{tool_name}: {result['error']}"
            )

        return result.get("result", {})

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
