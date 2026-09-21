"""Unit tests for SSE publisher / LLM error mapping (no Gemini I/O)."""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from typing import Any
from unittest.mock import patch

from src.api.routes.analyze import sse_event_publisher
from src.core.analyzer.orchestrator import (
    AnalysisEvent,
    LlmApiError,
    LlmSchemaError,
    LlmTimeoutError,
)


class _FakeRequest:
    def __init__(self, disconnected: bool = False) -> None:
        self._disconnected = disconnected

    async def is_disconnected(self) -> bool:
        return self._disconnected


class _FakeLlm:
    async def generate(self, code: str) -> Any:
        raise AssertionError("LLM must not be called; analyze is mocked")


def _collect(
    events: AsyncIterator[Any] | Any,
) -> list[tuple[str | None, Any]]:
    async def _run() -> list[tuple[str | None, Any]]:
        out: list[tuple[str | None, Any]] = []
        async for item in events:
            raw = item.data
            if isinstance(raw, str) and raw.strip():
                payload: Any = json.loads(raw)
            else:
                payload = raw
            out.append((item.event, payload))
        return out

    return asyncio.run(_run())


def test_alert_score_done_sequence() -> None:
    async def fake_analyze(
        code: str, *, llm: Any, filename: str = "snippet.py"
    ) -> AsyncIterator[AnalysisEvent]:
        yield {
            "event": "alert",
            "data": {
                "id": "a1",
                "file": "users.py",
                "line_start": 1,
                "line_end": 1,
                "severity": "CRITICAL",
                "title": "SQL Injection",
                "description": "owasp",
                "suggestion": "param",
                "category": "SECURITY",
            },
        }
        yield {
            "event": "score",
            "data": {
                "code_health_score": 75,
                "alert_count": {
                    "CRITICAL": 1,
                    "HIGH": 0,
                    "MEDIUM": 0,
                    "LOW": 0,
                },
            },
        }
        yield {
            "event": "done",
            "data": {
                "status": "completed",
                "analysis_id": "aid-1",
                "duration_ms": 10,
            },
        }

    with patch("src.api.routes.analyze.analyze", fake_analyze):
        collected = _collect(
            sse_event_publisher(
                _FakeRequest(),  # type: ignore[arg-type]
                code="x",
                filename="users.py",
                llm=_FakeLlm(),
            )
        )
    named = [(e, p) for e, p in collected if e]
    assert [e for e, _ in named] == ["alert", "score", "done"]
    assert isinstance(named[0][1], dict)
    assert named[0][1]["severity"] == "CRITICAL"
    # Ensure data was JSON (not str(dict) with single quotes)
    assert "'" not in json.dumps(named[0][1])


def test_timeout_emits_only_llm_timeout_ct04() -> None:
    async def fake_analyze(
        code: str, *, llm: Any, filename: str = "snippet.py"
    ) -> AsyncIterator[AnalysisEvent]:
        raise LlmTimeoutError("timeout")
        yield  # pragma: no cover

    with patch("src.api.routes.analyze.analyze", fake_analyze):
        collected = _collect(
            sse_event_publisher(
                _FakeRequest(),  # type: ignore[arg-type]
                code="x",
                filename="a.py",
                llm=_FakeLlm(),
            )
        )
    named = [(e, p) for e, p in collected if e]
    assert len(named) == 1
    assert named[0][0] == "error"
    assert named[0][1]["error"] == "LLM_TIMEOUT"
    assert "analysis_id" in named[0][1]


def test_schema_error_emits_llm_schema_without_alert() -> None:
    async def fake_analyze(
        code: str, *, llm: Any, filename: str = "snippet.py"
    ) -> AsyncIterator[AnalysisEvent]:
        raise LlmSchemaError("bad")
        yield  # pragma: no cover

    with patch("src.api.routes.analyze.analyze", fake_analyze):
        collected = _collect(
            sse_event_publisher(
                _FakeRequest(),  # type: ignore[arg-type]
                code="secret source",
                filename="a.py",
                llm=_FakeLlm(),
            )
        )
    named = [(e, p) for e, p in collected if e]
    assert [e for e, _ in named] == ["error"]
    assert named[0][1]["error"] == "LLM_SCHEMA"


def test_api_down_emits_llm_unavailable() -> None:
    async def fake_analyze(
        code: str, *, llm: Any, filename: str = "snippet.py"
    ) -> AsyncIterator[AnalysisEvent]:
        raise LlmApiError("connection refused")
        yield  # pragma: no cover

    with patch("src.api.routes.analyze.analyze", fake_analyze):
        collected = _collect(
            sse_event_publisher(
                _FakeRequest(),  # type: ignore[arg-type]
                code="x",
                filename="a.py",
                llm=_FakeLlm(),
            )
        )
    named = [(e, p) for e, p in collected if e]
    assert named[0][1]["error"] == "LLM_UNAVAILABLE"


def test_429_emits_rate_limited() -> None:
    async def fake_analyze(
        code: str, *, llm: Any, filename: str = "snippet.py"
    ) -> AsyncIterator[AnalysisEvent]:
        raise LlmApiError("429 Too Many Requests")
        yield  # pragma: no cover

    with patch("src.api.routes.analyze.analyze", fake_analyze):
        collected = _collect(
            sse_event_publisher(
                _FakeRequest(),  # type: ignore[arg-type]
                code="x",
                filename="a.py",
                llm=_FakeLlm(),
            )
        )
    named = [(e, p) for e, p in collected if e]
    assert named[0][1]["error"] == "RATE_LIMITED"


def test_sse_payload_is_json_string_not_str_dict() -> None:
    async def fake_analyze(
        code: str, *, llm: Any, filename: str = "snippet.py"
    ) -> AsyncIterator[AnalysisEvent]:
        yield {
            "event": "score",
            "data": {
                "code_health_score": 100,
                "alert_count": {
                    "CRITICAL": 0,
                    "HIGH": 0,
                    "MEDIUM": 0,
                    "LOW": 0,
                },
            },
        }

    with patch("src.api.routes.analyze.analyze", fake_analyze):
        raw_events: list[Any] = []

        async def _run() -> None:
            async for item in sse_event_publisher(
                _FakeRequest(),  # type: ignore[arg-type]
                code="x",
                filename="a.py",
                llm=_FakeLlm(),
            ):
                raw_events.append(item)

        asyncio.run(_run())

    named = [item for item in raw_events if item.event]
    assert isinstance(named[0].data, str)
    assert named[0].data.startswith("{")
    assert "'" not in named[0].data
    parsed = json.loads(named[0].data)
    assert parsed["code_health_score"] == 100


def test_cancelled_logs_without_code() -> None:
    async def fake_analyze(
        code: str, *, llm: Any, filename: str = "snippet.py"
    ) -> AsyncIterator[AnalysisEvent]:
        raise asyncio.CancelledError()
        yield  # pragma: no cover

    with patch("src.api.routes.analyze.analyze", fake_analyze):
        with patch("src.api.routes.analyze.logger") as mock_logger:
            try:
                _collect(
                    sse_event_publisher(
                        _FakeRequest(),  # type: ignore[arg-type]
                        code="TOP_SECRET_SOURCE",
                        filename="a.py",
                        llm=_FakeLlm(),
                    )
                )
            except asyncio.CancelledError:
                pass
            mock_logger.info.assert_called()
            call_kwargs = mock_logger.info.call_args
            assert call_kwargs.args[0] == "analysis_cancelled"
            extra = call_kwargs.kwargs.get("extra", {})
            assert "TOP_SECRET_SOURCE" not in str(extra)
            assert "analysis_id" in extra
