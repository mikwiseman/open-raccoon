"""Main LLM orchestration logic.

The orchestrator routes requests to the appropriate LLM provider,
manages tool execution, and emits status messages during processing.
"""

import asyncio
from collections.abc import AsyncIterator
from typing import Any

import structlog

from raccoon_runtime.config import Settings
from raccoon_runtime.llm.providers.anthropic_provider import AnthropicProvider
from raccoon_runtime.llm.providers.base import BaseLLMProvider
from raccoon_runtime.llm.providers.openai_provider import OpenAIProvider
from raccoon_runtime.mcp.tool_registry import ToolRegistry
from raccoon_runtime.status_messages import StatusMessageBank

logger = structlog.get_logger()


class LLMOrchestrator:
    """Orchestrates LLM calls, tool execution, and status messages."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.status_bank = StatusMessageBank()
        self.tool_registry = ToolRegistry()
        self._providers: dict[str, BaseLLMProvider] = {}
        # Approval flow: maps request_id -> (event, decision)
        self._pending_approvals: dict[str, tuple[asyncio.Event, dict[str, Any]]] = {}

    def get_provider(self, model: str) -> BaseLLMProvider:
        """Get or create a provider for the given model.

        Args:
            model: Model name (e.g. "claude-sonnet-4-6", "gpt-5.2").

        Returns:
            The appropriate LLM provider instance.

        Raises:
            ValueError: If the model prefix is not recognized.
        """
        if model.startswith("claude"):
            key = "anthropic"
            if key not in self._providers:
                self._providers[key] = AnthropicProvider(self.settings.anthropic_api_key)
            return self._providers[key]
        elif model.startswith("gpt"):
            key = "openai"
            if key not in self._providers:
                self._providers[key] = OpenAIProvider(self.settings.openai_api_key)
            return self._providers[key]
        else:
            raise ValueError(f"Unknown model: {model}")

    def submit_approval_decision(
        self,
        request_id: str,
        approved: bool,
        scope: str = "allow_once",
    ) -> None:
        """Submit an approval decision for a pending tool execution.

        Args:
            request_id: The request_id from the approval_requested event.
            approved: Whether the tool execution is approved.
            scope: Approval scope ("allow_once", "allow_for_session", "always_for_agent_tool").
        """
        if request_id not in self._pending_approvals:
            raise ValueError(f"No pending approval for request_id: {request_id}")

        event, decision = self._pending_approvals[request_id]
        decision["approved"] = approved
        decision["scope"] = scope
        event.set()

    async def execute(
        self,
        messages: list[dict[str, str]],
        config: dict[str, Any],
        api_key: str | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Execute an agent turn with streaming.

        Yields events:
        - {"type": "status", "message": "...", "category": "..."}
        - {"type": "token", "text": "..."}
        - {"type": "tool_call", "request_id": "...", "tool_name": "...", "arguments": {...}}
        - {"type": "tool_result", "request_id": "...", "result": "...", "is_error": bool}
        - {"type": "code_block", "language": "...", "code": "...", "filename": "..."}
        - {"type": "approval_requested", ...}
        - {"type": "awaiting_approval", "request_id": "..."}
        - {"type": "complete", "total_tokens": int, "prompt_tokens": int,
           "completion_tokens": int}
        - {"type": "error", "code": "...", "message": "...", "retryable": bool}
        """
        model = config.get("model", self.settings.default_model)

        # Use BYOK key if provided, otherwise use default provider
        provider = self.get_provider(model)
        if api_key and model.startswith("claude"):
            provider = AnthropicProvider(api_key)
        elif api_key and model.startswith("gpt"):
            provider = OpenAIProvider(api_key)

        # Emit initial status
        yield {
            "type": "status",
            "message": self.status_bank.get_message("thinking"),
            "category": "thinking",
        }

        try:
            deadline = config.get("deadline_seconds", self.settings.agent_turn_deadline)

            async with asyncio.timeout(deadline):
                code_buffer = ""
                in_code_block = False
                code_language = ""

                async for event in provider.stream_completion(messages, config):
                    if event["type"] == "token":
                        text = event["text"]

                        # Detect code blocks in streaming text
                        code_buffer += text
                        if "```" in code_buffer and not in_code_block:
                            parts = code_buffer.split("```", 1)
                            if len(parts) > 1:
                                lang_line = parts[1].split("\n", 1)
                                code_language = (
                                    lang_line[0].strip() if lang_line[0].strip() else "text"
                                )
                                in_code_block = True
                                code_buffer = lang_line[1] if len(lang_line) > 1 else ""
                        elif "```" in code_buffer and in_code_block:
                            parts = code_buffer.split("```", 1)
                            code_content = parts[0]
                            remaining = parts[1] if len(parts) > 1 else ""
                            yield {
                                "type": "code_block",
                                "language": code_language,
                                "code": code_content,
                                "filename": "",
                            }
                            in_code_block = False
                            code_buffer = remaining

                        yield {"type": "token", "text": text}

                    elif event["type"] == "tool_use":
                        tool_name = event["name"]
                        tool_input = event["input"]
                        request_id = event["id"]

                        # Emit status for tool call
                        if "search" in tool_name.lower():
                            yield {
                                "type": "status",
                                "message": self.status_bank.get_message("searching"),
                                "category": "searching",
                            }
                        elif "code" in tool_name.lower() or "exec" in tool_name.lower():
                            yield {
                                "type": "status",
                                "message": self.status_bank.get_message("coding"),
                                "category": "coding",
                            }

                        # Check if tool requires approval
                        tool_configs = config.get("tools", [])
                        needs_approval = any(
                            t.get("requires_approval", False)
                            for t in tool_configs
                            if t["name"] == tool_name
                        )

                        if needs_approval:
                            yield {
                                "type": "approval_requested",
                                "request_id": request_id,
                                "tool_name": tool_name,
                                "arguments_preview": tool_input,
                                "available_scopes": [
                                    "allow_once",
                                    "allow_for_session",
                                    "always_for_agent_tool",
                                ],
                            }

                            # Create an asyncio.Event to pause execution until
                            # an approval decision is submitted
                            approval_event = asyncio.Event()
                            decision: dict[str, Any] = {"approved": False, "scope": ""}
                            self._pending_approvals[request_id] = (approval_event, decision)
                            try:
                                # Signal caller that we are paused waiting for approval
                                yield {
                                    "type": "awaiting_approval",
                                    "request_id": request_id,
                                }

                                # Block here until submit_approval_decision() is called
                                await approval_event.wait()
                            finally:
                                # Clean up even if timeout or cancellation occurs
                                self._pending_approvals.pop(request_id, None)

                            # If not approved, skip tool execution
                            if not decision.get("approved", False):
                                yield {
                                    "type": "tool_result",
                                    "request_id": request_id,
                                    "tool_name": tool_name,
                                    "result": "Tool execution denied by user",
                                    "is_error": True,
                                }
                                continue

                        yield {
                            "type": "tool_call",
                            "request_id": request_id,
                            "tool_name": tool_name,
                            "arguments": tool_input,
                        }

                        # Execute tool via registry
                        try:
                            async with asyncio.timeout(self.settings.tool_call_deadline):
                                result = await self.tool_registry.execute_tool(
                                    tool_name, tool_input
                                )
                                yield {
                                    "type": "tool_result",
                                    "request_id": request_id,
                                    "tool_name": tool_name,
                                    "result": str(result),
                                    "is_error": False,
                                }
                        except TimeoutError:
                            yield {
                                "type": "tool_result",
                                "request_id": request_id,
                                "tool_name": tool_name,
                                "result": "Tool execution timed out",
                                "is_error": True,
                            }
                        except Exception as e:
                            yield {
                                "type": "tool_result",
                                "request_id": request_id,
                                "tool_name": tool_name,
                                "result": str(e),
                                "is_error": True,
                            }

                    elif event["type"] == "complete":
                        usage = event.get("usage", {})
                        yield {
                            "type": "complete",
                            "message_id": "",
                            "model": model,
                            "stop_reason": event.get("stop_reason", "end_turn"),
                            "total_tokens": usage.get("total_tokens", 0),
                            "prompt_tokens": usage.get("prompt_tokens", 0),
                            "completion_tokens": usage.get("completion_tokens", 0),
                        }

        except TimeoutError:
            yield {
                "type": "error",
                "code": "deadline_exceeded",
                "message": f"Agent turn exceeded {deadline}s deadline",
                "retryable": True,
            }
        except Exception as e:
            logger.error("orchestrator_error", error=str(e))
            yield {
                "type": "error",
                "code": "internal_error",
                "message": str(e),
                "retryable": True,
            }
