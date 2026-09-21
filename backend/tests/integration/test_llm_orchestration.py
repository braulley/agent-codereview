from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

from src.core.analyzer.orchestrator import analyze
from src.core.validator.alert_schema import AlertDraft
from src.integrations.llm.gemini_client import GeminiGenerateResult

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"

CT01_CODE = 'query = "SELECT * FROM users WHERE id = " + user_input'
CT02_CODE = 'API_KEY = "sk-1234567890abcdef"'
CT03_CODE = "def add(a: int, b: int) -> int:\n    return a + b\n"


def _load_fixture(name: str) -> dict[str, Any]:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def _assert_fixture_drafts(name: str) -> dict[str, Any]:
    payload = _load_fixture(name)
    for item in payload["alerts"]:
        AlertDraft.model_validate(item)
    return payload


class FixtureLlm:
    def __init__(self, fixture_name: str) -> None:
        self._payload = _assert_fixture_drafts(fixture_name)

    async def generate(self, code: str) -> GeminiGenerateResult:
        _ = code
        return GeminiGenerateResult(
            text=json.dumps(self._payload),
            parsed=None,
            tokens_used=7,
        )


async def _events(code: str, fixture: str) -> list[dict[str, Any]]:
    llm = FixtureLlm(fixture)
    return [event async for event in analyze(code, llm=llm)]


def test_ct01_sql_injection_critical_security() -> None:
    events = asyncio.run(_events(CT01_CODE, "ct01_sql_injection.json"))
    alerts = [e for e in events if e["event"] == "alert"]
    assert len(alerts) == 1
    assert alerts[0]["data"]["severity"] == "CRITICAL"
    assert alerts[0]["data"]["category"] == "SECURITY"
    assert events[-1]["event"] == "done"
    assert events[-1]["data"]["status"] == "completed"


def test_ct02_hardcoded_secret_critical_security() -> None:
    events = asyncio.run(_events(CT02_CODE, "ct02_hardcoded_secret.json"))
    alerts = [e for e in events if e["event"] == "alert"]
    assert len(alerts) == 1
    assert alerts[0]["data"]["severity"] == "CRITICAL"
    assert alerts[0]["data"]["category"] == "SECURITY"


def test_ct03_clean_code_score_100() -> None:
    events = asyncio.run(_events(CT03_CODE, "ct03_clean.json"))
    assert [e["event"] for e in events] == ["score", "done"]
    assert events[0]["data"]["code_health_score"] == 100
    assert events[0]["data"]["alert_count"] == {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0,
    }
    assert events[1]["data"]["status"] == "completed"
