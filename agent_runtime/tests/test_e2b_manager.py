"""Tests for the E2B sandbox manager."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from raccoon_runtime.config import Settings
from raccoon_runtime.sandbox.e2b_manager import E2BSandboxManager


class TestE2BSandboxManager:
    def _make_settings(self, **overrides):
        defaults = {"e2b_api_key": "test-key"}
        defaults.update(overrides)
        return Settings(**defaults)

    def _make_mock_sandbox(self, sandbox_id: str = "sbx_test_123"):
        """Create a mock AsyncSandbox instance."""
        mock = AsyncMock()
        mock.sandbox_id = sandbox_id
        mock.kill = AsyncMock(return_value=True)
        mock.files = MagicMock()
        mock.files.write = AsyncMock()
        return mock

    @pytest.mark.asyncio
    @patch("raccoon_runtime.sandbox.e2b_manager.AsyncSandbox")
    async def test_create_sandbox(self, mock_sandbox_cls):
        mock_instance = self._make_mock_sandbox("sbx_conv_123")
        mock_sandbox_cls.create = AsyncMock(return_value=mock_instance)

        mgr = E2BSandboxManager(self._make_settings())
        info = await mgr.create_sandbox("conv_123")
        assert info["sandbox_id"] == "sbx_conv_123"
        assert info["status"] == "ready"
        assert info["template"] == "python"
        assert info["conversation_id"] == "conv_123"
        assert mgr.active_count == 1

        mock_sandbox_cls.create.assert_awaited_once_with(
            template="python",
            timeout=300,
            api_key="test-key",
        )

    @pytest.mark.asyncio
    async def test_create_sandbox_no_api_key(self):
        mgr = E2BSandboxManager(Settings(e2b_api_key=""))
        with pytest.raises(ValueError, match="E2B API key not configured"):
            await mgr.create_sandbox("conv_123")

    @pytest.mark.asyncio
    @patch("raccoon_runtime.sandbox.e2b_manager.AsyncSandbox")
    async def test_create_sandbox_custom_template(self, mock_sandbox_cls):
        mock_instance = self._make_mock_sandbox("sbx_node_123")
        mock_sandbox_cls.create = AsyncMock(return_value=mock_instance)

        mgr = E2BSandboxManager(self._make_settings())
        info = await mgr.create_sandbox("conv_123", template="node")
        assert info["template"] == "node"

        mock_sandbox_cls.create.assert_awaited_once_with(
            template="node",
            timeout=300,
            api_key="test-key",
        )

    @pytest.mark.asyncio
    @patch("raccoon_runtime.sandbox.e2b_manager.AsyncSandbox")
    async def test_destroy_sandbox(self, mock_sandbox_cls):
        mock_instance = self._make_mock_sandbox("sbx_destroy_test")
        mock_sandbox_cls.create = AsyncMock(return_value=mock_instance)

        mgr = E2BSandboxManager(self._make_settings())
        info = await mgr.create_sandbox("conv_123")
        assert mgr.active_count == 1
        await mgr.destroy_sandbox(info["sandbox_id"])
        assert mgr.active_count == 0
        mock_instance.kill.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_destroy_nonexistent(self):
        """Destroying a non-existent sandbox should not raise."""
        mgr = E2BSandboxManager(self._make_settings())
        await mgr.destroy_sandbox("sbx_nonexistent")

    @pytest.mark.asyncio
    @patch("raccoon_runtime.sandbox.e2b_manager.AsyncSandbox")
    async def test_destroy_all(self, mock_sandbox_cls):
        mock1 = self._make_mock_sandbox("sbx_1")
        mock2 = self._make_mock_sandbox("sbx_2")
        mock_sandbox_cls.create = AsyncMock(side_effect=[mock1, mock2])

        mgr = E2BSandboxManager(self._make_settings())
        await mgr.create_sandbox("conv_1")
        await mgr.create_sandbox("conv_2")
        assert mgr.active_count == 2
        await mgr.destroy_all()
        assert mgr.active_count == 0

    @pytest.mark.asyncio
    @patch("raccoon_runtime.sandbox.e2b_manager.AsyncSandbox")
    async def test_execute_code(self, mock_sandbox_cls):
        mock_instance = self._make_mock_sandbox("sbx_exec_test")
        mock_sandbox_cls.create = AsyncMock(return_value=mock_instance)

        # Create a mock Execution result
        mock_execution = MagicMock()
        mock_execution.error = None
        mock_execution.text = "hello"
        mock_instance.run_code = AsyncMock(return_value=mock_execution)

        mgr = E2BSandboxManager(self._make_settings())
        info = await mgr.create_sandbox("conv_123")

        events = []
        async for event in mgr.execute_code(info["sandbox_id"], "print('hello')"):
            events.append(event)

        # Should have at least a result event
        assert any(e["type"] == "result" for e in events)
        result_event = next(e for e in events if e["type"] == "result")
        assert result_event["output"] == "hello"

    @pytest.mark.asyncio
    async def test_execute_code_unknown_sandbox(self):
        mgr = E2BSandboxManager(self._make_settings())
        with pytest.raises(ValueError, match="Sandbox not found"):
            async for _ in mgr.execute_code("sbx_nonexistent", "code"):
                pass

    @pytest.mark.asyncio
    @patch("raccoon_runtime.sandbox.e2b_manager.AsyncSandbox")
    async def test_execute_code_with_error(self, mock_sandbox_cls):
        mock_instance = self._make_mock_sandbox("sbx_err_test")
        mock_sandbox_cls.create = AsyncMock(return_value=mock_instance)

        # Create a mock Execution result with error
        mock_execution = MagicMock()
        mock_error = MagicMock()
        mock_error.name = "NameError"
        mock_error.value = "name 'x' is not defined"
        mock_error.traceback = "Traceback..."
        mock_execution.error = mock_error
        mock_execution.text = None
        mock_instance.run_code = AsyncMock(return_value=mock_execution)

        mgr = E2BSandboxManager(self._make_settings())
        info = await mgr.create_sandbox("conv_123")

        events = []
        async for event in mgr.execute_code(info["sandbox_id"], "print(x)"):
            events.append(event)

        assert any(e["type"] == "error" for e in events)
        error_event = next(e for e in events if e["type"] == "error")
        assert error_event["code"] == "NameError"

    @pytest.mark.asyncio
    @patch("raccoon_runtime.sandbox.e2b_manager.AsyncSandbox")
    async def test_upload_file(self, mock_sandbox_cls):
        mock_instance = self._make_mock_sandbox("sbx_upload_test")
        mock_sandbox_cls.create = AsyncMock(return_value=mock_instance)

        mgr = E2BSandboxManager(self._make_settings())
        info = await mgr.create_sandbox("conv_123")
        result = await mgr.upload_file(info["sandbox_id"], "/app/test.py", b"hello")
        assert result["path"] == "/app/test.py"
        assert result["size_bytes"] == 5
        mock_instance.files.write.assert_awaited_once_with("/app/test.py", b"hello")

    @pytest.mark.asyncio
    async def test_upload_file_unknown_sandbox(self):
        mgr = E2BSandboxManager(self._make_settings())
        with pytest.raises(ValueError, match="Sandbox not found"):
            await mgr.upload_file("sbx_nonexistent", "/test.py", b"hello")

    @pytest.mark.asyncio
    @patch("raccoon_runtime.sandbox.e2b_manager.AsyncSandbox")
    async def test_get_sandbox(self, mock_sandbox_cls):
        mock_instance = self._make_mock_sandbox("sbx_get_test")
        mock_sandbox_cls.create = AsyncMock(return_value=mock_instance)

        mgr = E2BSandboxManager(self._make_settings())
        info = await mgr.create_sandbox("conv_123")
        fetched = mgr.get_sandbox(info["sandbox_id"])
        assert fetched is not None
        assert fetched["conversation_id"] == "conv_123"

    @pytest.mark.asyncio
    async def test_get_sandbox_nonexistent(self):
        mgr = E2BSandboxManager(self._make_settings())
        assert mgr.get_sandbox("sbx_nonexistent") is None
