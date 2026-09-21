"""Unit tests for GitHub PR client (respx, no real network)."""

import asyncio

import httpx
import pytest
import respx

from src.integrations.errors import PrNotFound, UpstreamError, UpstreamRateLimited
from src.integrations.github.github_client import fetch_pull_request_diff


def _run(coro: object) -> object:
    return asyncio.run(coro)  # type: ignore[arg-type]


@respx.mock
def test_fetch_pr_200_with_files() -> None:
    diff_route = respx.get("https://api.github.com/repos/o/r/pulls/1").mock(
        return_value=httpx.Response(
            200,
            text="diff --git a/a.py b/a.py\n+print(1)\n",
            headers={"Content-Type": "application/vnd.github.diff"},
        )
    )
    files_route = respx.get("https://api.github.com/repos/o/r/pulls/1/files").mock(
        return_value=httpx.Response(
            200,
            json=[
                {"filename": "a.py", "additions": 2, "deletions": 1},
                {"filename": "b.py", "additions": 3, "deletions": 0},
            ],
        )
    )
    result = _run(fetch_pull_request_diff("o", "r", 1, token=None))
    assert result.diff_content.startswith("diff --git")
    assert result.files_changed == ["a.py", "b.py"]
    assert result.additions == 5
    assert result.deletions == 1
    assert diff_route.called
    assert files_route.called
    assert "Authorization" not in diff_route.calls.last.request.headers


@respx.mock
def test_authorization_header_only_when_token_set() -> None:
    respx.get("https://api.github.com/repos/o/r/pulls/2").mock(
        return_value=httpx.Response(200, text="diff")
    )
    files_route = respx.get("https://api.github.com/repos/o/r/pulls/2/files").mock(
        return_value=httpx.Response(200, json=[])
    )
    _run(fetch_pull_request_diff("o", "r", 2, token="gh-secret-token"))
    auth = files_route.calls.last.request.headers.get("Authorization")
    assert auth == "Bearer gh-secret-token"


@respx.mock
def test_private_pr_404() -> None:
    respx.get("https://api.github.com/repos/o/r/pulls/3").mock(
        return_value=httpx.Response(404, json={"message": "Not Found"})
    )
    respx.get("https://api.github.com/repos/o/r/pulls/3/files").mock(
        return_value=httpx.Response(404, json={"message": "Not Found"})
    )
    with pytest.raises(PrNotFound):
        _run(fetch_pull_request_diff("o", "r", 3))


@respx.mock
def test_rate_limited_429() -> None:
    respx.get("https://api.github.com/repos/o/r/pulls/4").mock(
        return_value=httpx.Response(429, text="rate limit")
    )
    respx.get("https://api.github.com/repos/o/r/pulls/4/files").mock(
        return_value=httpx.Response(200, json=[])
    )
    with pytest.raises(UpstreamRateLimited):
        _run(fetch_pull_request_diff("o", "r", 4))


@respx.mock
def test_timeout_maps_to_upstream_error() -> None:
    respx.get("https://api.github.com/repos/o/r/pulls/5").mock(
        side_effect=httpx.ReadTimeout("timed out")
    )
    respx.get("https://api.github.com/repos/o/r/pulls/5/files").mock(
        return_value=httpx.Response(200, json=[])
    )
    with pytest.raises(UpstreamError):
        _run(fetch_pull_request_diff("o", "r", 5))
