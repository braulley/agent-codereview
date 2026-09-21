from __future__ import annotations

import json
import logging
import sys
from typing import Any

TELEMETRY_FIELDS = (
    "analysis_id",
    "tokens_used",
    "analysis_duration_ms",
    "method",
    "path",
    "status",
    "platform",
    "pr_number",
    "truncated",
    "duration_ms",
)

_SECRET_FIELD_NAMES = frozenset(
    {
        "GEMINI_API_KEY",
        "GITHUB_TOKEN",
        "GITLAB_TOKEN",
        "gemini_api_key",
        "github_token",
        "gitlab_token",
        "body",
    }
)


class SecretRedactFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        for name in list(record.__dict__):
            if name in _SECRET_FIELD_NAMES:
                record.__dict__[name] = "[redacted]"
        message = record.getMessage()
        for secret_name in ("GEMINI_API_KEY", "GITHUB_TOKEN", "GITLAB_TOKEN"):
            if secret_name in message:
                record.msg = message.replace(secret_name, "[redacted]")
                record.args = ()
                message = record.getMessage()
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "level": record.levelname,
            "msg": record.getMessage(),
            "logger": record.name,
        }
        for field in TELEMETRY_FIELDS:
            if hasattr(record, field):
                payload[field] = getattr(record, field)
        return json.dumps(payload, default=str)


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    handler.addFilter(SecretRedactFilter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)
