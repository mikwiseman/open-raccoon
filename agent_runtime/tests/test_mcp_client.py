"""Tests for the MCP client."""

import pytest

from raccoon_runtime.mcp.client import MCPClient


class TestMCPClient:
    @pytest.mark.asyncio
    async def test_connect(self):
        client = MCPClient()
        await client.connect("test-server", "http://localhost:8080")
        assert "test-server" in client.connected_servers
        assert client.connection_count == 1

    @pytest.mark.asyncio
    async def test_disconnect(self):
        client = MCPClient()
        await client.connect("test-server", "http://localhost:8080")
        await client.disconnect("test-server")
        assert "test-server" not in client.connected_servers
        assert client.connection_count == 0

    @pytest.mark.asyncio
    async def test_disconnect_nonexistent(self):
        """Disconnecting a non-existent server should not raise."""
        client = MCPClient()
        await client.disconnect("nonexistent")

    @pytest.mark.asyncio
    async def test_disconnect_all(self):
        client = MCPClient()
        await client.connect("server-a", "http://localhost:8080")
        await client.connect("server-b", "http://localhost:8081")
        assert client.connection_count == 2
        await client.disconnect_all()
        assert client.connection_count == 0

    @pytest.mark.asyncio
    async def test_discover_tools_empty(self):
        client = MCPClient()
        await client.connect("test-server", "http://localhost:8080")
        tools = await client.discover_tools()
        assert tools == []

    @pytest.mark.asyncio
    async def test_execute_tool_not_connected(self):
        client = MCPClient()
        with pytest.raises(ValueError, match="Not connected"):
            await client.execute_tool("nonexistent", "search", {"q": "test"})

    @pytest.mark.asyncio
    async def test_execute_tool_not_implemented(self):
        client = MCPClient()
        await client.connect("test-server", "http://localhost:8080")
        with pytest.raises(NotImplementedError, match="not yet implemented"):
            await client.execute_tool("test-server", "search", {"q": "test"})

    @pytest.mark.asyncio
    async def test_is_connected(self):
        client = MCPClient()
        assert not client.is_connected("test-server")
        await client.connect("test-server", "http://localhost:8080")
        assert client.is_connected("test-server")

    @pytest.mark.asyncio
    async def test_connect_with_auth(self):
        client = MCPClient()
        await client.connect(
            "test-server",
            "http://localhost:8080",
            auth={"token": "secret"},
        )
        assert client.is_connected("test-server")
