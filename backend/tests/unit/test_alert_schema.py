from __future__ import annotations

import pytest
from pydantic import ValidationError

from src.core.validator.alert_schema import AlertDraft, AlertItem

VALID_DRAFT = {
    "file": "users.py",
    "line_start": 12,
    "line_end": 12,
    "severity": "CRITICAL",
    "title": "SQL Injection via concatenação direta de input",
    "description": "OWASP A03 Injection",
    "suggestion": "cursor.execute('SELECT * FROM users WHERE id = ?', (user_input,))",
    "category": "SECURITY",
}


def test_valid_alert_draft_parses() -> None:
    draft = AlertDraft.model_validate(VALID_DRAFT)
    assert draft.severity == "CRITICAL"
    assert draft.category == "SECURITY"


def test_valid_alert_item_with_uuid() -> None:
    item = AlertItem.model_validate(
        {**VALID_DRAFT, "id": "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0c"}
    )
    assert str(item.id) == "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0c"


def test_invalid_severity_rejected() -> None:
    with pytest.raises(ValidationError):
        AlertDraft.model_validate({**VALID_DRAFT, "severity": "URGENT"})


def test_missing_required_field_rejected() -> None:
    payload = {**VALID_DRAFT}
    del payload["title"]
    with pytest.raises(ValidationError):
        AlertDraft.model_validate(payload)


def test_line_start_below_one_rejected() -> None:
    with pytest.raises(ValidationError):
        AlertDraft.model_validate({**VALID_DRAFT, "line_start": 0})


def test_line_end_below_one_rejected() -> None:
    with pytest.raises(ValidationError):
        AlertDraft.model_validate({**VALID_DRAFT, "line_end": 0, "line_start": 0})


def test_line_end_before_start_rejected() -> None:
    with pytest.raises(ValidationError):
        AlertDraft.model_validate({**VALID_DRAFT, "line_start": 10, "line_end": 5})


def test_title_over_120_rejected() -> None:
    with pytest.raises(ValidationError):
        AlertDraft.model_validate({**VALID_DRAFT, "title": "x" * 121})


def test_invalid_id_on_alert_item_rejected() -> None:
    with pytest.raises(ValidationError):
        AlertItem.model_validate({**VALID_DRAFT, "id": "not-a-uuid"})
