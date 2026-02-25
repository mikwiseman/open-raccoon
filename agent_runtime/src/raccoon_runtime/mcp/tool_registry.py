"""Tool discovery and validation.

Manages the registry of available tools and validates tool configurations
before they are used by agents.
"""


class ToolRegistry:
    """Manages available tools and validates configurations."""

    def __init__(self) -> None:
        self._tools: dict[str, dict] = {}

    def register_tool(self, name: str, schema: dict) -> None:
        """Register a tool with its JSON schema."""
        self._tools[name] = schema

    def validate_tool_config(self, name: str, args: dict) -> list[str]:
        """Validate tool arguments against the registered schema.

        Returns a list of validation error strings (empty if valid).
        """
        raise NotImplementedError("ToolRegistry.validate_tool_config not yet implemented")

    def get_available_tools(self) -> list[str]:
        """Return names of all registered tools."""
        return list(self._tools.keys())
