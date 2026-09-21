from pathlib import Path

import pytest
from pydantic import ValidationError

from src.config.settings import Settings, get_settings


def test_missing_gemini_key_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    get_settings.cache_clear()
    with pytest.raises(ValidationError):
        Settings()


def test_empty_gemini_key_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "   ")
    get_settings.cache_clear()
    with pytest.raises(ValidationError):
        Settings()


def test_optional_tokens_default_none(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key-c02")
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)
    monkeypatch.delenv("GITLAB_TOKEN", raising=False)
    get_settings.cache_clear()
    settings = Settings()
    assert settings.github_token is None
    assert settings.gitlab_token is None
    assert settings.app_version == "1.0.0"
    assert settings.cors_origin == "http://localhost:3000"


def test_repr_hides_gemini_key(monkeypatch: pytest.MonkeyPatch) -> None:
    secret = "super-secret-gemini-value"
    monkeypatch.setenv("GEMINI_API_KEY", secret)
    get_settings.cache_clear()
    settings = Settings()
    rendered = repr(settings)
    assert secret not in rendered
    assert secret not in str(settings)


def test_does_not_read_dotenv_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.chdir(tmp_path)
    (tmp_path / ".env").write_text(
        "GEMINI_API_KEY=from-dotenv-file\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("GEMINI_API_KEY", "from-process-env")
    get_settings.cache_clear()
    settings = Settings()
    assert settings.gemini_api_key.get_secret_value() == "from-process-env"
