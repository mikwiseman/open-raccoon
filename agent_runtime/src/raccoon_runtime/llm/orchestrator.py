"""Main LLM orchestration logic.

The orchestrator routes requests to the appropriate LLM provider,
manages tool execution, and emits status messages during processing.
"""

from typing import Any

from raccoon_runtime.config import Settings
from raccoon_runtime.llm.providers.base import BaseLLMProvider
from raccoon_runtime.status_messages import StatusMessageBank


class LLMOrchestrator:
    """Orchestrates LLM calls, tool execution, and status messages."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.status_bank = StatusMessageBank()
        self._providers: dict[str, BaseLLMProvider] = {}

    def get_provider(self, model: str) -> BaseLLMProvider:
        """Get the LLM provider for the given model name."""
        raise NotImplementedError("LLMOrchestrator.get_provider not yet implemented")

    async def execute(self, request: Any) -> None:
        """Execute an agent turn: LLM call, tool loop, streaming response."""
        raise NotImplementedError("LLMOrchestrator.execute not yet implemented")
