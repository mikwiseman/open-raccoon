"""Anthropic Claude LLM provider with streaming and tool use."""

import json
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

        # Track tool use blocks being assembled during streaming
        tool_use_blocks: dict[str, dict[str, Any]] = {}
        # Track which tool_use IDs have already been fully emitted
        emitted_tool_ids: set[str] = set()

        async with self.client.messages.stream(**kwargs) as stream:
            async for event in stream:
                if event.type == "content_block_start":
                    if event.content_block.type == "tool_use":
                        tool_id = event.content_block.id
                        tool_name = event.content_block.name
                        tool_use_blocks[tool_id] = {
                            "id": tool_id,
                            "name": tool_name,
                            "input_json": "",
                        }
                        yield {
                            "type": "tool_use_start",
                            "id": tool_id,
                            "name": tool_name,
                        }

                elif event.type == "content_block_delta":
                    if hasattr(event.delta, "text"):
                        yield {"type": "token", "text": event.delta.text}
                    elif hasattr(event.delta, "partial_json"):
                        yield {"type": "tool_input_delta", "text": event.delta.partial_json}
                        # Accumulate the partial JSON for the current tool block
                        # Find the tool block this delta belongs to (most recent one)
                        if tool_use_blocks:
                            # The delta belongs to the last started block
                            last_id = list(tool_use_blocks.keys())[-1]
                            tool_use_blocks[last_id]["input_json"] += event.delta.partial_json

                elif event.type == "content_block_stop":
                    # When a tool_use content block finishes, emit the complete tool_use event
                    # immediately rather than waiting for the final_message
                    if tool_use_blocks:
                        # Check if the just-stopped block is a tool_use block
                        # content_block_stop has an index, match it to the block
                        for tool_id, block in tool_use_blocks.items():
                            if tool_id not in emitted_tool_ids:
                                parsed_input: dict[str, Any] = {}
                                raw_json = block["input_json"]
                                if raw_json:
                                    try:
                                        parsed_input = json.loads(raw_json)
                                    except json.JSONDecodeError:
                                        logger.error(
                                            "malformed_tool_json",
                                            tool_id=tool_id,
                                            raw_json=raw_json[:200],
                                        )
                                        parsed_input = {}
                                yield {
                                    "type": "tool_use",
                                    "id": block["id"],
                                    "name": block["name"],
                                    "input": parsed_input,
                                }
                                emitted_tool_ids.add(tool_id)

            # Get final message for usage and any tool use blocks that may not have
            # been emitted during streaming (e.g., tool blocks with empty input)
            final_message = await stream.get_final_message()

            for block in final_message.content:
                if block.type == "tool_use" and block.id not in emitted_tool_ids:
                    yield {
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                    }
                    emitted_tool_ids.add(block.id)

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
