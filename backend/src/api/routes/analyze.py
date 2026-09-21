"""POST /api/analyze — SSE stream of alert | score | done | error."""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator, Mapping
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Body, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sse_starlette import EventSourceResponse, ServerSentEvent

from src.api.dependencies import Settings, get_settings
from src.api.schemas.analyze import AnalyzeRequest
from src.core.analyzer.orchestrator import (
    LlmApiError,
    LlmGenerator,
    LlmSchemaError,
    LlmTimeoutError,
    analyze,
)
from src.integrations.llm.gemini_client import GeminiClient

router = APIRouter(prefix="/api", tags=["analyze"])
logger = logging.getLogger("src.api.routes.analyze")

_INVALID_BODY = {
    "error": "INVALID_ANALYZE_REQUEST",
    "message": "Payload de análise inválido.",
}

_ERROR_MESSAGES: Mapping[str, str] = {
    "LLM_TIMEOUT": "A análise excedeu o tempo limite de 30 segundos.",
    "LLM_UNAVAILABLE": "O serviço de análise está temporariamente indisponível.",
    "LLM_SCHEMA": "A resposta do modelo não pôde ser interpretada.",
    "RATE_LIMITED": "O provedor de análise limitou a taxa de requisições.",
}


def _first_validation_detail(exc: ValidationError) -> str:
    errors = exc.errors()
    if not errors:
        return "Payload inválido."
    err = errors[0]
    loc = err.get("loc", ())
    msg = str(err.get("msg", "inválido"))
    if "code" in loc:
        return "O campo code não pode ser vazio."
    if "language" in loc:
        return "O campo language é inválido."
    return msg


def _sse_data(payload: dict[str, Any]) -> str:
    return json.dumps(payload, separators=(",", ":"))


def _error_event(code: str, analysis_id: str) -> ServerSentEvent:
    return ServerSentEvent(
        event="error",
        data=_sse_data(
            {
                "error": code,
                "message": _ERROR_MESSAGES[code],
                "analysis_id": analysis_id,
            }
        ),
    )


def _map_llm_api_error(exc: LlmApiError) -> str:
    text = str(exc).lower()
    if "429" in text or ("rate" in text and "limit" in text):
        return "RATE_LIMITED"
    return "LLM_UNAVAILABLE"


async def sse_event_publisher(
    request: Request,
    *,
    code: str,
    filename: str,
    llm: LlmGenerator,
) -> AsyncIterator[ServerSentEvent]:
    """Adapt C03 analyze() events to SSE; map typed LLM errors to event:error."""
    analysis_id = str(uuid4())
    # Immediate comment commits the stream without waiting on the LLM (RNF02).
    yield ServerSentEvent(comment="stream-open")
    try:
        if await request.is_disconnected():
            logger.info("analysis_cancelled", extra={"analysis_id": analysis_id})
            return

        async for event in analyze(code, llm=llm, filename=filename):
            if await request.is_disconnected():
                logger.info("analysis_cancelled", extra={"analysis_id": analysis_id})
                return
            yield ServerSentEvent(
                event=event["event"],
                data=_sse_data(dict(event["data"])),
            )
    except asyncio.CancelledError:
        logger.info("analysis_cancelled", extra={"analysis_id": analysis_id})
        raise
    except LlmTimeoutError:
        yield _error_event("LLM_TIMEOUT", analysis_id)
    except LlmSchemaError:
        yield _error_event("LLM_SCHEMA", analysis_id)
    except LlmApiError as exc:
        yield _error_event(_map_llm_api_error(exc), analysis_id)


@router.post("/analyze", response_model=None)
async def post_analyze(
    request: Request,
    body: dict[str, Any] = Body(...),
    settings: Settings = Depends(get_settings),
) -> EventSourceResponse | JSONResponse:
    try:
        parsed = AnalyzeRequest.model_validate(body)
    except ValidationError as exc:
        detail = _first_validation_detail(exc)
        return JSONResponse(
            status_code=422,
            content={**_INVALID_BODY, "detail": detail},
        )

    llm = GeminiClient(settings)
    filename = parsed.filename if parsed.filename else "snippet.py"
    return EventSourceResponse(
        sse_event_publisher(
            request,
            code=parsed.code,
            filename=filename,
            llm=llm,
        ),
        ping=15,
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
