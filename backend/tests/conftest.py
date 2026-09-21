from collections.abc import Iterator
import os

import pytest

from src.config.settings import get_settings


@pytest.fixture(autouse=True)
def _test_env(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv(
        "GEMINI_API_KEY",
        os.environ.get("GEMINI_API_KEY", "test-gemini-key-c02"),
    )
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
