"""Unit tests for diff truncation."""

from src.core.analyzer.diff_truncator import truncate_diff


def test_exactly_500_lines_not_truncated() -> None:
    text = "\n".join(f"line-{i}" for i in range(500))
    result, truncated = truncate_diff(text)
    assert truncated is False
    assert result == text
    assert len(result.splitlines()) == 500


def test_501_lines_truncated() -> None:
    text = "\n".join(f"line-{i}" for i in range(501))
    result, truncated = truncate_diff(text)
    assert truncated is True
    assert len(result.splitlines()) == 500
    assert result.splitlines()[-1] == "line-499"


def test_empty_string() -> None:
    result, truncated = truncate_diff("")
    assert result == ""
    assert truncated is False
