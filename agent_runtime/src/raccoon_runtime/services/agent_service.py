"""AgentService gRPC implementation.

Handles agent execution requests via gRPC streaming.
Routes to the appropriate runner based on execution_mode.
Deadline policy: 60s per turn (configurable by deployment).
"""

import asyncio
import sys
from typing import Any

import grpc
import structlog
from google.protobuf import struct_pb2

from raccoon_runtime.config import Settings
from raccoon_runtime.generated.raccoon.agent.v1 import agent_service_pb2 as pb2
from raccoon_runtime.runners.base_runner import AgentEvent, BaseAgentRunner
from raccoon_runtime.runners.runner_factory import RunnerFactory

logger = structlog.get_logger()

# Built-in MCP server definitions keyed by capability name.
# Agents can reference these by name (e.g., {"name": "memory"}) and
# the service auto-fills the command/args for stdio transport.
BUILTIN_MCP_SERVERS: dict[str, dict[str, Any]] = {
    "memory": {
        "name": "memory",
        "transport": "stdio",
        "command": sys.executable,
        "args": ["-m", "raccoon_runtime.mcp.memory_server"],
        "env": {},
    },
    "web_search": {
        "name": "web_search",
        "transport": "stdio",
        "command": sys.executable,
        "args": ["-m", "raccoon_runtime.mcp.web_search_server"],
        "env": {},
    },
    "code_exec": {
        "name": "code_exec",
        "transport": "stdio",
        "command": sys.executable,
        "args": ["-m", "raccoon_runtime.mcp.code_exec_server"],
        "env": {},
    },
    "filesystem": {
        "name": "filesystem",
        "transport": "stdio",
        "command": sys.executable,
        "args": ["-m", "raccoon_runtime.mcp.filesystem_server"],
        "env": {},
    },
}


def _resolve_builtin_mcp(
    mcp_configs: list[dict[str, Any]],
    conversation_id: str,
    agent_id: str,
    user_id: str,
) -> list[dict[str, Any]]:
    """Resolve built-in MCP server names to full configs.

    If a config has a name matching a built-in but no command, fill in
    the command/args from the registry. Injects context env vars.
    """
    resolved = []
    for cfg in mcp_configs:
        name = cfg.get("name", "")
        # If this is a built-in name and has no command set, auto-fill
        if name in BUILTIN_MCP_SERVERS and not cfg.get("command"):
            builtin = BUILTIN_MCP_SERVERS[name].copy()
            # Inject context env vars for built-in servers
            builtin["env"] = {
                "RACCOON_AGENT_ID": agent_id,
                "RACCOON_USER_ID": user_id,
                "RACCOON_CONVERSATION_ID": conversation_id,
            }
            # Merge any extra env from the user config
            builtin["env"].update(cfg.get("env", {}))
            resolved.append(builtin)
            logger.info("resolved_builtin_mcp", name=name)
        else:
            resolved.append(cfg)
    return resolved


def _dict_to_struct(d: dict[str, Any]) -> struct_pb2.Struct:
    """Convert a Python dict to a google.protobuf.Struct."""
    s = struct_pb2.Struct()
    s.update(d)
    return s


def _event_to_response(event: AgentEvent) -> pb2.AgentResponse:
    """Convert an AgentEvent to a protobuf AgentResponse."""
    data = event.data

    match event.type:
        case "token":
            return pb2.AgentResponse(
                token=pb2.TokenEvent(text=data.get("text", ""))
            )
        case "status":
            return pb2.AgentResponse(
                status=pb2.StatusEvent(
                    message=data.get("message", ""),
                    category=data.get("category", ""),
                )
            )
        case "tool_call":
            return pb2.AgentResponse(
                tool_call=pb2.ToolCallEvent(
                    tool_call_id=data.get("request_id", ""),
                    tool_name=data.get("tool_name", ""),
                    arguments=_dict_to_struct(data.get("arguments", {})),
                )
            )
        case "tool_result":
            return pb2.AgentResponse(
                tool_result=pb2.ToolResultEvent(
                    tool_call_id=data.get("request_id", ""),
                    tool_name=data.get("tool_name", ""),
                    success=not data.get("is_error", False),
                    output=data.get("result", ""),
                    error_message=data.get("result", "") if data.get("is_error") else "",
                )
            )
        case "code_block":
            return pb2.AgentResponse(
                code_block=pb2.CodeBlockEvent(
                    language=data.get("language", ""),
                    code=data.get("code", ""),
                    filename=data.get("filename", ""),
                )
            )
        case "error":
            return pb2.AgentResponse(
                error=pb2.ErrorEvent(
                    code=data.get("code", ""),
                    message=data.get("message", ""),
                    recoverable=data.get("retryable", False),
                )
            )
        case "approval_requested":
            return pb2.AgentResponse(
                approval_request=pb2.ApprovalRequestEvent(
                    approval_id=data.get("request_id", ""),
                    tool_name=data.get("tool_name", ""),
                    arguments=_dict_to_struct(data.get("arguments_preview", {})),
                    reason=data.get("reason", "Tool requires approval before execution"),
                )
            )
        case "complete":
            return pb2.AgentResponse(
                complete=pb2.CompleteEvent(
                    input_tokens=data.get("prompt_tokens", 0),
                    output_tokens=data.get("completion_tokens", 0),
                    model=data.get("model", ""),
                    stop_reason=data.get("stop_reason", "end_turn"),
                )
            )
        case _:
            logger.warning("unknown_event_type", event_type=event.type)
            return pb2.AgentResponse(
                status=pb2.StatusEvent(
                    message=f"Unknown event: {event.type}",
                    category="internal",
                )
            )


class AgentServiceServicer:
    """Handles agent execution requests via gRPC streaming."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.factory = RunnerFactory(settings)
        self._active_runners: dict[str, BaseAgentRunner] = {}
        self._runners_lock = asyncio.Lock()

    async def ExecuteAgent(  # noqa: N802
        self,
        request: pb2.AgentRequest,
        context: grpc.aio.ServicerContext,
    ) -> Any:
        """Execute an agent with streaming response.

        Routes to the appropriate runner based on execution_mode.
        Streams AgentResponse events back to the Elixir client.
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

        # Determine execution mode
        mode = config.execution_mode or "raw"

        # Create runner (pass model for auto-detection when mode is "raw")
        model = config.model or self.settings.default_model
        runner = self.factory.create(mode, user_api_key or None, model=model)
        async with self._runners_lock:
            self._active_runners[conversation_id] = runner

        try:
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
                    "deadline_seconds": self.settings.agent_turn_deadline,
                }

            # Convert proto ToolConfig to list of dicts
            tool_dicts = []
            for tool in config.tools:
                tool_dicts.append({
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": dict(tool.input_schema) if tool.HasField("input_schema") else {},
                    "requires_approval": tool.requires_approval,
                })

            # Convert proto MCPServerConfig to list of dicts
            mcp_configs = [
                {
                    "name": s.name,
                    "transport": s.transport,
                    "command": s.command,
                    "args": list(s.args),
                    "url": s.url,
                    "env": dict(s.env),
                    "headers": dict(s.headers),
                }
                for s in config.mcp_servers
            ]

            # Resolve built-in MCP servers (e.g., {"name": "memory"} → full config)
            mcp_configs = _resolve_builtin_mcp(
                mcp_configs,
                conversation_id=conversation_id,
                agent_id=agent_id,
                user_id="",  # user_id not in proto; context env is best-effort
            )

            # Stream events from runner
            async for event in runner.execute(
                messages=msg_dicts,
                config=config_dict,
                tools=tool_dicts,
                mcp_servers=mcp_configs,
            ):
                yield _event_to_response(event)

        finally:
            async with self._runners_lock:
                self._active_runners.pop(conversation_id, None)

    async def SubmitApproval(  # noqa: N802
        self,
        request: pb2.ApprovalDecision,
        context: grpc.aio.ServicerContext,
    ) -> pb2.ApprovalAck:
        """Submit an approval decision to a running execution."""
        async with self._runners_lock:
            runner = self._active_runners.get(request.conversation_id)
        if not runner:
            return pb2.ApprovalAck(
                accepted=False,
                error="No active execution for conversation",
            )

        try:
            await runner.submit_approval(
                request.request_id,
                request.approved,
                request.scope,
            )
            return pb2.ApprovalAck(accepted=True)
        except ValueError as e:
            return pb2.ApprovalAck(accepted=False, error=str(e))

    async def CheckHealth(  # noqa: N802
        self,
        request: pb2.HealthCheckRequest,
        context: grpc.aio.ServicerContext,
    ) -> pb2.HealthCheckResponse:
        """Return health status of the agent runtime."""
        async with self._runners_lock:
            active_count = len(self._active_runners)

        return pb2.HealthCheckResponse(
            status="serving",
            version="0.1.0",
            active_executions=active_count,
            anthropic_key_set=bool(self.settings.anthropic_api_key),
            openai_key_set=bool(self.settings.openai_api_key),
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
