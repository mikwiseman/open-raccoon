"""Tests for the SandboxService servicer."""

from raccoon_runtime.config import Settings
from raccoon_runtime.services.sandbox_service import SandboxServiceServicer


class TestSandboxServiceServicer:
    def test_init(self):
        settings = Settings(e2b_api_key="test-key")
        service = SandboxServiceServicer(settings)
        assert service.sandbox_manager is not None
        assert service.settings is settings

    def test_sandbox_manager_uses_settings(self):
        settings = Settings(e2b_api_key="test-key", sandbox_timeout=600)
        service = SandboxServiceServicer(settings)
        assert service.sandbox_manager.settings.sandbox_timeout == 600
