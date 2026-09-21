"""GitHub REST client for public PR unified diffs."""

from __future__ import annotations

import asyncio

import httpx

from src.integrations.diff_result import DiffFetchResult
from src.integrations.errors import PrNotFound, UpstreamError, UpstreamRateLimited

_GITHUB_API = "https://api.github.com"
_TIMEOUT = 4.0
_USER_AGENT = "agent-codereview/1.0"


def _base_headers(token: str | None) -> dict[str, str]:
    headers = {
        "User-Agent": _USER_AGENT,
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _raise_for_platform_status(status_code: int) -> None:
    if status_code in (401, 403, 404):
        raise PrNotFound("pull request not found or inaccessible")
    if status_code == 429:
        raise UpstreamRateLimited("github rate limit exceeded")
    if status_code >= 500:
        raise UpstreamError(f"github upstream error: {status_code}")
    if status_code >= 400:
        raise UpstreamError(f"github unexpected status: {status_code}")


async def fetch_pull_request_diff(
    owner: str,
    repo: str,
    number: int,
    *,
    token: str | None = None,
) -> DiffFetchResult:
    headers = _base_headers(token)
    diff_url = f"{_GITHUB_API}/repos/{owner}/{repo}/pulls/{number}"
    files_url = f"{_GITHUB_API}/repos/{owner}/{repo}/pulls/{number}/files"

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            diff_resp, files_resp = await asyncio.gather(
                client.get(
                    diff_url,
                    headers={**headers, "Accept": "application/vnd.github.diff"},
                ),
                client.get(
                    files_url,
                    headers={**headers, "Accept": "application/vnd.github+json"},
                ),
            )
    except httpx.TimeoutException as exc:
        raise UpstreamError("github request timed out") from exc
    except httpx.HTTPError as exc:
        raise UpstreamError("github request failed") from exc

    _raise_for_platform_status(diff_resp.status_code)
    _raise_for_platform_status(files_resp.status_code)

    try:
        files_payload = files_resp.json()
    except ValueError as exc:
        raise UpstreamError("github files response was not json") from exc

    if not isinstance(files_payload, list):
        raise UpstreamError("github files response was not a list")

    files_changed: list[str] = []
    additions = 0
    deletions = 0
    for item in files_payload:
        if not isinstance(item, dict):
            continue
        filename = item.get("filename")
        if isinstance(filename, str) and filename:
            files_changed.append(filename)
        add = item.get("additions", 0)
        delete = item.get("deletions", 0)
        if isinstance(add, int):
            additions += add
        if isinstance(delete, int):
            deletions += delete

    return DiffFetchResult(
        diff_content=diff_resp.text,
        files_changed=files_changed,
        additions=additions,
        deletions=deletions,
    )
