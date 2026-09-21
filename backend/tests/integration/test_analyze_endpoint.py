"""Integration tests for POST /api/analyze SSE (orchestrator mocked)."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any
from unittest.mock import patch

import httpx

from src.core.analyzer.orchestrator import (
    AnalysisEvent,
    LlmSchemaError,
    LlmTimeoutError,
)
from src.main import app

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"


def _load_fixture(name: str) -> dict[str, Any]:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def _parse_sse(raw: str) -> list[tuple[str, dict[str, Any]]]:
    events: list[tuple[str, dict[str, Any]]] = []
    event_name: str | None = None
    data_lines: list[str] = []
    for line in raw.splitlines():
        if line.startswith("event:"):
            event_name = line[len("event:") :].strip()
        elif line.startswith("data:"):
            data_lines.append(line[len("data:") :].strip())
        elif line == "" and event_name is not None and data_lines:
            payload = json.loads("\n".join(data_lines))
            events.append((event_name, payload))
            event_name = None
            data_lines = []
    if event_name is not None and data_lines:
        payload = json.loads("\n".join(data_lines))
        events.append((event_name, payload))
    return events


async def _post_analyze(
    payload: dict[str, object],
) -> tuple[httpx.Response, str, float]:
    transport = httpx.ASGITransport(app=app)
    started = time.perf_counter()
    async with httpx.AsyncClient(
        transport=transport, base_url="http://testserver"
    ) as client:
        async with client.stream("POST", "/api/analyze", json=payload) as response:
            headers_ms = (time.perf_counter() - started) * 1000
            body = ""
            async for chunk in response.aiter_text():
                body += chunk
            # httpx may not populate .content on stream; rebuild a Response-like view
            return response, body, headers_ms


def _analyze(
    payload: dict[str, object],
) -> tuple[httpx.Response, str, float]:
    return asyncio.run(_post_analyze(payload))


def _alert_from_fixture(fixture_name: str) -> AnalysisEvent:
    raw = _load_fixture(fixture_name)["alerts"][0]
    return {
        "event": "alert",
        "data": {
            "id": "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0c",
            "file": raw["file"],
            "line_start": raw["line_start"],
            "line_end": raw["line_end"],
            "severity": raw["severity"],
            "title": raw["title"],
            "description": raw["description"],
            "suggestion": raw["suggestion"],
            "category": raw["category"],
        },
    }


def _score_event(score: int, critical: int = 0) -> AnalysisEvent:
    return {
        "event": "score",
        "data": {
            "code_health_score": score,
            "alert_count": {
                "CRITICAL": critical,
                "HIGH": 0,
                "MEDIUM": 0,
                "LOW": 0,
            },
        },
    }


def _done_event(
    analysis_id: str = "7c9e6679-7425-40de-944b-e07fc1f90ae7",
) -> AnalysisEvent:
    return {
        "event": "done",
        "data": {
            "status": "completed",
            "analysis_id": analysis_id,
            "duration_ms": 100,
        },
    }


def _post_json(payload: dict[str, object]) -> httpx.Response:
    transport = httpx.ASGITransport(app=app)

    async def _once() -> httpx.Response:
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            return await client.post("/api/analyze", json=payload)

    return asyncio.run(_once())


def test_empty_code_returns_422_not_sse() -> None:
    response = _post_json({"code": "", "language": "python"})
    assert response.status_code == 422
    assert "text/event-stream" not in response.headers.get("content-type", "")
    assert response.json()["error"] == "INVALID_ANALYZE_REQUEST"


def test_invalid_language_returns_422() -> None:
    response = _post_json({"code": "print(1)", "language": "cobol"})
    assert response.status_code == 422
    assert response.json()["error"] == "INVALID_ANALYZE_REQUEST"


def test_valid_request_returns_sse_200() -> None:
    async def fake_analyze(
        code: str, *, llm: Any, filename: str = "snippet.py"
    ) -> AsyncIterator[AnalysisEvent]:
        yield _score_event(100)
        yield _done_event()

    with patch("src.api.routes.analyze.analyze", fake_analyze):
        with patch("src.api.routes.analyze.GeminiClient"):
            response, body, _ = _analyze({"code": "print(1)", "language": "python"})
    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")
    events = _parse_sse(body)
    assert [e for e, _ in events] == ["score", "done"]


def test_ct01_sql_injection_alert_critical_security() -> None:
    async def fake_analyze(
        code: str, *, llm: Any, filename: str = "snippet.py"
    ) -> AsyncIterator[AnalysisEvent]:
        yield _alert_from_fixture("ct01_sql_injection.json")
        yield _score_event(75, critical=1)
        yield _done_event()

    with patch("src.api.routes.analyze.analyze", fake_analyze):
        with patch("src.api.routes.analyze.GeminiClient"):
            _, body, _ = _analyze(
                {
                    "code": 'query = "SELECT * FROM users WHERE id = " + user_input',
                    "language": "python",
                    "filename": "users.py",
                }
            )
    events = _parse_sse(body)
    assert events[0][0] == "alert"
    assert events[0][1]["severity"] == "CRITICAL"
    assert events[0][1]["category"] == "SECURITY"
    assert events[1][0] == "score"
    assert events[2][0] == "done"
    assert events[2][1]["status"] == "completed"


def test_ct02_hardcoded_secret_critical_security() -> None:
    async def fake_analyze(
        code: str, *, llm: Any, filename: str = "snippet.py"
    ) -> AsyncIterator[AnalysisEvent]:
        yield _alert_from_fixture("ct02_hardcoded_secret.json")
        yield _score_event(75, critical=1)
        yield _done_event()

    with patch("src.api.routes.analyze.analyze", fake_analyze):
        with patch("src.api.routes.analyze.GeminiClient"):
            _, body, _ = _analyze(
                {
                    "code": 'API_KEY = "sk-1234567890abcdef"',
                    "language": "python",
                }
            )
    events = _parse_sse(body)
    alert = next(p for e, p in events if e == "alert")
    assert alert["severity"] == "CRITICAL"
    assert alert["category"] == "SECURITY"


def test_ct03_clean_no_alert_score_100() -> None:
    async def fake_analyze(
        code: str, *, llm: Any, filename: str = "snippet.py"
    ) -> AsyncIterator[AnalysisEvent]:
        yield _score_event(100)
        yield _done_event()

    with patch("src.api.routes.analyze.analyze", fake_analyze):
        with patch("src.api.routes.analyze.GeminiClient"):
            _, body, _ = _analyze(
                {"code": "def add(a, b):\n    return a + b\n", "language": "python"}
            )
    events = _parse_sse(body)
    assert all(e != "alert" for e, _ in events)
    score = next(p for e, p in events if e == "score")
    assert score["code_health_score"] == 100
    assert score["alert_count"] == {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0,
    }
    done = next(p for e, p in events if e == "done")
    assert done["status"] == "completed"


def test_sse_headers_within_500ms_with_delayed_orchestrator() -> None:
    """RNF02: http.response.start before orchestrator finishes.

    httpx.ASGITransport buffers the full body, so we measure at the ASGI send
    boundary instead of via client.stream timing.
    """

    async def slow_analyze(
        code: str, *, llm: Any, filename: str = "snippet.py"
    ) -> AsyncIterator[AnalysisEvent]:
        await asyncio.sleep(1.0)
        yield _score_event(100)
        yield _done_event()

    async def _measure() -> tuple[float, int, str]:
        body = json.dumps({"code": "print(1)", "language": "python"}).encode()
        started = time.perf_counter()
        headers_ms = -1.0
        status = 0
        content_type = ""
        request_sent = False
        headers_seen = asyncio.Event()

        async def receive() -> dict[str, Any]:
            nonlocal request_sent
            if not request_sent:
                request_sent = True
                return {"type": "http.request", "body": body, "more_body": False}
            await headers_seen.wait()
            return {"type": "http.disconnect"}

        async def send(message: dict[str, Any]) -> None:
            nonlocal headers_ms, status, content_type
            if message["type"] == "http.response.start":
                headers_ms = (time.perf_counter() - started) * 1000
                status = int(message["status"])
                raw_headers = message.get("headers", [])
                for key, value in raw_headers:
                    if key.lower() == b"content-type":
                        content_type = value.decode()
                headers_seen.set()

        scope: dict[str, Any] = {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/api/analyze",
            "raw_path": b"/api/analyze",
            "query_string": b"",
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
            ],
            "client": ("127.0.0.1", 123),
            "server": ("test", 80),
        }

        with patch("src.api.routes.analyze.analyze", slow_analyze):
            with patch("src.api.routes.analyze.GeminiClient"):
                task = asyncio.create_task(app(scope, receive, send))
                await asyncio.wait_for(headers_seen.wait(), timeout=2.0)
                measured = headers_ms
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                return measured, status, content_type

    headers_ms, status, content_type = asyncio.run(_measure())
    assert status == 200
    assert "text/event-stream" in content_type
    assert headers_ms <= 500


def test_timeout_emits_error_not_completed_ct04() -> None:
    async def fake_analyze(
        code: str, *, llm: Any, filename: str = "snippet.py"
    ) -> AsyncIterator[AnalysisEvent]:
        raise LlmTimeoutError("timeout")
        yield  # pragma: no cover

    with patch("src.api.routes.analyze.analyze", fake_analyze):
        with patch("src.api.routes.analyze.GeminiClient"):
            _, body, _ = _analyze({"code": "print(1)", "language": "python"})
    events = _parse_sse(body)
    assert any(e == "error" and p["error"] == "LLM_TIMEOUT" for e, p in events)
    assert not any(e == "done" and p.get("status") == "completed" for e, p in events)


def test_schema_error_emits_llm_schema_and_log_omits_source(
    caplog: Any,
) -> None:
    secret_code = "TOP_SECRET_SOURCE_BODY_XYZ"

    async def fake_analyze(
        code: str, *, llm: Any, filename: str = "snippet.py"
    ) -> AsyncIterator[AnalysisEvent]:
        raise LlmSchemaError("bad envelope")
        yield  # pragma: no cover

    with caplog.at_level(logging.INFO):
        with patch("src.api.routes.analyze.analyze", fake_analyze):
            with patch("src.api.routes.analyze.GeminiClient"):
                _, body, _ = _analyze({"code": secret_code, "language": "python"})
    events = _parse_sse(body)
    assert any(e == "error" and p["error"] == "LLM_SCHEMA" for e, p in events)
    assert not any(e == "alert" for e, _ in events)
    joined = " ".join(r.getMessage() for r in caplog.records)
    joined += " ".join(str(getattr(r, "analysis_id", "")) for r in caplog.records)
    assert secret_code not in joined
    assert "GEMINI_API_KEY" not in joined


def test_success_log_has_analysis_id_without_code_or_key(
    caplog: Any,
) -> None:
    """RNF03: success path logs analysis_id/duration via C03; never code/key."""
    secret_code = "NEVER_LOG_THIS_SOURCE_CODE"

    async def fake_analyze(
        code: str, *, llm: Any, filename: str = "snippet.py"
    ) -> AsyncIterator[AnalysisEvent]:
        # Simulate C03 success log
        logging.getLogger("src.core.analyzer.orchestrator").info(
            "analysis_done",
            extra={
                "analysis_id": "aid-success-1",
                "tokens_used": 42,
                "analysis_duration_ms": 120,
            },
        )
        yield _score_event(100)
        yield _done_event("aid-success-1")

    with caplog.at_level(logging.INFO):
        with patch("src.api.routes.analyze.analyze", fake_analyze):
            with patch("src.api.routes.analyze.GeminiClient"):
                _analyze({"code": secret_code, "language": "python"})

    messages = [r.getMessage() for r in caplog.records]
    assert any("analysis_done" in m for m in messages)
    full = " ".join(messages) + " ".join(
        str(getattr(r, "__dict__", {})) for r in caplog.records
    )
    assert secret_code not in full
    assert "GEMINI_API_KEY" not in full
    # extras may live on LogRecord
    done_records = [r for r in caplog.records if "analysis_done" in r.getMessage()]
    assert done_records
    assert getattr(done_records[0], "analysis_id", None) == "aid-success-1"
    assert getattr(done_records[0], "analysis_duration_ms", None) == 120
