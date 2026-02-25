"""SandboxService gRPC implementation.

Handles E2B sandbox lifecycle and code execution.
Deadline policy: 45s per execution chunk.
"""

import asyncio
from typing import Any

import grpc
import structlog
from google.protobuf import empty_pb2

from raccoon_runtime.config import Settings
from raccoon_runtime.generated.raccoon.agent.v1 import agent_service_pb2 as pb2
from raccoon_runtime.sandbox.e2b_manager import E2BSandboxManager

logger = structlog.get_logger()


class SandboxServiceServicer:
    """Handles sandbox lifecycle and code execution."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.sandbox_manager = E2BSandboxManager(settings)

    async def CreateSandbox(  # noqa: N802
        self,
        request: pb2.CreateSandboxRequest,
        context: grpc.aio.ServicerContext,
    ) -> pb2.SandboxInfo:
        """Provision a new E2B sandbox for a conversation."""
        conversation_id = request.conversation_id
        template = request.template or "python"

        limits_proto = request.limits if request.HasField("limits") else None
        limits: dict[str, Any] | None = None
        if limits_proto:
            limits = {
                "cpu_count": limits_proto.max_cpu or 2,
                "memory_mb": limits_proto.max_memory_mb or 512,
                "timeout_seconds": limits_proto.timeout_seconds or self.settings.sandbox_timeout,
            }

        logger.info(
            "create_sandbox_request",
            conversation_id=conversation_id,
            template=template,
        )

        sandbox_info = await self.sandbox_manager.create_sandbox(
            conversation_id=conversation_id,
            template=template,
            limits=limits,
        )

        # Build SandboxLimits protobuf if limits are available
        limits_data = sandbox_info.get("limits", {})
        sandbox_limits = pb2.SandboxLimits(
            max_cpu=limits_data.get("cpu_count", 2),
            max_memory_mb=limits_data.get("memory_mb", 512),
            timeout_seconds=limits_data.get("timeout_seconds", self.settings.sandbox_timeout),
        )

        return pb2.SandboxInfo(
            sandbox_id=sandbox_info["sandbox_id"],
            conversation_id=sandbox_info["conversation_id"],
            template=sandbox_info["template"],
            status=sandbox_info["status"],
            limits=sandbox_limits,
        )

    async def ExecuteCode(  # noqa: N802
        self,
        request: pb2.ExecuteCodeRequest,
        context: grpc.aio.ServicerContext,
    ) -> Any:
        """Run code inside a sandbox with streaming output.

        Default deadline: 45s per execution chunk.
        """
        sandbox_id = request.sandbox_id
        code = request.code
        language = request.language or "python"
        timeout = request.timeout_seconds or self.settings.code_execution_deadline

        logger.info(
            "execute_code_request",
            sandbox_id=sandbox_id,
            language=language,
            timeout=timeout,
        )

        try:
            async with asyncio.timeout(timeout):
                async for output_event in self.sandbox_manager.execute_code(
                    sandbox_id=sandbox_id,
                    code=code,
                    language=language,
                ):
                    event_type = output_event.get("type")

                    if event_type == "stdout":
                        yield pb2.ExecutionOutput(stdout=output_event["text"])

                    elif event_type == "stderr":
                        yield pb2.ExecutionOutput(stderr=output_event["text"])

                    elif event_type == "result":
                        output_files = []
                        for f in output_event.get("files", []):
                            output_files.append(pb2.OutputFile(
                                path=f.get("path", ""),
                                mime_type=f.get("mime_type", ""),
                                data=f.get("data", b""),
                            ))
                        yield pb2.ExecutionOutput(
                            result=pb2.ExecutionResult(
                                exit_code=output_event.get("exit_code", 0),
                                output=output_event.get("output", ""),
                                files=output_files,
                            )
                        )

                    elif event_type == "error":
                        yield pb2.ExecutionOutput(
                            error=pb2.ExecutionError(
                                code=output_event.get("code", "execution_error"),
                                message=output_event.get("message", ""),
                            )
                        )

        except TimeoutError:
            yield pb2.ExecutionOutput(
                error=pb2.ExecutionError(
                    code="execution_timeout",
                    message=f"Code execution exceeded {timeout}s deadline",
                )
            )

    async def UploadFile(  # noqa: N802
        self,
        request: pb2.UploadFileRequest,
        context: grpc.aio.ServicerContext,
    ) -> pb2.UploadFileResponse:
        """Upload a file into a sandbox."""
        sandbox_id = request.sandbox_id
        path = request.path
        data = request.data

        logger.info(
            "upload_file_request",
            sandbox_id=sandbox_id,
            path=path,
            size_bytes=len(data),
        )

        result = await self.sandbox_manager.upload_file(
            sandbox_id=sandbox_id,
            path=path,
            content=data,
        )

        return pb2.UploadFileResponse(
            path=result["path"],
            size_bytes=result["size_bytes"],
        )

    async def DestroySandbox(  # noqa: N802
        self,
        request: pb2.DestroySandboxRequest,
        context: grpc.aio.ServicerContext,
    ) -> empty_pb2.Empty:
        """Tear down a sandbox and release resources."""
        sandbox_id = request.sandbox_id

        logger.info("destroy_sandbox_request", sandbox_id=sandbox_id)
        await self.sandbox_manager.destroy_sandbox(sandbox_id)

        return empty_pb2.Empty()
