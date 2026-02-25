"""Tool discovery, validation, and execution registry."""

import asyncio
import inspect
from typing import Any

import structlog

logger = structlog.get_logger()


class ToolRegistry:
    """Manages available tools and validates configurations."""

    def __init__(self) -> None:
        self._tools: dict[str, dict[str, Any]] = {}
        self._handlers: dict[str, Any] = {}

    def register_tool(
        self,
        name: str,
        schema: dict[str, Any],
        handler: Any = None,
    ) -> None:
        """Register a tool with its schema and optional handler."""
        if handler is not None and not callable(handler):
            raise TypeError(f"Handler for tool '{name}' must be callable")
        self._tools[name] = schema
        if handler:
            self._handlers[name] = handler
        logger.info("tool_registered", tool=name, has_handler=handler is not None)

    def unregister_tool(self, name: str) -> None:
        """Remove a tool from the registry."""
        self._tools.pop(name, None)
        self._handlers.pop(name, None)
        logger.info("tool_unregistered", tool=name)

    def validate_tool_config(self, name: str, args: dict[str, Any]) -> list[str]:
        """Validate tool arguments against schema. Returns list of errors."""
        if name not in self._tools:
            return [f"Unknown tool: {name}"]

        schema = self._tools[name]
        errors: list[str] = []

        # Check required properties
        required = schema.get("required", [])
        properties = schema.get("properties", {})

        for req in required:
            if req not in args:
                errors.append(f"Missing required argument: {req}")

        # Check types (basic validation against JSON Schema type keywords)
        type_checks: dict[str, type | tuple[type, ...]] = {
            "string": str,
            "integer": int,
            "number": (int, float),
            "boolean": bool,
            "array": list,
            "object": dict,
        }

        for arg_name, arg_value in args.items():
            if arg_name in properties:
                expected_type = properties[arg_name].get("type")
                if expected_type and expected_type in type_checks:
                    python_type = type_checks[expected_type]
                    if not isinstance(arg_value, python_type):
                        errors.append(
                            f"Argument {arg_name} must be {expected_type}, "
                            f"got {type(arg_value).__name__}"
                        )

        return errors

    async def execute_tool(self, name: str, arguments: dict[str, Any]) -> Any:
        """Execute a tool by name with the given arguments."""
        if name not in self._tools:
            raise ValueError(f"Unknown tool: {name}")

        # Validate arguments
        errors = self.validate_tool_config(name, arguments)
        if errors:
            raise ValueError(f"Tool validation failed: {'; '.join(errors)}")

        handler = self._handlers.get(name)
        if handler is None:
            raise NotImplementedError(f"No handler registered for tool: {name}")

        logger.info("executing_tool", tool=name, args_keys=list(arguments.keys()))
        if asyncio.iscoroutinefunction(handler):
            result = await handler(arguments)
        else:
            result = handler(arguments)
        return result

    def get_available_tools(self) -> list[dict[str, Any]]:
        """Return list of available tools with their schemas."""
        return [
            {"name": name, "schema": schema}
            for name, schema in self._tools.items()
        ]

    def has_tool(self, name: str) -> bool:
        """Check if a tool is registered."""
        return name in self._tools

    def tool_count(self) -> int:
        """Return number of registered tools."""
        return len(self._tools)
