"""Parse public GitHub PR and GitLab MR URLs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlparse


class InvalidPrUrl(Exception):
    """URL is not a supported GitHub PR or GitLab MR."""


@dataclass(frozen=True)
class ParsedPrUrl:
    platform: Literal["github", "gitlab"]
    number: int
    project_path: str


def parse_pr_url(url: str) -> ParsedPrUrl:
    if not isinstance(url, str) or not url.strip():
        raise InvalidPrUrl("empty url")

    parsed = urlparse(url.strip())
    if parsed.scheme != "https":
        raise InvalidPrUrl("scheme must be https")

    host = (parsed.hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]

    path = parsed.path.rstrip("/")
    segments = [s for s in path.split("/") if s]

    if host == "github.com":
        return _parse_github(segments)
    if host == "gitlab.com":
        return _parse_gitlab(segments)
    raise InvalidPrUrl(f"unsupported host: {host}")


def _parse_github(segments: list[str]) -> ParsedPrUrl:
    if len(segments) != 4 or segments[2] != "pull":
        raise InvalidPrUrl("invalid github pr path")
    owner, repo, _, number_s = segments
    if not owner or not repo or not number_s.isdigit():
        raise InvalidPrUrl("invalid github pr number")
    return ParsedPrUrl(
        platform="github",
        number=int(number_s),
        project_path=f"{owner}/{repo}",
    )


def _parse_gitlab(segments: list[str]) -> ParsedPrUrl:
    if "merge_requests" not in segments:
        raise InvalidPrUrl("invalid gitlab mr path")
    idx = segments.index("merge_requests")
    if idx < 2 or idx + 1 >= len(segments):
        raise InvalidPrUrl("invalid gitlab mr path")
    number_s = segments[idx + 1]
    if not number_s.isdigit():
        raise InvalidPrUrl("invalid gitlab mr number")
    prefix = segments[:idx]
    if prefix and prefix[-1] == "-":
        prefix = prefix[:-1]
    if len(prefix) < 2:
        raise InvalidPrUrl("invalid gitlab project path")
    return ParsedPrUrl(
        platform="gitlab",
        number=int(number_s),
        project_path="/".join(prefix),
    )
