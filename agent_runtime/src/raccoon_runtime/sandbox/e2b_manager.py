"""E2B sandbox management for code execution.

Manages sandbox lifecycle: creation, code execution, file upload, and teardown.
Sandbox timeout: configurable (default 300s).
Code execution deadline: 45s per chunk.
"""

import asyncio
from collections.abc import AsyncIterator
from typing import Any

import structlog
from e2b_code_interpreter import AsyncSandbox

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

        timeout = sandbox_limits.get("timeout_seconds", self.settings.sandbox_timeout)

        sandbox = await AsyncSandbox.create(
            template=template,
            timeout=timeout,
            api_key=self.settings.e2b_api_key,
        )

        sandbox_id = sandbox.sandbox_id
        sandbox_info: dict[str, Any] = {
            "sandbox_id": sandbox_id,
            "status": "ready",
            "template": template,
            "conversation_id": conversation_id,
            "limits": sandbox_limits,
            "instance": sandbox,
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
            - {"type": "error", "code": "...", "message": "..."}

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

        sandbox_entry = self._active_sandboxes[sandbox_id]
        sandbox: AsyncSandbox = sandbox_entry["instance"]

        # Collect stdout/stderr via callbacks using asyncio.Queue
        output_queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()

        def on_stdout(msg: Any) -> None:
            output_queue.put_nowait({"type": "stdout", "text": str(msg)})

        def on_stderr(msg: Any) -> None:
            output_queue.put_nowait({"type": "stderr", "text": str(msg)})

        # Run code execution in a task so we can yield output as it arrives
        execution_task = asyncio.create_task(
            sandbox.run_code(
                code,
                language=language,
                on_stdout=on_stdout,
                on_stderr=on_stderr,
            )
        )

        # Yield output events as they arrive
        while not execution_task.done():
            try:
                event = await asyncio.wait_for(output_queue.get(), timeout=0.1)
                yield event
            except TimeoutError:
                continue

        # Drain any remaining events in the queue
        while not output_queue.empty():
            yield output_queue.get_nowait()

        # Get the execution result
        execution = execution_task.result()

        if execution.error:
            yield {
                "type": "error",
                "code": execution.error.name,
                "message": f"{execution.error.value}\n{execution.error.traceback}",
            }
        else:
            # Gather result text from all results
            result_text = execution.text or ""
            yield {
                "type": "result",
                "output": result_text,
                "files": [],
                "exit_code": 0,
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

        sandbox_entry = self._active_sandboxes[sandbox_id]
        sandbox: AsyncSandbox = sandbox_entry["instance"]

        await sandbox.files.write(path, content)

        return {"path": path, "size_bytes": len(content)}

    async def destroy_sandbox(self, sandbox_id: str) -> None:
        """Destroy a sandbox and clean up resources.

        Args:
            sandbox_id: ID of the sandbox to destroy.
        """
        if sandbox_id in self._active_sandboxes:
            logger.info("destroying_sandbox", sandbox_id=sandbox_id)
            sandbox_entry = self._active_sandboxes[sandbox_id]
            sandbox: AsyncSandbox = sandbox_entry["instance"]
            await sandbox.kill()
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
