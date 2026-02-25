"""Tests for the E2B sandbox manager."""

import pytest

from raccoon_runtime.config import Settings
from raccoon_runtime.sandbox.e2b_manager import E2BSandboxManager


class TestE2BSandboxManager:
    def _make_settings(self, **overrides):
        defaults = {"e2b_api_key": "test-key"}
        defaults.update(overrides)
        return Settings(**defaults)

    @pytest.mark.asyncio
    async def test_create_sandbox(self):
        mgr = E2BSandboxManager(self._make_settings())
        info = await mgr.create_sandbox("conv_123")
        assert info["sandbox_id"].startswith("sbx_")
        assert info["status"] == "ready"
        assert info["template"] == "python"
        assert info["conversation_id"] == "conv_123"
        assert mgr.active_count == 1

    @pytest.mark.asyncio
    async def test_create_sandbox_no_api_key(self):
        mgr = E2BSandboxManager(Settings(e2b_api_key=""))
        with pytest.raises(ValueError, match="E2B API key not configured"):
            await mgr.create_sandbox("conv_123")

    @pytest.mark.asyncio
    async def test_create_sandbox_custom_template(self):
        mgr = E2BSandboxManager(self._make_settings())
        info = await mgr.create_sandbox("conv_123", template="node")
        assert info["template"] == "node"

    @pytest.mark.asyncio
    async def test_destroy_sandbox(self):
        mgr = E2BSandboxManager(self._make_settings())
        info = await mgr.create_sandbox("conv_123")
        assert mgr.active_count == 1
        await mgr.destroy_sandbox(info["sandbox_id"])
        assert mgr.active_count == 0

    @pytest.mark.asyncio
    async def test_destroy_nonexistent(self):
        """Destroying a non-existent sandbox should not raise."""
        mgr = E2BSandboxManager(self._make_settings())
        await mgr.destroy_sandbox("sbx_nonexistent")

    @pytest.mark.asyncio
    async def test_destroy_all(self):
        mgr = E2BSandboxManager(self._make_settings())
        await mgr.create_sandbox("conv_1")
        await mgr.create_sandbox("conv_2")
        assert mgr.active_count == 2
        await mgr.destroy_all()
        assert mgr.active_count == 0

    @pytest.mark.asyncio
    async def test_execute_code(self):
        mgr = E2BSandboxManager(self._make_settings())
        info = await mgr.create_sandbox("conv_123")
        events = []
        async for event in mgr.execute_code(info["sandbox_id"], "print('hello')"):
            events.append(event)
        assert len(events) == 2
        assert events[0]["type"] == "stdout"
        assert events[1]["type"] == "result"
        assert events[1]["exit_code"] == 0

    @pytest.mark.asyncio
    async def test_execute_code_unknown_sandbox(self):
        mgr = E2BSandboxManager(self._make_settings())
        with pytest.raises(ValueError, match="Sandbox not found"):
            async for _ in mgr.execute_code("sbx_nonexistent", "code"):
                pass

    @pytest.mark.asyncio
    async def test_upload_file(self):
        mgr = E2BSandboxManager(self._make_settings())
        info = await mgr.create_sandbox("conv_123")
        result = await mgr.upload_file(info["sandbox_id"], "/app/test.py", b"hello")
        assert result["path"] == "/app/test.py"
        assert result["size_bytes"] == 5

    @pytest.mark.asyncio
    async def test_upload_file_unknown_sandbox(self):
        mgr = E2BSandboxManager(self._make_settings())
        with pytest.raises(ValueError, match="Sandbox not found"):
            await mgr.upload_file("sbx_nonexistent", "/test.py", b"hello")

    @pytest.mark.asyncio
    async def test_get_sandbox(self):
        mgr = E2BSandboxManager(self._make_settings())
        info = await mgr.create_sandbox("conv_123")
        fetched = mgr.get_sandbox(info["sandbox_id"])
        assert fetched is not None
        assert fetched["conversation_id"] == "conv_123"

    @pytest.mark.asyncio
    async def test_get_sandbox_nonexistent(self):
        mgr = E2BSandboxManager(self._make_settings())
        assert mgr.get_sandbox("sbx_nonexistent") is None
