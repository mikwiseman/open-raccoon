"""SandboxService gRPC implementation.

Handles E2B sandbox lifecycle and code execution.
Deadline policy: 45s per execution chunk.
"""

import asyncio
from typing import Any

import structlog

from raccoon_runtime.config import Settings
from raccoon_runtime.sandbox.e2b_manager import E2BSandboxManager

logger = structlog.get_logger()


class SandboxServiceServicer:
    """Handles sandbox lifecycle and code execution."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.sandbox_manager = E2BSandboxManager(settings)

    async def CreateSandbox(self, request: Any, context: Any) -> Any:  # noqa: N802
        """Provision a new E2B sandbox for a conversation."""
        conversation_id = getattr(request, "conversation_id", "")
        template = getattr(request, "template", "python") or "python"

        limits_proto = getattr(request, "limits", None)
        limits: dict[str, Any] | None = None
        if limits_proto:
            limits = {
                "cpu_count": getattr(limits_proto, "max_cpu", 2),
                "memory_mb": getattr(limits_proto, "max_memory_mb", 512),
                "timeout_seconds": getattr(
                    limits_proto, "timeout_seconds", self.settings.sandbox_timeout
                ),
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

        # In full implementation, return a SandboxInfo protobuf message
        return sandbox_info

    async def ExecuteCode(self, request: Any, context: Any) -> Any:  # noqa: N802
        """Run code inside a sandbox with streaming output.

        Default deadline: 45s per execution chunk.
        """
        sandbox_id = getattr(request, "sandbox_id", "")
        code = getattr(request, "code", "")
        language = getattr(request, "language", "python") or "python"
        timeout = getattr(request, "timeout_seconds", 0) or self.settings.code_execution_deadline

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
                    # In full implementation, convert to ExecutionOutput protobuf
                    yield output_event
        except TimeoutError:
            yield {
                "type": "error",
                "code": "execution_timeout",
                "message": f"Code execution exceeded {timeout}s deadline",
            }

    async def UploadFile(self, request: Any, context: Any) -> Any:  # noqa: N802
        """Upload a file into a sandbox."""
        sandbox_id = getattr(request, "sandbox_id", "")
        path = getattr(request, "path", "")
        data = getattr(request, "data", b"")

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

        # In full implementation, return UploadFileResponse protobuf
        return result

    async def DestroySandbox(self, request: Any, context: Any) -> Any:  # noqa: N802
        """Tear down a sandbox and release resources."""
        sandbox_id = getattr(request, "sandbox_id", "")

        logger.info("destroy_sandbox_request", sandbox_id=sandbox_id)
        await self.sandbox_manager.destroy_sandbox(sandbox_id)

        # Return empty response (google.protobuf.Empty equivalent)
        return {}
