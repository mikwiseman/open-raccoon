"""OpenAI LLM provider with streaming and function calling."""

import json
from collections.abc import AsyncIterator
from typing import Any

import openai
import structlog

from raccoon_runtime.llm.providers.base import BaseLLMProvider

logger = structlog.get_logger()


class OpenAIProvider(BaseLLMProvider):
    """LLM provider for OpenAI models (GPT-5.2, etc.)."""

    def __init__(self, api_key: str) -> None:
        self.client = openai.AsyncOpenAI(api_key=api_key)

    async def stream_completion(
        self,
        messages: list[dict[str, str]],
        config: dict[str, Any],
    ) -> AsyncIterator[dict[str, Any]]:
        """Stream completion events from OpenAI.

        Yields dicts with keys:
        - {"type": "token", "text": "..."}
        - {"type": "tool_use", "id": "...", "name": "...", "input": {...}}
        - {"type": "complete", "usage": {...}, "stop_reason": "..."}
        """
        model = config.get("model", "gpt-5.2")
        system_prompt = config.get("system_prompt", "")
        tools = config.get("tools", [])
        max_tokens = config.get("max_tokens", 4096)
        temperature = config.get("temperature", 0.7)

        # Build messages list with system prompt prepended
        openai_messages: list[dict[str, Any]] = []
        if system_prompt:
            openai_messages.append({"role": "system", "content": system_prompt})
        openai_messages.extend(messages)

        # Convert tools to OpenAI function calling format
        openai_tools = [
            {
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool.get("description", ""),
                    "parameters": tool.get(
                        "input_schema", {"type": "object", "properties": {}}
                    ),
                },
            }
            for tool in tools
        ] if tools else []

        kwargs: dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": openai_messages,
            "stream": True,
            "stream_options": {"include_usage": True},
        }
        if openai_tools:
            kwargs["tools"] = openai_tools

        logger.info(
            "openai_stream_start",
            model=model,
            message_count=len(messages),
            tool_count=len(openai_tools),
        )

        # Track tool calls being assembled from deltas
        tool_calls_in_progress: dict[int, dict[str, Any]] = {}
        usage_data: dict[str, int] = {}
        finish_reason: str = ""

        stream = await self.client.chat.completions.create(**kwargs)

        async for chunk in stream:
            # Usage is reported in the final chunk when stream_options.include_usage is set
            if chunk.usage is not None:
                usage_data = {
                    "prompt_tokens": chunk.usage.prompt_tokens,
                    "completion_tokens": chunk.usage.completion_tokens,
                    "total_tokens": chunk.usage.total_tokens,
                }

            if not chunk.choices:
                continue

            choice = chunk.choices[0]

            if choice.finish_reason:
                finish_reason = choice.finish_reason

            delta = choice.delta
            if delta is None:
                continue

            # Stream text content
            if delta.content:
                yield {"type": "token", "text": delta.content}

            # Accumulate tool call deltas
            if delta.tool_calls:
                for tool_call_delta in delta.tool_calls:
                    idx = tool_call_delta.index

                    if idx not in tool_calls_in_progress:
                        tool_calls_in_progress[idx] = {
                            "id": "",
                            "name": "",
                            "arguments": "",
                        }

                    tc = tool_calls_in_progress[idx]

                    if tool_call_delta.id:
                        tc["id"] = tool_call_delta.id

                    if tool_call_delta.function:
                        if tool_call_delta.function.name:
                            tc["name"] = tool_call_delta.function.name
                        if tool_call_delta.function.arguments:
                            tc["arguments"] += tool_call_delta.function.arguments

        # Emit assembled tool calls with validation
        for _idx, tc in sorted(tool_calls_in_progress.items()):
            # Validate that tool call has a usable ID
            if not tc["id"]:
                logger.warning(
                    "openai_tool_call_missing_id",
                    name=tc["name"],
                    arguments_fragment=tc["arguments"][:100],
                )
                continue

            # Validate that tool call has a name
            if not tc["name"]:
                logger.warning(
                    "openai_tool_call_missing_name",
                    tool_id=tc["id"],
                )
                continue

            # Parse accumulated JSON arguments with error handling
            parsed_args: dict[str, Any] = {}
            if tc["arguments"]:
                try:
                    parsed_args = json.loads(tc["arguments"])
                except json.JSONDecodeError as e:
                    logger.error(
                        "openai_tool_call_invalid_json",
                        tool_id=tc["id"],
                        name=tc["name"],
                        error=str(e),
                        arguments_fragment=tc["arguments"][:200],
                    )
                    # Skip this malformed tool call rather than crashing
                    continue

            yield {
                "type": "tool_use",
                "id": tc["id"],
                "name": tc["name"],
                "input": parsed_args,
            }

        # Map OpenAI finish_reason to our stop_reason
        stop_reason_map = {
            "stop": "end_turn",
            "length": "max_tokens",
            "tool_calls": "tool_use",
            "content_filter": "content_filter",
        }

        yield {
            "type": "complete",
            "usage": usage_data,
            "stop_reason": stop_reason_map.get(finish_reason, finish_reason),
        }

    async def count_tokens(self, text: str) -> int:
        """Approximate token count.

        Uses a rough heuristic of ~4 characters per token for English text.
        For precise counts, use tiktoken when available.
        """
        return len(text) // 4
