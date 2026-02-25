"""SandboxService gRPC implementation stub.

Handles E2B sandbox lifecycle and code execution.
Deadline policy: 45s per execution chunk.
"""

from typing import Any

from raccoon_runtime.config import Settings


class SandboxServiceServicer:
    """Handles sandbox lifecycle and code execution."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def CreateSandbox(self, request: Any, context: Any) -> None:
        """Provision a new E2B sandbox for a conversation."""
        raise NotImplementedError("SandboxService.CreateSandbox not yet implemented")

    async def ExecuteCode(self, request: Any, context: Any) -> None:
        """Run code inside a sandbox with streaming output.

        Default deadline: 45s per execution chunk.
        """
        raise NotImplementedError("SandboxService.ExecuteCode not yet implemented")

    async def UploadFile(self, request: Any, context: Any) -> None:
        """Upload a file into a sandbox."""
        raise NotImplementedError("SandboxService.UploadFile not yet implemented")

    async def DestroySandbox(self, request: Any, context: Any) -> None:
        """Tear down a sandbox and release resources."""
        raise NotImplementedError("SandboxService.DestroySandbox not yet implemented")
