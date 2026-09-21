"""POST /api/diff/ingest — fetch and truncate PR/MR unified diffs."""

from __future__ import annotations

import logging
import time
from typing import Any, Literal

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from src.api.dependencies import Settings, get_settings
from src.core.analyzer.diff_truncator import truncate_diff
from src.core.analyzer.pr_url import InvalidPrUrl, parse_pr_url
from src.integrations.errors import PrNotFound, UpstreamError, UpstreamRateLimited
from src.integrations.github.github_client import fetch_pull_request_diff
from src.integrations.gitlab.gitlab_client import fetch_merge_request_diff

router = APIRouter(prefix="/api", tags=["diff"])
logger = logging.getLogger("src.api.routes.diff")

_INVALID_PR_URL_BODY = {
    "error": "INVALID_PR_URL",
    "message": (
        "A URL fornecida não corresponde a um Pull Request GitHub "
        "ou Merge Request GitLab válido."
    ),
    "detail": "Formato esperado: https://github.com/{owner}/{repo}/pull/{number}",
}

_PR_NOT_FOUND_BODY = {
    "error": "PR_NOT_FOUND",
    "message": (
        "Pull Request ou Merge Request não encontrado ou inacessível "
        "com as credenciais configuradas."
    ),
    "detail": (
        "Verifique se o repositório é público ou se GITHUB_TOKEN / "
        "GITLAB_TOKEN está configurado no servidor."
    ),
}


class DiffIngestRequest(BaseModel):
    url: str = ""


class DiffIngestResponse(BaseModel):
    diff_content: str
    files_changed: list[str]
    additions: int
    deletions: int
    platform: Literal["github", "gitlab"]
    pr_number: int
    truncated: bool = Field(default=False)


def _error_response(
    status_code: int, error: str, message: str, detail: str | None = None
) -> JSONResponse:
    body: dict[str, Any] = {"error": error, "message": message}
    if detail is not None:
        body["detail"] = detail
    return JSONResponse(status_code=status_code, content=body)


@router.post("/diff/ingest", response_model=DiffIngestResponse)
async def ingest_diff(
    body: DiffIngestRequest,
    settings: Settings = Depends(get_settings),
) -> DiffIngestResponse | JSONResponse:
    started = time.perf_counter()
    try:
        parsed = parse_pr_url(body.url)
    except InvalidPrUrl:
        return JSONResponse(status_code=422, content=_INVALID_PR_URL_BODY)

    try:
        if parsed.platform == "github":
            owner, repo = parsed.project_path.split("/", 1)
            fetched = await fetch_pull_request_diff(
                owner,
                repo,
                parsed.number,
                token=settings.github_token,
            )
        else:
            fetched = await fetch_merge_request_diff(
                parsed.project_path,
                parsed.number,
                token=settings.gitlab_token,
            )
    except PrNotFound:
        return JSONResponse(status_code=404, content=_PR_NOT_FOUND_BODY)
    except UpstreamRateLimited as exc:
        return _error_response(
            429,
            "UPSTREAM_RATE_LIMITED",
            "A plataforma remota limitou a taxa de requisições.",
            str(exc),
        )
    except UpstreamError as exc:
        return _error_response(
            502,
            "UPSTREAM_ERROR",
            "Falha ao consultar a plataforma remota.",
            str(exc),
        )

    truncated_content, truncated = truncate_diff(fetched.diff_content)
    duration_ms = int((time.perf_counter() - started) * 1000)
    logger.info(
        "diff_ingest_done",
        extra={
            "platform": parsed.platform,
            "pr_number": parsed.number,
            "truncated": truncated,
            "duration_ms": duration_ms,
        },
    )
    return DiffIngestResponse(
        diff_content=truncated_content,
        files_changed=fetched.files_changed,
        additions=fetched.additions,
        deletions=fetched.deletions,
        platform=parsed.platform,
        pr_number=parsed.number,
        truncated=truncated,
    )
