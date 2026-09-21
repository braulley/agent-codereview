from __future__ import annotations

from uuid import uuid4

from src.core.scorer.health_score import compute_health_score
from src.core.validator.alert_schema import AlertItem

_BASE = {
    "file": "a.py",
    "line_start": 1,
    "line_end": 1,
    "title": "issue",
    "description": "desc",
    "suggestion": "fix",
    "category": "SECURITY",
}


def _alert(severity: str) -> AlertItem:
    return AlertItem.model_validate({**_BASE, "id": str(uuid4()), "severity": severity})


def test_empty_list_score_100() -> None:
    result = compute_health_score([])
    assert result["code_health_score"] == 100
    assert result["alert_count"] == {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0,
    }


def test_one_critical_score_75() -> None:
    result = compute_health_score([_alert("CRITICAL")])
    assert result["code_health_score"] == 75
    assert result["alert_count"]["CRITICAL"] == 1


def test_mixed_severities_score_49() -> None:
    alerts = (
        [_alert("CRITICAL")]
        + [_alert("HIGH") for _ in range(2)]
        + [_alert("MEDIUM")]
        + [_alert("LOW") for _ in range(3)]
    )
    result = compute_health_score(alerts)
    assert result["code_health_score"] == 49
    assert result["alert_count"] == {
        "CRITICAL": 1,
        "HIGH": 2,
        "MEDIUM": 1,
        "LOW": 3,
    }


def test_four_critical_saturates_at_zero() -> None:
    result = compute_health_score([_alert("CRITICAL") for _ in range(4)])
    assert result["code_health_score"] == 0


def test_five_critical_never_negative() -> None:
    """RF06 / CA-RF06-02: score saturates at 0. A naive 100-(25*5) would expect -25."""
    result = compute_health_score([_alert("CRITICAL") for _ in range(5)])
    assert result["code_health_score"] == 0
    assert result["code_health_score"] >= 0
