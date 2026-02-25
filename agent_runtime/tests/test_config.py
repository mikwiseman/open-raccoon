"""Tests for application configuration."""

from raccoon_runtime.config import Settings


class TestSettings:
    def test_defaults(self):
        settings = Settings()
        assert settings.grpc_port == 50051
        assert settings.max_workers == 10
        assert settings.default_model == "claude-sonnet-4-6"
        assert settings.agent_turn_deadline == 60
        assert settings.tool_call_deadline == 20
        assert settings.code_execution_deadline == 45

    def test_env_override(self, monkeypatch):
        monkeypatch.setenv("RACCOON_GRPC_PORT", "9999")
        settings = Settings()
        assert settings.grpc_port == 9999

    def test_max_message_size_default(self):
        settings = Settings()
        assert settings.max_message_size == 50 * 1024 * 1024  # 50MB

    def test_sandbox_defaults(self):
        settings = Settings()
        assert settings.sandbox_timeout == 300
        assert settings.sandbox_max_cpu == 8
        assert settings.sandbox_max_memory_mb == 8192

    def test_api_keys_default_empty(self):
        settings = Settings()
        assert settings.anthropic_api_key == ""
        assert settings.openai_api_key == ""
        assert settings.e2b_api_key == ""

    def test_env_prefix(self, monkeypatch):
        """Verify RACCOON_ prefix is required for env vars."""
        monkeypatch.setenv("RACCOON_DEFAULT_MODEL", "gpt-5.2")
        settings = Settings()
        assert settings.default_model == "gpt-5.2"

    def test_observability_defaults(self):
        settings = Settings()
        assert settings.otel_endpoint == ""
        assert settings.metrics_port == 9090
