"""Request schema for POST /api/analyze (§5.1)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, field_validator

AnalyzeLanguage = Literal[
    "python",
    "javascript",
    "typescript",
    "java",
    "go",
    "php",
    "ruby",
    "auto",
]


class AnalyzeRequest(BaseModel):
    code: str
    language: AnalyzeLanguage
    filename: str | None = None

    @field_validator("code")
    @classmethod
    def code_must_be_non_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("O campo code não pode ser vazio.")
        return value
