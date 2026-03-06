"""Tests for the AgentService servicer."""

from wai_agents_runtime.config import Settings
from wai_agents_runtime.runners.runner_factory import RunnerFactory
from wai_agents_runtime.services.agent_service import AgentServiceServicer


class TestAgentServiceServicer:
    def test_init(self):
        settings = Settings()
        service = AgentServiceServicer(settings)
        assert service.factory is not None
        assert isinstance(service.factory, RunnerFactory)
        assert service.settings is settings
        assert service._active_runners == {}

    def test_factory_uses_settings(self):
        settings = Settings(default_model="gpt-5.2", anthropic_api_key="test")
        service = AgentServiceServicer(settings)
        assert service.factory.settings.default_model == "gpt-5.2"
