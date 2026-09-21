"""Integration tests for POST /api/diff/ingest (respx, no real network)."""

from __future__ import annotations

import asyncio
import logging
from urllib.parse import quote

import httpx
import pytest
import respx

from src.config.settings import get_settings
from src.main import app


async def _post_ingest(payload: dict[str, object]) -> httpx.Response:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://testserver"
    ) as client:
        return await client.post("/api/diff/ingest", json=payload)


def _ingest(payload: dict[str, object]) -> httpx.Response:
    return asyncio.run(_post_ingest(payload))


@respx.mock
def test_github_200_ca_rf09_01() -> None:
    respx.get("https://api.github.com/repos/owner/repo/pulls/123").mock(
        return_value=httpx.Response(
            200,
            text="diff --git a/users.py b/users.py\n+ok\n",
        )
    )
    respx.get("https://api.github.com/repos/owner/repo/pulls/123/files").mock(
        return_value=httpx.Response(
            200,
            json=[
                {"filename": "users.py", "additions": 42, "deletions": 18},
                {"filename": "auth.py", "additions": 0, "deletions": 0},
            ],
        )
    )
    response = _ingest({"url": "https://github.com/owner/repo/pull/123"})
    assert response.status_code == 200
    body = response.json()
    assert body["platform"] == "github"
    assert body["pr_number"] == 123
    assert "users.py" in body["files_changed"]
    assert body["additions"] == 42
    assert body["deletions"] == 18
    assert body["truncated"] is False
    assert "diff --git" in body["diff_content"]


@respx.mock
def test_gitlab_200_ca_rf09_02() -> None:
    encoded = quote("group/project", safe="")
    respx.get(
        f"https://gitlab.com/api/v4/projects/{encoded}/merge_requests/45/diffs"
    ).mock(
        return_value=httpx.Response(
            200,
            json=[
                {
                    "old_path": "main.py",
                    "new_path": "main.py",
                    "diff": "@@ -0,0 +1 @@\n+hi\n",
                }
            ],
        )
    )
    response = _ingest({"url": "https://gitlab.com/group/project/-/merge_requests/45"})
    assert response.status_code == 200
    body = response.json()
    assert body["platform"] == "gitlab"
    assert body["pr_number"] == 45
    assert body["files_changed"] == ["main.py"]
    assert "--- a/main.py" in body["diff_content"]


@respx.mock
def test_invalid_url_422_no_upstream_call() -> None:
    route = respx.route(host="api.github.com")
    route.mock(return_value=httpx.Response(500))
    gitlab = respx.route(host="gitlab.com")
    gitlab.mock(return_value=httpx.Response(500))
    response = _ingest({"url": "https://github.com/user/repo/pull/abc"})
    assert response.status_code == 422
    body = response.json()
    assert body["error"] == "INVALID_PR_URL"
    assert not route.called
    assert not gitlab.called


@respx.mock
def test_private_pr_404_not_500_ca_rf09_04() -> None:
    respx.get("https://api.github.com/repos/owner/private/pulls/1").mock(
        return_value=httpx.Response(404, json={"message": "Not Found"})
    )
    respx.get("https://api.github.com/repos/owner/private/pulls/1/files").mock(
        return_value=httpx.Response(404, json={"message": "Not Found"})
    )
    response = _ingest({"url": "https://github.com/owner/private/pull/1"})
    assert response.status_code == 404
    body = response.json()
    assert body["error"] == "PR_NOT_FOUND"
    assert body["message"]


@respx.mock
def test_truncation_501_lines_ca_rf09_05() -> None:
    long_diff = "\n".join(f"+line-{i}" for i in range(501))
    respx.get("https://api.github.com/repos/owner/repo/pulls/9").mock(
        return_value=httpx.Response(200, text=long_diff)
    )
    respx.get("https://api.github.com/repos/owner/repo/pulls/9/files").mock(
        return_value=httpx.Response(
            200,
            json=[
                {"filename": "big.py", "additions": 501, "deletions": 0},
            ],
        )
    )
    response = _ingest({"url": "https://github.com/owner/repo/pull/9"})
    assert response.status_code == 200
    body = response.json()
    assert body["truncated"] is True
    assert len(body["diff_content"].splitlines()) == 500
    assert body["additions"] == 501
    assert body["files_changed"] == ["big.py"]


@respx.mock
def test_upstream_429() -> None:
    respx.get("https://api.github.com/repos/owner/repo/pulls/10").mock(
        return_value=httpx.Response(429, text="slow down")
    )
    respx.get("https://api.github.com/repos/owner/repo/pulls/10/files").mock(
        return_value=httpx.Response(200, json=[])
    )
    response = _ingest({"url": "https://github.com/owner/repo/pull/10"})
    assert response.status_code == 429
    assert response.json()["error"] == "UPSTREAM_RATE_LIMITED"


@respx.mock
def test_upstream_timeout_502() -> None:
    respx.get("https://api.github.com/repos/owner/repo/pulls/11").mock(
        side_effect=httpx.ReadTimeout("timed out")
    )
    respx.get("https://api.github.com/repos/owner/repo/pulls/11/files").mock(
        return_value=httpx.Response(200, json=[])
    )
    response = _ingest({"url": "https://github.com/owner/repo/pull/11"})
    assert response.status_code == 502
    assert response.json()["error"] == "UPSTREAM_ERROR"


@respx.mock
def test_logs_omit_diff_and_tokens(
    caplog: pytest.LogCaptureFixture, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("GITHUB_TOKEN", "super-secret-gh-token")
    get_settings.cache_clear()
    respx.get("https://api.github.com/repos/owner/repo/pulls/20").mock(
        return_value=httpx.Response(
            200,
            text="diff --git a/secret.py b/secret.py\n+SECRET_PAYLOAD\n",
        )
    )
    respx.get("https://api.github.com/repos/owner/repo/pulls/20/files").mock(
        return_value=httpx.Response(
            200,
            json=[{"filename": "secret.py", "additions": 1, "deletions": 0}],
        )
    )
    with caplog.at_level(logging.INFO):
        response = _ingest({"url": "https://github.com/owner/repo/pull/20"})
    assert response.status_code == 200
    joined = " ".join(r.getMessage() for r in caplog.records)
    joined += " ".join(str(r.__dict__) for r in caplog.records)
    assert "SECRET_PAYLOAD" not in joined
    assert "diff_content" not in joined
    assert "super-secret-gh-token" not in joined
    assert "GITHUB_TOKEN" not in joined or "GITHUB_TOKEN" not in response.text
    get_settings.cache_clear()
