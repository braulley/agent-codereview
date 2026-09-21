"""MCP server: expõe compute_health_score (RF06) como tool.

Não chama Gemini. Não persiste código. A tool recebe JSON de alertas já
validados (mesmo contrato de AlertItem) e devolve o score da spec.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any
from uuid import uuid4

_REPO = Path(__file__).resolve().parents[1]
_BACKEND = _REPO / "backend"
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from mcp.server import MCPServer
from src.core.scorer.health_score import compute_health_score
from src.core.validator.alert_schema import AlertItem

mcp = MCPServer("agent-codereview-health")

_PLACEHOLDER_FIELDS = {
    "file": "snippet.py",
    "line_start": 1,
    "line_end": 1,
    "title": "issue",
    "description": "desc",
    "suggestion": "fix",
    "category": "SECURITY",
}


def _alerts_from_payload(payload: Any) -> list[AlertItem]:
    if isinstance(payload, str):
        payload = json.loads(payload)
    if not isinstance(payload, list):
        raise ValueError("alerts_json must be a JSON array")
    items: list[AlertItem] = []
    for raw in payload:
        if not isinstance(raw, dict):
            raise ValueError("each alert must be an object")
        merged = {**_PLACEHOLDER_FIELDS, **raw}
        if "id" not in merged:
            merged["id"] = str(uuid4())
        items.append(AlertItem.model_validate(merged))
    return items


@mcp.tool()
def compute_code_health_score(alerts_json: str) -> str:
    """Compute RF06 Code Health Score from a JSON array of alerts.

    Each object may include severity (CRITICAL|HIGH|MEDIUM|LOW). Missing
    fields get safe placeholders. Does not call an LLM and does not store code.
    """
    alerts = _alerts_from_payload(alerts_json)
    result = compute_health_score(alerts)
    return json.dumps(result)


if __name__ == "__main__":
    mcp.run()
