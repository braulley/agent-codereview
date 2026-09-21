from __future__ import annotations

import asyncio
import json
import logging
import time
from collections.abc import AsyncIterator
from typing import Any, Literal, Protocol, TypedDict
from uuid import uuid4

from pydantic import ValidationError

from src.core.scorer.health_score import AlertCount, compute_health_score
from src.core.validator.alert_schema import AlertDraft, AlertItem
from src.integrations.llm.gemini_client import GeminiClientError, GeminiGenerateResult

logger = logging.getLogger(__name__)

MAX_CODE_LINES = 500
LLM_TIMEOUT_SECONDS = 30.0


class LlmTimeoutError(Exception):
    """LLM call exceeded the 30s budget (CT04)."""


class LlmApiError(Exception):
    """Gemini API / transport failure."""


class LlmSchemaError(Exception):
    """LLM response is not a valid analysis envelope."""


class AlertEventData(TypedDict):
    id: str
    file: str
    line_start: int
    line_end: int
    severity: str
    title: str
    description: str
    suggestion: str
    category: str


class ScoreEventData(TypedDict):
    code_health_score: int
    alert_count: AlertCount


class DoneEventData(TypedDict):
    status: Literal["completed"]
    analysis_id: str
    duration_ms: int


class AnalysisEvent(TypedDict):
    event: Literal["alert", "score", "done"]
    data: AlertEventData | ScoreEventData | DoneEventData


class LlmGenerator(Protocol):
    async def generate(self, code: str) -> GeminiGenerateResult: ...


def _truncate_code(code: str) -> str:
    lines = code.splitlines(keepends=True)
    if len(lines) <= MAX_CODE_LINES:
        return code
    return "".join(lines[:MAX_CODE_LINES])


def _raw_alert_dicts(result: GeminiGenerateResult) -> list[dict[str, Any]]:
    """Extract alert candidate dicts; raise LlmSchemaError if envelope is unusable."""
    if result.parsed is not None:
        return [draft.model_dump() for draft in result.parsed.alerts]

    text = result.text
    if not text or not str(text).strip():
        raise LlmSchemaError("empty LLM response")
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise LlmSchemaError("unreadable LLM JSON") from exc
    if not isinstance(payload, dict) or "alerts" not in payload:
        raise LlmSchemaError("invalid LLM JSON envelope")
    alerts = payload["alerts"]
    if not isinstance(alerts, list):
        raise LlmSchemaError("alerts must be a list")
    return [item for item in alerts if isinstance(item, dict)]


async def analyze(
    code: str,
    *,
    llm: LlmGenerator,
    filename: str = "snippet.py",
) -> AsyncIterator[AnalysisEvent]:
    """Async generator: alert* → score → done. Raises typed LLM errors."""
    analysis_id = str(uuid4())
    started = time.perf_counter()
    truncated = _truncate_code(code)
    _ = filename

    try:
        result = await asyncio.wait_for(
            llm.generate(truncated),
            timeout=LLM_TIMEOUT_SECONDS,
        )
    except TimeoutError as exc:
        logger.error("llm_timeout", extra={"analysis_id": analysis_id})
        raise LlmTimeoutError("LLM call timed out after 30s") from exc
    except GeminiClientError as exc:
        logger.error("llm_api_error", extra={"analysis_id": analysis_id})
        raise LlmApiError(str(exc)) from exc

    try:
        raw_alerts = _raw_alert_dicts(result)
    except LlmSchemaError:
        logger.error("llm_schema_error", extra={"analysis_id": analysis_id})
        raise

    accepted: list[AlertItem] = []
    for raw in raw_alerts:
        try:
            draft = AlertDraft.model_validate(raw)
            item = AlertItem.model_validate({**draft.model_dump(), "id": str(uuid4())})
        except ValidationError:
            logger.warning("alert_item_skipped", extra={"analysis_id": analysis_id})
            continue
        accepted.append(item)
        yield {
            "event": "alert",
            "data": {
                "id": str(item.id),
                "file": item.file,
                "line_start": item.line_start,
                "line_end": item.line_end,
                "severity": item.severity,
                "title": item.title,
                "description": item.description,
                "suggestion": item.suggestion,
                "category": item.category,
            },
        }

    score = compute_health_score(accepted)
    yield {
        "event": "score",
        "data": {
            "code_health_score": score["code_health_score"],
            "alert_count": score["alert_count"],
        },
    }

    duration_ms = int((time.perf_counter() - started) * 1000)
    logger.info(
        "analysis_done",
        extra={
            "analysis_id": analysis_id,
            "tokens_used": result.tokens_used,
            "analysis_duration_ms": duration_ms,
        },
    )
    yield {
        "event": "done",
        "data": {
            "status": "completed",
            "analysis_id": analysis_id,
            "duration_ms": duration_ms,
        },
    }
