import asyncio

import httpx
import pytest
from pydantic import ValidationError

from src.config.settings import Settings, get_settings
from src.main import app


async def _get_health() -> httpx.Response:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://testserver"
    ) as client:
        return await client.get("/api/health")


def test_health_endpoint_via_asgi() -> None:
    response = asyncio.run(_get_health())
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    body = response.json()
    assert body["status"] == "healthy"
    assert body["gemini_api"] == "reachable"
    assert "version" in body
    assert "timestamp" in body


def test_health_ok_without_optional_tokens(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key-c02")
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)
    monkeypatch.delenv("GITLAB_TOKEN", raising=False)
    get_settings.cache_clear()
    response = asyncio.run(_get_health())
    assert response.status_code == 200


def test_settings_fail_without_gemini_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    get_settings.cache_clear()
    with pytest.raises(ValidationError):
        Settings()
