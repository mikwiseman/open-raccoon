"""AgentService gRPC implementation.

Handles agent execution requests via gRPC streaming.
Deadline policy: 60s per turn (configurable by deployment).
"""

from typing import Any

import structlog

from raccoon_runtime.config import Settings
from raccoon_runtime.llm.orchestrator import LLMOrchestrator
from raccoon_runtime.mcp.tool_registry import ToolRegistry

logger = structlog.get_logger()


class AgentServiceServicer:
    """Handles agent execution requests via gRPC streaming."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.orchestrator = LLMOrchestrator(settings)

    async def ExecuteAgent(self, request: Any, context: Any) -> Any:  # noqa: N802
        """Execute an agent with streaming response.

        Streams AgentResponse events (tokens, status, tool calls, etc.)
        back to the Elixir client. Default deadline: 60s per turn.
        """
        conversation_id = getattr(request, "conversation_id", "")
        agent_id = getattr(request, "agent_id", "")
        messages = getattr(request, "messages", [])
        config = getattr(request, "config", None)
        user_api_key = getattr(request, "user_api_key", "")

        logger.info(
            "execute_agent",
            conversation_id=conversation_id,
            agent_id=agent_id,
            message_count=len(messages),
        )

        # Convert proto messages to dicts
        msg_dicts = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]

        # Build config dict from proto AgentConfig
        config_dict: dict[str, Any] = {}
        if config:
            config_dict = {
                "model": config.model or self.settings.default_model,
                "temperature": config.temperature or 0.7,
                "max_tokens": config.max_tokens or 4096,
                "system_prompt": config.system_prompt or "",
                "tools": [],
                "deadline_seconds": self.settings.agent_turn_deadline,
            }
            # Convert proto ToolConfig repeated field to list of dicts
            if hasattr(config, "tools"):
                for tool in config.tools:
                    config_dict["tools"].append({
                        "name": tool.name,
                        "description": getattr(tool, "description", ""),
                        "input_schema": dict(getattr(tool, "input_schema", {})),
                        "requires_approval": getattr(tool, "requires_approval", False),
                    })

        # Stream events from orchestrator
        async for event in self.orchestrator.execute(
            messages=msg_dicts,
            config=config_dict,
            api_key=user_api_key or None,
        ):
            # In a full implementation, each event dict would be converted
            # to the corresponding protobuf AgentResponse message type.
            # For now, yield the raw event dicts.
            yield event

    async def GetAgentConfig(self, request: Any, context: Any) -> Any:  # noqa: N802
        """Get agent configuration."""
        raise NotImplementedError("GetAgentConfig not yet implemented")

    async def ValidateTools(self, request: Any, context: Any) -> Any:  # noqa: N802
        """Validate tool configurations."""
        tool_configs = getattr(request, "tools", [])
        registry = ToolRegistry()
        errors: list[dict[str, str]] = []

        for tool in tool_configs:
            tool_name = getattr(tool, "name", "")
            if not tool_name:
                errors.append({"tool_name": "", "error": "Tool name is required"})

        return {"valid": len(errors) == 0, "errors": errors}
