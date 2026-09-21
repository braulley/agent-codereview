import io
import json
import logging

import pytest

from src.config.logging_config import (
    JsonFormatter,
    SecretRedactFilter,
    configure_logging,
)


def _emit(message: str, **extra: object) -> dict[str, object]:
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    handler.addFilter(SecretRedactFilter())
    logger = logging.getLogger("tests.logging")
    logger.handlers = [handler]
    logger.propagate = False
    logger.setLevel(logging.INFO)
    logger.info(message, extra=extra)
    line = stream.getvalue().strip().splitlines()[-1]
    parsed: dict[str, object] = json.loads(line)
    return parsed


def test_log_line_is_json_with_path() -> None:
    payload = _emit("health ok", path="/api/health", analysis_id="a1", tokens_used=3)
    assert payload["msg"] == "health ok"
    assert payload["path"] == "/api/health"
    assert payload["analysis_id"] == "a1"
    assert payload["tokens_used"] == 3


def test_secrets_are_redacted() -> None:
    payload = _emit(
        "using GEMINI_API_KEY",
        GEMINI_API_KEY="should-not-appear",
        GITHUB_TOKEN="gh-secret",
        body={"code": "print(1)"},
    )
    serialized = json.dumps(payload)
    assert "should-not-appear" not in serialized
    assert "gh-secret" not in serialized
    assert "print(1)" not in serialized
    assert "GEMINI_API_KEY" not in serialized
    assert payload["msg"] == "using [redacted]"


def test_configure_logging_writes_json_to_stdout(
    capsys: pytest.CaptureFixture[str],
) -> None:
    configure_logging()
    logging.getLogger("tests.stdout").info("probe", extra={"path": "/api/health"})
    captured = capsys.readouterr()
    line = captured.out.strip().splitlines()[-1]
    payload = json.loads(line)
    assert payload["path"] == "/api/health"
    assert "GEMINI_API_KEY" not in line
