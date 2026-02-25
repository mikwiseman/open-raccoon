"""Abstract base for LLM providers."""

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from typing import Any


class BaseLLMProvider(ABC):
    """Base class for LLM provider implementations.

    All providers must support streaming completions and token counting.
    Streaming yields structured event dicts, not raw strings.
    """

    @abstractmethod
    async def stream_completion(
        self,
        messages: list[dict[str, str]],
        config: dict[str, Any],
    ) -> AsyncIterator[dict[str, Any]]:
        """Stream completion events from the LLM.

        Yields dicts with keys:
        - {"type": "token", "text": "..."}
        - {"type": "tool_use_start", "id": "...", "name": "..."}
        - {"type": "tool_input_delta", "text": "..."}
        - {"type": "tool_use", "id": "...", "name": "...", "input": {...}}
        - {"type": "complete", "usage": {...}, "stop_reason": "..."}
        """
        ...

    @abstractmethod
    async def count_tokens(self, text: str) -> int:
        """Count tokens in text using the provider's tokenizer."""
        ...
