"""E2B sandbox management for code execution.

Manages sandbox lifecycle: creation, code execution, file upload, and teardown.
Sandbox timeout: configurable (default 300s).
Code execution deadline: 45s per chunk.
"""

from collections.abc import AsyncIterator
from typing import Any

import structlog

from raccoon_runtime.config import Settings

logger = structlog.get_logger()


class E2BSandboxManager:
    """Manages E2B sandbox lifecycle and code execution."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._active_sandboxes: dict[str, dict[str, Any]] = {}

    async def create_sandbox(
        self,
        conversation_id: str,
        template: str = "python",
        limits: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Create a new E2B sandbox.

        Args:
            conversation_id: ID of the conversation this sandbox belongs to.
            template: Sandbox template (e.g. "python", "node", "react").
            limits: Resource limits override.

        Returns:
            Sandbox info dict with sandbox_id, status, template, etc.

        Raises:
            ValueError: If E2B API key is not configured.
        """
        if not self.settings.e2b_api_key:
            raise ValueError("E2B API key not configured")

        sandbox_limits = limits or {
            "cpu_count": 2,
            "memory_mb": 512,
            "timeout_seconds": self.settings.sandbox_timeout,
            "network_enabled": True,
        }

        logger.info(
            "creating_sandbox",
            conversation_id=conversation_id,
            template=template,
        )

        # In production with a real E2B API key:
        # from e2b_code_interpreter import AsyncSandbox
        # sandbox = await AsyncSandbox.create(
        #     template=template,
        #     api_key=self.settings.e2b_api_key,
        # )
        # sandbox_id = sandbox.sandbox_id

        sandbox_id = f"sbx_{conversation_id[:8]}"
        sandbox_info: dict[str, Any] = {
            "sandbox_id": sandbox_id,
            "status": "ready",
            "template": template,
            "conversation_id": conversation_id,
            "limits": sandbox_limits,
        }
        self._active_sandboxes[sandbox_id] = sandbox_info

        logger.info("sandbox_created", sandbox_id=sandbox_id, template=template)
        return sandbox_info

    async def execute_code(
        self,
        sandbox_id: str,
        code: str,
        language: str = "python",
    ) -> AsyncIterator[dict[str, Any]]:
        """Execute code in a sandbox with streaming output.

        Args:
            sandbox_id: ID of the sandbox to execute in.
            code: Source code to execute.
            language: Programming language (e.g. "python", "javascript", "bash").

        Yields:
            Output event dicts:
            - {"type": "stdout", "text": "..."}
            - {"type": "stderr", "text": "..."}
            - {"type": "result", "output": "...", "files": [...], "exit_code": int}

        Raises:
            ValueError: If sandbox not found.
        """
        if sandbox_id not in self._active_sandboxes:
            raise ValueError(f"Sandbox not found: {sandbox_id}")

        logger.info(
            "executing_code",
            sandbox_id=sandbox_id,
            language=language,
            code_length=len(code),
        )

        # In production with a real sandbox instance:
        # sandbox = self._active_sandboxes[sandbox_id]["instance"]
        # execution = await sandbox.run_code(code)
        # for line in execution.logs.stdout:
        #     yield {"type": "stdout", "text": line}
        # for line in execution.logs.stderr:
        #     yield {"type": "stderr", "text": line}

        yield {
            "type": "stdout",
            "text": f"[Sandbox {sandbox_id}] Code execution placeholder\n",
        }
        yield {
            "type": "result",
            "output": "Execution completed (stub)",
            "files": [],
            "exit_code": 0,
            "duration_ms": 0.0,
        }

    async def upload_file(
        self,
        sandbox_id: str,
        path: str,
        content: bytes,
    ) -> dict[str, Any]:
        """Upload a file to a sandbox.

        Args:
            sandbox_id: ID of the target sandbox.
            path: Destination path within the sandbox.
            content: File content as bytes.

        Returns:
            Dict with path and size_bytes.

        Raises:
            ValueError: If sandbox not found.
        """
        if sandbox_id not in self._active_sandboxes:
            raise ValueError(f"Sandbox not found: {sandbox_id}")

        logger.info(
            "uploading_file",
            sandbox_id=sandbox_id,
            path=path,
            size_bytes=len(content),
        )

        # In production:
        # sandbox = self._active_sandboxes[sandbox_id]["instance"]
        # await sandbox.files.write(path, content)

        return {"path": path, "size_bytes": len(content)}

    async def destroy_sandbox(self, sandbox_id: str) -> None:
        """Destroy a sandbox and clean up resources.

        Args:
            sandbox_id: ID of the sandbox to destroy.
        """
        if sandbox_id in self._active_sandboxes:
            logger.info("destroying_sandbox", sandbox_id=sandbox_id)
            # In production:
            # sandbox = self._active_sandboxes[sandbox_id]["instance"]
            # await sandbox.close()
            del self._active_sandboxes[sandbox_id]

    async def destroy_all(self) -> None:
        """Destroy all active sandboxes."""
        sandbox_ids = list(self._active_sandboxes.keys())
        for sid in sandbox_ids:
            await self.destroy_sandbox(sid)

    def get_sandbox(self, sandbox_id: str) -> dict[str, Any] | None:
        """Get sandbox info by ID, or None if not found."""
        return self._active_sandboxes.get(sandbox_id)

    @property
    def active_count(self) -> int:
        """Return number of active sandboxes."""
        return len(self._active_sandboxes)
