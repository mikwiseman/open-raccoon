"""AgentService gRPC implementation stub.

Handles agent execution requests via gRPC streaming.
Deadline policy: 60s per turn (configurable by deployment).
"""

from typing import Any

from raccoon_runtime.config import Settings


class AgentServiceServicer:
    """Handles agent execution requests via gRPC streaming."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def ExecuteAgent(self, request: Any, context: Any) -> None:
        """Execute an agent with streaming response.

        Streams AgentResponse events (tokens, status, tool calls, etc.)
        back to the Elixir client. Default deadline: 60s per turn.
        """
        raise NotImplementedError("AgentService.ExecuteAgent not yet implemented")

    async def GetAgentConfig(self, request: Any, context: Any) -> None:
        """Get agent configuration."""
        raise NotImplementedError("AgentService.GetAgentConfig not yet implemented")

    async def ValidateTools(self, request: Any, context: Any) -> None:
        """Validate tool configurations."""
        raise NotImplementedError("AgentService.ValidateTools not yet implemented")
