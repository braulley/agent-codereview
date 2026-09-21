"""Unit tests for AnalyzeRequest schema (§5.1)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from src.api.schemas.analyze import AnalyzeRequest


def test_empty_code_fails() -> None:
    with pytest.raises(ValidationError):
        AnalyzeRequest.model_validate({"code": "", "language": "python"})


def test_whitespace_only_code_fails() -> None:
    with pytest.raises(ValidationError):
        AnalyzeRequest.model_validate({"code": "   ", "language": "python"})


def test_invalid_language_cobol_fails() -> None:
    with pytest.raises(ValidationError):
        AnalyzeRequest.model_validate({"code": "print(1)", "language": "cobol"})


def test_valid_without_filename() -> None:
    parsed = AnalyzeRequest.model_validate({"code": "print(1)", "language": "python"})
    assert parsed.code == "print(1)"
    assert parsed.language == "python"
    assert parsed.filename is None


def test_valid_with_filename() -> None:
    parsed = AnalyzeRequest.model_validate(
        {"code": "x = 1", "language": "python", "filename": "main.py"}
    )
    assert parsed.filename == "main.py"


def test_auto_language_accepted() -> None:
    parsed = AnalyzeRequest.model_validate({"code": "fn main() {}", "language": "auto"})
    assert parsed.language == "auto"
