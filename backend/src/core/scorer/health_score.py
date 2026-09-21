from __future__ import annotations

from collections.abc import Sequence
from typing import TypedDict

from src.core.validator.alert_schema import AlertItem, Severity

_WEIGHTS: dict[Severity, int] = {
    "CRITICAL": 25,
    "HIGH": 10,
    "MEDIUM": 3,
    "LOW": 1,
}


class AlertCount(TypedDict):
    CRITICAL: int
    HIGH: int
    MEDIUM: int
    LOW: int


class HealthScoreResult(TypedDict):
    code_health_score: int
    alert_count: AlertCount


def compute_health_score(alerts: Sequence[AlertItem]) -> HealthScoreResult:
    """Pure RF06 formula over already-validated alerts. No I/O."""
    alert_count: AlertCount = {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0,
    }
    for alert in alerts:
        alert_count[alert.severity] += 1

    penalty = sum(alert_count[sev] * weight for sev, weight in _WEIGHTS.items())
    return {
        "code_health_score": max(0, 100 - penalty),
        "alert_count": alert_count,
    }
