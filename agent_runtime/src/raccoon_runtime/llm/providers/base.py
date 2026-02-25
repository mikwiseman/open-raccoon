"""Abstract base for LLM providers."""

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from typing import Any


class BaseLLMProvider(ABC):
    """Base class for LLM provider implementations.

    All providers must support streaming completions and token counting.
    """

    @abstractmethod
    async def stream_completion(
        self,
        messages: list[dict[str, str]],
        config: dict[str, Any],
    ) -> AsyncIterator[str]:
        """Stream completion tokens from the LLM."""
        ...

    @abstractmethod
    async def count_tokens(self, text: str) -> int:
        """Count tokens in text using the provider's tokenizer."""
        ...
