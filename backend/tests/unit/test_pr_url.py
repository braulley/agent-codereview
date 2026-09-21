"""Unit tests for PR/MR URL parsing (no I/O)."""

import pytest

from src.core.analyzer.pr_url import InvalidPrUrl, parse_pr_url


def test_github_valid_url() -> None:
    parsed = parse_pr_url("https://github.com/owner/repo/pull/123")
    assert parsed.platform == "github"
    assert parsed.number == 123
    assert parsed.project_path == "owner/repo"


def test_github_www_and_trailing_slash() -> None:
    parsed = parse_pr_url("https://www.github.com/acme/app/pull/9/")
    assert parsed.platform == "github"
    assert parsed.number == 9
    assert parsed.project_path == "acme/app"


def test_gitlab_simple_with_dash() -> None:
    parsed = parse_pr_url("https://gitlab.com/group/project/-/merge_requests/45")
    assert parsed.platform == "gitlab"
    assert parsed.number == 45
    assert parsed.project_path == "group/project"


def test_gitlab_without_dash() -> None:
    parsed = parse_pr_url("https://gitlab.com/group/project/merge_requests/7")
    assert parsed.platform == "gitlab"
    assert parsed.number == 7
    assert parsed.project_path == "group/project"


def test_gitlab_nested_group() -> None:
    parsed = parse_pr_url("https://gitlab.com/org/team/sub/project/-/merge_requests/12")
    assert parsed.platform == "gitlab"
    assert parsed.number == 12
    assert parsed.project_path == "org/team/sub/project"


def test_github_non_numeric_pr_ct05() -> None:
    with pytest.raises(InvalidPrUrl):
        parse_pr_url("https://github.com/user/repo/pull/abc")


def test_bitbucket_rejected() -> None:
    with pytest.raises(InvalidPrUrl):
        parse_pr_url("https://bitbucket.org/owner/repo/pull-requests/1")


def test_empty_url_rejected() -> None:
    with pytest.raises(InvalidPrUrl):
        parse_pr_url("")
    with pytest.raises(InvalidPrUrl):
        parse_pr_url("   ")


def test_enterprise_and_self_hosted_rejected() -> None:
    with pytest.raises(InvalidPrUrl):
        parse_pr_url("https://github.enterprise.example/owner/repo/pull/1")
    with pytest.raises(InvalidPrUrl):
        parse_pr_url("https://gitlab.example.com/group/project/-/merge_requests/1")
