"""E2B sandbox management stub.

Manages sandbox lifecycle: creation, code execution, file upload, and teardown.
Sandbox timeout: configurable (default 300s).
Code execution deadline: 45s per chunk.
"""

from raccoon_runtime.config import Settings


class E2BSandboxManager:
    """Manages E2B sandbox lifecycle."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._active_sandboxes: dict[str, dict] = {}

    async def create_sandbox(self, conversation_id: str, template: str = "python") -> dict:
        """Provision a new E2B sandbox for a conversation."""
        raise NotImplementedError("E2BSandboxManager.create_sandbox not yet implemented")

    async def execute_code(
        self, sandbox_id: str, code: str, language: str = "python"
    ) -> None:
        """Execute code inside an existing sandbox with streaming output."""
        raise NotImplementedError("E2BSandboxManager.execute_code not yet implemented")

    async def destroy_sandbox(self, sandbox_id: str) -> None:
        """Tear down a sandbox and release resources."""
        raise NotImplementedError("E2BSandboxManager.destroy_sandbox not yet implemented")
