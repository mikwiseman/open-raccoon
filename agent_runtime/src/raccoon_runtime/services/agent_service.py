"""AgentService gRPC implementation.

Handles agent execution requests via gRPC streaming.
Deadline policy: 60s per turn (configurable by deployment).
"""

from typing import Any

import grpc
import structlog
from google.protobuf import struct_pb2

from raccoon_runtime.config import Settings
from raccoon_runtime.generated.raccoon.agent.v1 import agent_service_pb2 as pb2
from raccoon_runtime.llm.orchestrator import LLMOrchestrator

logger = structlog.get_logger()


def _dict_to_struct(d: dict[str, Any]) -> struct_pb2.Struct:
    """Convert a Python dict to a google.protobuf.Struct."""
    s = struct_pb2.Struct()
    s.update(d)
    return s


class AgentServiceServicer:
    """Handles agent execution requests via gRPC streaming."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.orchestrator = LLMOrchestrator(settings)

    async def ExecuteAgent(  # noqa: N802
        self,
        request: pb2.AgentRequest,
        context: grpc.aio.ServicerContext,
    ) -> Any:
        """Execute an agent with streaming response.

        Streams AgentResponse events (tokens, status, tool calls, etc.)
        back to the Elixir client. Default deadline: 60s per turn.
        """
        conversation_id = request.conversation_id
        agent_id = request.agent_id
        messages = request.messages
        config = request.config
        user_api_key = request.user_api_key

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
            for tool in config.tools:
                config_dict["tools"].append({
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": dict(tool.input_schema) if tool.HasField("input_schema") else {},
                    "requires_approval": tool.requires_approval,
                })

        # Stream events from orchestrator, converting each to a protobuf AgentResponse
        async for event in self.orchestrator.execute(
            messages=msg_dicts,
            config=config_dict,
            api_key=user_api_key or None,
        ):
            event_type = event.get("type")

            if event_type == "token":
                yield pb2.AgentResponse(
                    token=pb2.TokenEvent(text=event["text"])
                )

            elif event_type == "status":
                yield pb2.AgentResponse(
                    status=pb2.StatusEvent(
                        message=event["message"],
                        category=event.get("category", ""),
                    )
                )

            elif event_type == "tool_call":
                yield pb2.AgentResponse(
                    tool_call=pb2.ToolCallEvent(
                        tool_call_id=event.get("request_id", ""),
                        tool_name=event["tool_name"],
                        arguments=_dict_to_struct(event.get("arguments", {})),
                    )
                )

            elif event_type == "tool_result":
                yield pb2.AgentResponse(
                    tool_result=pb2.ToolResultEvent(
                        tool_call_id=event.get("request_id", ""),
                        tool_name=event.get("tool_name", ""),
                        success=not event.get("is_error", False),
                        output=event.get("result", ""),
                        error_message=event.get("result", "") if event.get("is_error") else "",
                    )
                )

            elif event_type == "code_block":
                yield pb2.AgentResponse(
                    code_block=pb2.CodeBlockEvent(
                        language=event.get("language", ""),
                        code=event.get("code", ""),
                        filename=event.get("filename", ""),
                    )
                )

            elif event_type == "error":
                yield pb2.AgentResponse(
                    error=pb2.ErrorEvent(
                        code=event.get("code", ""),
                        message=event.get("message", ""),
                        recoverable=event.get("retryable", False),
                    )
                )

            elif event_type == "approval_requested":
                yield pb2.AgentResponse(
                    approval_request=pb2.ApprovalRequestEvent(
                        approval_id=event.get("request_id", ""),
                        tool_name=event.get("tool_name", ""),
                        arguments=_dict_to_struct(event.get("arguments_preview", {})),
                        reason=event.get("reason", "Tool requires approval before execution"),
                    )
                )

            elif event_type == "awaiting_approval":
                # The orchestrator is paused waiting for approval.
                # The caller should submit an approval decision via
                # orchestrator.submit_approval_decision() to resume.
                pass

            elif event_type == "complete":
                yield pb2.AgentResponse(
                    complete=pb2.CompleteEvent(
                        input_tokens=event.get("prompt_tokens", 0),
                        output_tokens=event.get("completion_tokens", 0),
                        model=event.get("model", ""),
                        stop_reason=event.get("stop_reason", "end_turn"),
                    )
                )

    async def GetAgentConfig(  # noqa: N802
        self,
        request: pb2.AgentConfigRequest,
        context: grpc.aio.ServicerContext,
    ) -> pb2.AgentConfig:
        """Get agent configuration."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details("GetAgentConfig not yet implemented")
        raise NotImplementedError("GetAgentConfig not yet implemented")

    async def ValidateTools(  # noqa: N802
        self,
        request: pb2.ValidateToolsRequest,
        context: grpc.aio.ServicerContext,
    ) -> pb2.ValidateToolsResponse:
        """Validate tool configurations."""
        errors: list[pb2.ToolValidationError] = []

        for tool in request.tools:
            if not tool.name:
                errors.append(
                    pb2.ToolValidationError(tool_name="", error="Tool name is required")
                )

        return pb2.ValidateToolsResponse(
            valid=len(errors) == 0,
            errors=errors,
        )
