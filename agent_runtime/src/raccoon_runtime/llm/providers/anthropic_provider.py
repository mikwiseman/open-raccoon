"""Anthropic Claude LLM provider stub."""

from collections.abc import AsyncIterator
from typing import Any

from raccoon_runtime.llm.providers.base import BaseLLMProvider


class AnthropicProvider(BaseLLMProvider):
    """LLM provider for Anthropic Claude models."""

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    async def stream_completion(
        self,
        messages: list[dict[str, str]],
        config: dict[str, Any],
    ) -> AsyncIterator[str]:
        """Stream completion tokens from Claude."""
        raise NotImplementedError("AnthropicProvider.stream_completion not yet implemented")

    async def count_tokens(self, text: str) -> int:
        """Count tokens using Anthropic's tokenizer."""
        raise NotImplementedError("AnthropicProvider.count_tokens not yet implemented")
