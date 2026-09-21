from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import pytest

from src.core.analyzer.orchestrator import (
    LlmApiError,
    LlmSchemaError,
    LlmTimeoutError,
    MAX_CODE_LINES,
    analyze,
)
from src.integrations.llm.gemini_client import GeminiClientError, GeminiGenerateResult

VALID_ALERT = {
    "file": "users.py",
    "line_start": 12,
    "line_end": 12,
    "severity": "CRITICAL",
    "title": "SQL Injection",
    "description": "OWASP A03",
    "suggestion": "use parameterized query",
    "category": "SECURITY",
}


class FakeLlm:
    def __init__(self, result: GeminiGenerateResult | Exception) -> None:
        self._result = result
        self.calls: list[str] = []

    async def generate(self, code: str) -> GeminiGenerateResult:
        self.calls.append(code)
        if isinstance(self._result, Exception):
            raise self._result
        return self._result


async def _collect(code: str, llm: FakeLlm) -> list[dict[str, Any]]:
    return [event async for event in analyze(code, llm=llm)]


def test_yields_alerts_score_done() -> None:
    llm = FakeLlm(
        GeminiGenerateResult(
            text=json.dumps({"alerts": [VALID_ALERT]}),
            parsed=None,
            tokens_used=10,
        )
    )
    events = asyncio.run(_collect("query = x", llm))
    assert [e["event"] for e in events] == ["alert", "score", "done"]
    assert events[0]["data"]["severity"] == "CRITICAL"
    assert events[1]["data"]["code_health_score"] == 75
    assert events[2]["data"]["status"] == "completed"


def test_unreadable_json_raises_schema_error_without_alert(
    caplog: pytest.LogCaptureFixture,
) -> None:
    llm = FakeLlm(GeminiGenerateResult(text="not-json {{{", parsed=None, tokens_used=0))
    with caplog.at_level(logging.ERROR):
        with pytest.raises(LlmSchemaError):
            asyncio.run(_collect("secret source body", llm))
    joined = " ".join(r.getMessage() for r in caplog.records)
    assert "secret source body" not in joined
    assert "GEMINI_API_KEY" not in joined


def test_invalid_item_skipped_score_from_valid_only() -> None:
    payload = {
        "alerts": [
            VALID_ALERT,
            {**VALID_ALERT, "severity": "NOPE"},
        ]
    }
    llm = FakeLlm(
        GeminiGenerateResult(text=json.dumps(payload), parsed=None, tokens_used=1)
    )
    events = asyncio.run(_collect("code", llm))
    alerts = [e for e in events if e["event"] == "alert"]
    assert len(alerts) == 1
    score = next(e for e in events if e["event"] == "score")
    assert score["data"]["code_health_score"] == 75
    assert score["data"]["alert_count"]["CRITICAL"] == 1


def test_timeout_uses_30s_budget(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_wait_for(awaitable: Any, timeout: float | None = None) -> Any:
        assert timeout == 30.0
        if asyncio.iscoroutine(awaitable):
            awaitable.close()
        raise TimeoutError

    monkeypatch.setattr(asyncio, "wait_for", fake_wait_for)
    llm = FakeLlm(
        GeminiGenerateResult(text='{"alerts":[]}', parsed=None, tokens_used=0)
    )
    with pytest.raises(LlmTimeoutError):
        asyncio.run(_collect("x", llm))


def test_api_down_raises_llm_api_error() -> None:
    llm = FakeLlm(GeminiClientError("503 unavailable"))
    with pytest.raises(LlmApiError):
        asyncio.run(_collect("x", llm))


def test_truncates_to_500_lines_and_log_has_no_body(
    caplog: pytest.LogCaptureFixture,
) -> None:
    lines = "\n".join(f"line_{i}" for i in range(501))
    llm = FakeLlm(
        GeminiGenerateResult(
            text=json.dumps({"alerts": []}),
            parsed=None,
            tokens_used=5,
        )
    )
    with caplog.at_level(logging.INFO):
        events = asyncio.run(_collect(lines, llm))
    assert events[-1]["event"] == "done"
    assert len(llm.calls) == 1
    assert len(llm.calls[0].splitlines()) == MAX_CODE_LINES
    log_blob = " ".join(r.getMessage() for r in caplog.records)
    assert "line_500" not in log_blob
    assert "GEMINI_API_KEY" not in log_blob


def test_success_logs_metadata_without_secrets(
    caplog: pytest.LogCaptureFixture,
) -> None:
    llm = FakeLlm(
        GeminiGenerateResult(
            text=json.dumps({"alerts": [VALID_ALERT]}),
            parsed=None,
            tokens_used=99,
        )
    )
    with caplog.at_level(logging.INFO):
        asyncio.run(_collect("print(1)", llm))
    done_records = [r for r in caplog.records if r.getMessage() == "analysis_done"]
    assert done_records
    record = done_records[0]
    assert getattr(record, "tokens_used") == 99
    assert getattr(record, "analysis_duration_ms") >= 0
    blob = record.getMessage() + str(record.__dict__)
    assert "GEMINI_API_KEY" not in blob
    assert "use parameterized query" not in blob
