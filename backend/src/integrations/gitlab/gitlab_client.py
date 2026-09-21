"""GitLab API v4 client for public MR unified diffs."""

from __future__ import annotations

from urllib.parse import quote

import httpx

from src.integrations.diff_result import DiffFetchResult
from src.integrations.errors import PrNotFound, UpstreamError, UpstreamRateLimited

_GITLAB_API = "https://gitlab.com/api/v4"
_TIMEOUT = 4.0
_USER_AGENT = "agent-codereview/1.0"
_PER_PAGE = 100


def _base_headers(token: str | None) -> dict[str, str]:
    headers = {"User-Agent": _USER_AGENT}
    if token:
        headers["PRIVATE-TOKEN"] = token
    return headers


def _raise_for_platform_status(status_code: int) -> None:
    if status_code in (401, 403, 404):
        raise PrNotFound("merge request not found or inaccessible")
    if status_code == 429:
        raise UpstreamRateLimited("gitlab rate limit exceeded")
    if status_code >= 500:
        raise UpstreamError(f"gitlab upstream error: {status_code}")
    if status_code >= 400:
        raise UpstreamError(f"gitlab unexpected status: {status_code}")


def _count_hunk_stats(diff_text: str) -> tuple[int, int]:
    additions = 0
    deletions = 0
    for line in diff_text.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            additions += 1
        elif line.startswith("-") and not line.startswith("---"):
            deletions += 1
    return additions, deletions


def _format_file_diff(item: dict[str, object]) -> str:
    raw = item.get("diff")
    diff = raw if isinstance(raw, str) else ""
    old_raw = item.get("old_path")
    new_raw = item.get("new_path")
    old_path = old_raw if isinstance(old_raw, str) and old_raw else None
    new_path = new_raw if isinstance(new_raw, str) and new_raw else None
    path_for_old = old_path or new_path or "unknown"
    path_for_new = new_path or old_path or "unknown"

    stripped = diff.lstrip()
    if stripped.startswith("--- ") or stripped.startswith("diff --git"):
        return diff
    if not diff:
        return f"--- a/{path_for_old}\n+++ b/{path_for_new}\n"
    return f"--- a/{path_for_old}\n+++ b/{path_for_new}\n{diff}"


def _file_path(item: dict[str, object]) -> str | None:
    deleted = bool(item.get("deleted_file"))
    new_path = item.get("new_path")
    old_path = item.get("old_path")
    if deleted and isinstance(old_path, str) and old_path:
        return old_path
    if isinstance(new_path, str) and new_path:
        return new_path
    if isinstance(old_path, str) and old_path:
        return old_path
    return None


async def fetch_merge_request_diff(
    project_path: str,
    iid: int,
    *,
    token: str | None = None,
) -> DiffFetchResult:
    headers = _base_headers(token)
    encoded = quote(project_path, safe="")
    base_url = f"{_GITLAB_API}/projects/{encoded}/merge_requests/{iid}/diffs"

    files_changed: list[str] = []
    additions = 0
    deletions = 0
    diff_chunks: list[str] = []
    diff_line_count = 0
    collect_text = True
    page = 1

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            while True:
                response = await client.get(
                    base_url,
                    headers=headers,
                    params={"per_page": _PER_PAGE, "page": page},
                )
                _raise_for_platform_status(response.status_code)
                try:
                    payload = response.json()
                except ValueError as exc:
                    raise UpstreamError("gitlab diffs response was not json") from exc
                if not isinstance(payload, list):
                    raise UpstreamError("gitlab diffs response was not a list")

                for item in payload:
                    if not isinstance(item, dict):
                        continue
                    path = _file_path(item)
                    if path:
                        files_changed.append(path)
                    chunk = _format_file_diff(item)
                    add, delete = _count_hunk_stats(chunk)
                    additions += add
                    deletions += delete
                    if collect_text:
                        chunk_lines = len(chunk.splitlines()) if chunk else 0
                        diff_chunks.append(chunk)
                        diff_line_count += chunk_lines
                        if diff_line_count >= 500:
                            collect_text = False

                next_page = response.headers.get("X-Next-Page", "").strip()
                if not next_page:
                    break
                page = int(next_page)
    except httpx.TimeoutException as exc:
        raise UpstreamError("gitlab request timed out") from exc
    except httpx.HTTPError as exc:
        raise UpstreamError("gitlab request failed") from exc

    return DiffFetchResult(
        diff_content="\n".join(diff_chunks),
        files_changed=files_changed,
        additions=additions,
        deletions=deletions,
    )
