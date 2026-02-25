"""Anthropic Claude LLM provider with streaming and tool use."""

from collections.abc import AsyncIterator
from typing import Any

import anthropic
import structlog

from raccoon_runtime.llm.providers.base import BaseLLMProvider

logger = structlog.get_logger()


class AnthropicProvider(BaseLLMProvider):
    """LLM provider for Anthropic Claude models."""

    def __init__(self, api_key: str) -> None:
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def stream_completion(
        self,
        messages: list[dict[str, str]],
        config: dict[str, Any],
    ) -> AsyncIterator[dict[str, Any]]:
        """Stream completion events from Claude.

        Yields dicts with keys:
        - {"type": "token", "text": "..."}
        - {"type": "tool_use_start", "id": "...", "name": "..."}
        - {"type": "tool_input_delta", "text": "..."}
        - {"type": "tool_use", "id": "...", "name": "...", "input": {...}}
        - {"type": "complete", "usage": {...}, "stop_reason": "..."}
        """
        model = config.get("model", "claude-sonnet-4-6")
        system_prompt = config.get("system_prompt", "")
        tools = config.get("tools", [])
        max_tokens = config.get("max_tokens", 4096)
        temperature = config.get("temperature", 0.7)

        # Convert tools to Anthropic format
        anthropic_tools = [
            {
                "name": tool["name"],
                "description": tool.get("description", ""),
                "input_schema": tool.get(
                    "input_schema", {"type": "object", "properties": {}}
                ),
            }
            for tool in tools
        ] if tools else []

        kwargs: dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": messages,
        }
        if system_prompt:
            kwargs["system"] = system_prompt
        if anthropic_tools:
            kwargs["tools"] = anthropic_tools

        logger.info(
            "anthropic_stream_start",
            model=model,
            message_count=len(messages),
            tool_count=len(anthropic_tools),
        )

        async with self.client.messages.stream(**kwargs) as stream:
            async for event in stream:
                if event.type == "content_block_delta":
                    if hasattr(event.delta, "text"):
                        yield {"type": "token", "text": event.delta.text}
                    elif hasattr(event.delta, "partial_json"):
                        yield {"type": "tool_input_delta", "text": event.delta.partial_json}
                elif event.type == "content_block_start":
                    if event.content_block.type == "tool_use":
                        yield {
                            "type": "tool_use_start",
                            "id": event.content_block.id,
                            "name": event.content_block.name,
                        }

            # Get final message for usage and tool use blocks
            final_message = await stream.get_final_message()

            # Emit complete tool_use events with parsed input
            for block in final_message.content:
                if block.type == "tool_use":
                    yield {
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                    }

            yield {
                "type": "complete",
                "usage": {
                    "prompt_tokens": final_message.usage.input_tokens,
                    "completion_tokens": final_message.usage.output_tokens,
                    "total_tokens": (
                        final_message.usage.input_tokens + final_message.usage.output_tokens
                    ),
                },
                "stop_reason": final_message.stop_reason,
            }

    async def count_tokens(self, text: str) -> int:
        """Approximate token count.

        Uses a rough heuristic of ~4 characters per token for English text.
        For precise counts, use the Anthropic tokenizer API when available.
        """
        return len(text) // 4
