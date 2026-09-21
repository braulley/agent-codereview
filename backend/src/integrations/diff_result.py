"""Shared result type for platform diff fetches."""

from dataclasses import dataclass


@dataclass(frozen=True)
class DiffFetchResult:
    diff_content: str
    files_changed: list[str]
    additions: int
    deletions: int
