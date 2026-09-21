"""Unit tests for GitLab MR client (respx, no real network)."""

import asyncio
from urllib.parse import quote

import httpx
import pytest
import respx

from src.integrations.errors import PrNotFound
from src.integrations.gitlab.gitlab_client import fetch_merge_request_diff


def _run(coro: object) -> object:
    return asyncio.run(coro)  # type: ignore[arg-type]


def _diffs_url(project_path: str, iid: int) -> str:
    encoded = quote(project_path, safe="")
    return f"https://gitlab.com/api/v4/projects/{encoded}/merge_requests/{iid}/diffs"


@respx.mock
def test_simple_mr() -> None:
    url = _diffs_url("group/project", 45)
    route = respx.get(url).mock(
        return_value=httpx.Response(
            200,
            json=[
                {
                    "old_path": "users.py",
                    "new_path": "users.py",
                    "diff": "@@ -1 +1 @@\n-old\n+new\n",
                    "deleted_file": False,
                }
            ],
        )
    )
    result = _run(fetch_merge_request_diff("group/project", 45))
    assert "users.py" in result.files_changed
    assert "--- a/users.py" in result.diff_content
    assert "+++ b/users.py" in result.diff_content
    assert result.additions == 1
    assert result.deletions == 1
    assert route.called
    assert "PRIVATE-TOKEN" not in route.calls.last.request.headers


@respx.mock
def test_nested_group_path_encoded() -> None:
    project = "org/team/sub/project"
    url = _diffs_url(project, 12)
    assert "org%2Fteam%2Fsub%2Fproject" in url
    route = respx.get(url).mock(
        return_value=httpx.Response(
            200,
            json=[
                {
                    "old_path": "a.py",
                    "new_path": "a.py",
                    "diff": "diff --git a/a.py b/a.py\n@@ -0,0 +1 @@\n+x\n",
                }
            ],
        )
    )
    result = _run(fetch_merge_request_diff(project, 12, token="gl-token"))
    assert result.files_changed == ["a.py"]
    assert result.additions == 1
    assert route.calls.last.request.headers.get("PRIVATE-TOKEN") == "gl-token"


@respx.mock
def test_mr_404() -> None:
    respx.get(_diffs_url("group/project", 99)).mock(
        return_value=httpx.Response(404, json={"message": "404"})
    )
    with pytest.raises(PrNotFound):
        _run(fetch_merge_request_diff("group/project", 99))


@respx.mock
def test_pagination_page_two() -> None:
    url = _diffs_url("group/project", 3)
    respx.get(url).mock(
        side_effect=[
            httpx.Response(
                200,
                json=[
                    {
                        "old_path": "one.py",
                        "new_path": "one.py",
                        "diff": "@@ -0,0 +1 @@\n+one\n",
                    }
                ],
                headers={"X-Next-Page": "2"},
            ),
            httpx.Response(
                200,
                json=[
                    {
                        "old_path": "two.py",
                        "new_path": "two.py",
                        "diff": "@@ -0,0 +1 @@\n+two\n",
                    }
                ],
                headers={"X-Next-Page": ""},
            ),
        ]
    )
    result = _run(fetch_merge_request_diff("group/project", 3))
    assert result.files_changed == ["one.py", "two.py"]
    assert result.additions == 2
    assert "one" in result.diff_content
    assert "two" in result.diff_content
