"""Tests for the tool registry."""

import pytest

from raccoon_runtime.mcp.tool_registry import ToolRegistry


class TestToolRegistry:
    def test_register_and_list(self):
        registry = ToolRegistry()
        registry.register_tool(
            "test_tool",
            {"type": "object", "properties": {"q": {"type": "string"}}},
        )
        tools = registry.get_available_tools()
        assert len(tools) == 1
        assert tools[0]["name"] == "test_tool"

    def test_validate_missing_required(self):
        registry = ToolRegistry()
        registry.register_tool(
            "search",
            {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        )
        errors = registry.validate_tool_config("search", {})
        assert len(errors) == 1
        assert "query" in errors[0]

    def test_validate_unknown_tool(self):
        registry = ToolRegistry()
        errors = registry.validate_tool_config("nonexistent", {})
        assert len(errors) == 1
        assert "Unknown tool" in errors[0]

    def test_validate_correct_args(self):
        registry = ToolRegistry()
        registry.register_tool(
            "search",
            {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        )
        errors = registry.validate_tool_config("search", {"query": "hello"})
        assert errors == []

    def test_validate_wrong_type(self):
        registry = ToolRegistry()
        registry.register_tool(
            "search",
            {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        )
        errors = registry.validate_tool_config("search", {"query": 123})
        assert len(errors) == 1
        assert "string" in errors[0]

    def test_validate_integer_type(self):
        registry = ToolRegistry()
        registry.register_tool(
            "fetch",
            {
                "type": "object",
                "properties": {"count": {"type": "integer"}},
                "required": ["count"],
            },
        )
        # Valid
        assert registry.validate_tool_config("fetch", {"count": 5}) == []
        # Invalid
        errors = registry.validate_tool_config("fetch", {"count": "five"})
        assert len(errors) == 1

    def test_validate_boolean_type(self):
        registry = ToolRegistry()
        registry.register_tool(
            "toggle",
            {
                "type": "object",
                "properties": {"enabled": {"type": "boolean"}},
                "required": ["enabled"],
            },
        )
        assert registry.validate_tool_config("toggle", {"enabled": True}) == []
        errors = registry.validate_tool_config("toggle", {"enabled": "yes"})
        assert len(errors) == 1

    def test_has_tool(self):
        registry = ToolRegistry()
        assert not registry.has_tool("search")
        registry.register_tool("search", {"type": "object", "properties": {}})
        assert registry.has_tool("search")

    def test_unregister_tool(self):
        registry = ToolRegistry()
        registry.register_tool("search", {"type": "object", "properties": {}})
        assert registry.has_tool("search")
        registry.unregister_tool("search")
        assert not registry.has_tool("search")

    def test_tool_count(self):
        registry = ToolRegistry()
        assert registry.tool_count() == 0
        registry.register_tool("a", {"type": "object", "properties": {}})
        registry.register_tool("b", {"type": "object", "properties": {}})
        assert registry.tool_count() == 2

    @pytest.mark.asyncio
    async def test_execute_unknown_tool(self):
        registry = ToolRegistry()
        with pytest.raises(ValueError, match="Unknown tool"):
            await registry.execute_tool("nonexistent", {})

    @pytest.mark.asyncio
    async def test_execute_no_handler(self):
        registry = ToolRegistry()
        registry.register_tool("search", {"type": "object", "properties": {}})
        with pytest.raises(NotImplementedError, match="No handler"):
            await registry.execute_tool("search", {})

    @pytest.mark.asyncio
    async def test_execute_with_handler(self):
        registry = ToolRegistry()

        async def my_handler(args):
            return f"result: {args['q']}"

        registry.register_tool(
            "search",
            {
                "type": "object",
                "properties": {"q": {"type": "string"}},
                "required": ["q"],
            },
            handler=my_handler,
        )
        result = await registry.execute_tool("search", {"q": "test"})
        assert result == "result: test"

    @pytest.mark.asyncio
    async def test_execute_validation_failure(self):
        registry = ToolRegistry()

        async def my_handler(args):
            return "ok"

        registry.register_tool(
            "search",
            {
                "type": "object",
                "properties": {"q": {"type": "string"}},
                "required": ["q"],
            },
            handler=my_handler,
        )
        with pytest.raises(ValueError, match="Tool validation failed"):
            await registry.execute_tool("search", {})
