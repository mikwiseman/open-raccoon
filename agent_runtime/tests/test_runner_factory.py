"""Tests for RunnerFactory."""

import pytest

from raccoon_runtime.config import Settings
from raccoon_runtime.runners.runner_factory import RunnerFactory


@pytest.fixture
def factory(settings):
    return RunnerFactory(settings)


class TestRunnerFactory:
    def test_create_raw_runner(self, factory):
        from raccoon_runtime.runners.raw_runner import RawRunner

        runner = factory.create("raw")
        assert isinstance(runner, RawRunner)

    def test_create_claude_runner(self, factory):
        from raccoon_runtime.runners.claude_runner import ClaudeRunner

        runner = factory.create("claude_sdk")
        assert isinstance(runner, ClaudeRunner)

    def test_create_openai_runner(self, factory):
        from raccoon_runtime.runners.openai_runner import OpenAIRunner

        runner = factory.create("openai_sdk")
        assert isinstance(runner, OpenAIRunner)

    def test_create_unknown_mode_raises(self, factory):
        with pytest.raises(ValueError, match="Unknown execution mode"):
            factory.create("unknown_mode")

    def test_create_with_api_key(self, factory):
        from raccoon_runtime.runners.raw_runner import RawRunner

        runner = factory.create("raw", api_key="test-key")
        assert isinstance(runner, RawRunner)
        assert runner.api_key == "test-key"

    def test_create_claude_with_api_key(self, factory):
        from raccoon_runtime.runners.claude_runner import ClaudeRunner

        runner = factory.create("claude_sdk", api_key="test-key")
        assert isinstance(runner, ClaudeRunner)
        assert runner.api_key == "test-key"

    def test_auto_detect_claude_model(self, factory):
        from raccoon_runtime.runners.claude_runner import ClaudeRunner

        runner = factory.create("raw", model="claude-sonnet-4-6")
        assert isinstance(runner, ClaudeRunner)

    def test_auto_detect_claude_opus_model(self, factory):
        from raccoon_runtime.runners.claude_runner import ClaudeRunner

        runner = factory.create("raw", model="claude-opus-4-6")
        assert isinstance(runner, ClaudeRunner)

    def test_auto_detect_gpt_model(self, factory):
        from raccoon_runtime.runners.openai_runner import OpenAIRunner

        runner = factory.create("raw", model="gpt-5.2")
        assert isinstance(runner, OpenAIRunner)

    def test_auto_detect_o1_model(self, factory):
        from raccoon_runtime.runners.openai_runner import OpenAIRunner

        runner = factory.create("raw", model="o1-preview")
        assert isinstance(runner, OpenAIRunner)

    def test_auto_detect_unknown_model_raises(self, factory):
        with pytest.raises(ValueError, match="Cannot auto-detect"):
            factory.create("raw", model="llama-3.1-70b")

    def test_explicit_mode_overrides_auto_detect(self, factory):
        from raccoon_runtime.runners.claude_runner import ClaudeRunner

        # Even with gpt model name, explicit claude_sdk mode wins
        runner = factory.create("claude_sdk", model="gpt-5.2")
        assert isinstance(runner, ClaudeRunner)
