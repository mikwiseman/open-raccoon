"""Tests for the AgentService servicer."""

from raccoon_runtime.config import Settings
from raccoon_runtime.services.agent_service import AgentServiceServicer


class TestAgentServiceServicer:
    def test_init(self):
        settings = Settings()
        service = AgentServiceServicer(settings)
        assert service.orchestrator is not None
        assert service.settings is settings

    def test_orchestrator_uses_settings(self):
        settings = Settings(default_model="gpt-5.2", anthropic_api_key="test")
        service = AgentServiceServicer(settings)
        assert service.orchestrator.settings.default_model == "gpt-5.2"
