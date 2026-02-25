"""Tests for the LLM orchestrator."""

import pytest

from raccoon_runtime.config import Settings
from raccoon_runtime.llm.orchestrator import LLMOrchestrator


class TestOrchestrator:
    def test_init(self):
        settings = Settings()
        orch = LLMOrchestrator(settings)
        assert orch.status_bank is not None
        assert orch.tool_registry is not None

    def test_get_provider_anthropic(self):
        settings = Settings(anthropic_api_key="test-key")
        orch = LLMOrchestrator(settings)
        provider = orch.get_provider("claude-sonnet-4-6")
        assert provider is not None
        # Verify it is cached
        provider2 = orch.get_provider("claude-sonnet-4-6")
        assert provider is provider2

    def test_get_provider_openai(self):
        settings = Settings(openai_api_key="test-key")
        orch = LLMOrchestrator(settings)
        provider = orch.get_provider("gpt-5.2")
        assert provider is not None
        # Verify it is cached
        provider2 = orch.get_provider("gpt-5.2")
        assert provider is provider2

    def test_get_provider_unknown(self):
        settings = Settings()
        orch = LLMOrchestrator(settings)
        with pytest.raises(ValueError, match="Unknown model"):
            orch.get_provider("unknown-model")

    def test_get_provider_claude_variants(self):
        """All claude-prefixed models should use the Anthropic provider."""
        settings = Settings(anthropic_api_key="test-key")
        orch = LLMOrchestrator(settings)
        provider1 = orch.get_provider("claude-sonnet-4-6")
        provider2 = orch.get_provider("claude-opus-4-6")
        # Both resolve to the same cached Anthropic provider
        assert provider1 is provider2

    def test_get_provider_gpt_variants(self):
        """All gpt-prefixed models should use the OpenAI provider."""
        settings = Settings(openai_api_key="test-key")
        orch = LLMOrchestrator(settings)
        provider1 = orch.get_provider("gpt-5.2")
        provider2 = orch.get_provider("gpt-5.2-chat-latest")
        assert provider1 is provider2
