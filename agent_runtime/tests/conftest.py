"""Shared test fixtures."""

import pytest

from wai_agents_runtime.config import Settings


@pytest.fixture
def settings():
    """Return a Settings instance with default values."""
    return Settings()
