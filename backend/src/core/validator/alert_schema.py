from __future__ import annotations

from typing import Literal, Self

from pydantic import BaseModel, Field, UUID4, model_validator

Severity = Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
Category = Literal["SECURITY", "PERFORMANCE", "QUALITY", "MAINTAINABILITY"]


class AlertDraft(BaseModel):
    """LLM candidate alert without backend-assigned id."""

    file: str
    line_start: int = Field(ge=1)
    line_end: int = Field(ge=1)
    severity: Severity
    title: str = Field(max_length=120)
    description: str
    suggestion: str
    category: Category

    @model_validator(mode="after")
    def line_end_gte_line_start(self) -> Self:
        if self.line_end < self.line_start:
            raise ValueError("line_end must be >= line_start")
        return self


class AlertItem(AlertDraft):
    """Validated alert with UUID v4 correlation id (RF02)."""

    id: UUID4


class AnalysisLlmResponse(BaseModel):
    """Envelope imposed on Gemini Structured Outputs."""

    alerts: list[AlertDraft]
