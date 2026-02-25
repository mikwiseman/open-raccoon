"""Tests for the MCP client."""

from unittest.mock import AsyncMock, patch

import httpx
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
    async def test_discover_tools_via_http(self):
        """Test that discover_tools sends a JSON-RPC request to the server."""
        client = MCPClient()
        await client.connect("test-server", "http://localhost:8080")

        mock_response = AsyncMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.raise_for_status = lambda: None
        mock_response.json.return_value = {
            "jsonrpc": "2.0",
            "id": "1",
            "result": {
                "tools": [
                    {"name": "search", "description": "Search the web"},
                ]
            },
        }

        with patch("raccoon_runtime.mcp.client.httpx.AsyncClient") as mock_httpx:
            mock_client_instance = AsyncMock()
            mock_client_instance.post = AsyncMock(return_value=mock_response)
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            mock_httpx.return_value = mock_client_instance

            tools = await client.discover_tools()
            assert len(tools) == 1
            assert tools[0]["name"] == "search"
            assert tools[0]["server"] == "test-server"

    @pytest.mark.asyncio
    async def test_execute_tool_not_connected(self):
        client = MCPClient()
        with pytest.raises(ValueError, match="Not connected"):
            await client.execute_tool("nonexistent", "search", {"q": "test"})

    @pytest.mark.asyncio
    async def test_execute_tool_via_http(self):
        """Test that execute_tool sends a JSON-RPC tools/call request."""
        client = MCPClient()
        await client.connect("test-server", "http://localhost:8080")

        mock_response = AsyncMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.raise_for_status = lambda: None
        mock_response.json.return_value = {
            "jsonrpc": "2.0",
            "id": "1",
            "result": {
                "content": [{"type": "text", "text": "search results here"}],
            },
        }

        with patch("raccoon_runtime.mcp.client.httpx.AsyncClient") as mock_httpx:
            mock_client_instance = AsyncMock()
            mock_client_instance.post = AsyncMock(return_value=mock_response)
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            mock_httpx.return_value = mock_client_instance

            result = await client.execute_tool("test-server", "search", {"q": "test"})
            assert "content" in result

            # Verify the JSON-RPC request was well-formed
            call_args = mock_client_instance.post.call_args
            body = call_args.kwargs.get("json", call_args[1].get("json", {}))
            assert body["method"] == "tools/call"
            assert body["params"]["name"] == "search"
            assert body["params"]["arguments"] == {"q": "test"}

    @pytest.mark.asyncio
    async def test_execute_tool_server_error(self):
        """Test that execute_tool raises RuntimeError on MCP server error."""
        client = MCPClient()
        await client.connect("test-server", "http://localhost:8080")

        mock_response = AsyncMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.raise_for_status = lambda: None
        mock_response.json.return_value = {
            "jsonrpc": "2.0",
            "id": "1",
            "error": {"code": -32600, "message": "Invalid request"},
        }

        with patch("raccoon_runtime.mcp.client.httpx.AsyncClient") as mock_httpx:
            mock_client_instance = AsyncMock()
            mock_client_instance.post = AsyncMock(return_value=mock_response)
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            mock_httpx.return_value = mock_client_instance

            with pytest.raises(RuntimeError, match="MCP tool execution error"):
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
