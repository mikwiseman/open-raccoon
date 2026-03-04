"""Creates the appropriate runner based on execution mode."""

import structlog

from raccoon_runtime.config import Settings
from raccoon_runtime.runners.base_runner import BaseAgentRunner

logger = structlog.get_logger()


def detect_mode_from_model(model: str) -> str:
    """Auto-detect execution mode from model name prefix.

    Returns 'claude_sdk' for claude-* models, 'openai_sdk' for gpt-*/o1-*/o3-* models.
    Raises ValueError if the model prefix is unrecognized.
    """
    model_lower = model.lower()
    if model_lower.startswith("claude-"):
        return "claude_sdk"
    if model_lower.startswith(("gpt-", "o1-", "o3-", "o4-")):
        return "openai_sdk"
    raise ValueError(
        f"Cannot auto-detect execution mode for model '{model}'. "
        f"Set execution_mode explicitly to 'claude_sdk' or 'openai_sdk'."
    )


class RunnerFactory:
    """Creates the appropriate runner based on execution mode."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def create(
        self,
        mode: str,
        api_key: str | None = None,
        model: str | None = None,
    ) -> BaseAgentRunner:
        # When mode is "raw", auto-detect from model name
        if mode == "raw" and model:
            resolved_mode = detect_mode_from_model(model)
            logger.info(
                "auto_detected_execution_mode",
                model=model,
                original_mode=mode,
                resolved_mode=resolved_mode,
            )
            mode = resolved_mode

        match mode:
            case "raw":
                from raccoon_runtime.runners.raw_runner import RawRunner

                return RawRunner(self.settings, api_key)
            case "claude_sdk":
                from raccoon_runtime.runners.claude_runner import ClaudeRunner

                return ClaudeRunner(self.settings, api_key)
            case "openai_sdk":
                from raccoon_runtime.runners.openai_runner import OpenAIRunner

                return OpenAIRunner(self.settings, api_key)
            case _:
                raise ValueError(f"Unknown execution mode: {mode}")
