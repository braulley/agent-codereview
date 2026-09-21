from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any

from google import genai
from google.genai import types

from src.config.settings import Settings
from src.core.validator.alert_schema import AnalysisLlmResponse
from src.integrations.llm.prompts import SYSTEM_INSTRUCTION

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.6-flash"
GEMINI_FALLBACK_MODELS = ("gemini-3.5-flash", "gemini-2.0-flash")
_MAX_ATTEMPTS = 3
_RETRY_SLEEP_S = 0.4
_RATE_LIMIT_SLEEP_S = 1.5


class GeminiClientError(Exception):
    """SDK / transport failure from the Gemini wrapper."""


@dataclass(frozen=True)
class GeminiGenerateResult:
    text: str | None
    parsed: AnalysisLlmResponse | None
    tokens_used: int


def _is_rate_limited(exc: BaseException) -> bool:
    text = str(exc).lower()
    return (
        "429" in text
        or "resource_exhausted" in text
        or ("rate" in text and "limit" in text)
    )


def _is_not_found(exc: BaseException) -> bool:
    text = str(exc).lower()
    return "404" in text or "not_found" in text or "not found" in text


def _is_retryable(exc: BaseException) -> bool:
    text = str(exc).lower()
    if _is_rate_limited(exc):
        return True
    return "503" in text or "unavailable" in text or "high demand" in text


def _retry_sleep_s(exc: BaseException, attempt: int) -> float:
    base = _RATE_LIMIT_SLEEP_S if _is_rate_limited(exc) else _RETRY_SLEEP_S
    return base * (attempt + 1)


def _generate_config(model: str) -> types.GenerateContentConfig:
    thinking = (
        types.ThinkingConfig(thinking_level="minimal")
        if model == GEMINI_MODEL
        else types.ThinkingConfig(thinking_budget=0)
    )
    return types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=AnalysisLlmResponse,
        temperature=0,
        system_instruction=SYSTEM_INSTRUCTION,
        # 3.6 Flash defaults to thinking_level=medium and often exceeds the 30s
        # LLM budget (CT04). minimal is the supported "near no-thinking" setting.
        thinking_config=thinking,
        # Structured JSON only — AFC would issue extra round-trips against quota.
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )


class GeminiClient:
    """Thin async wrapper around google-genai with mandatory structured output."""

    def __init__(self, settings: Settings, client: genai.Client | None = None) -> None:
        api_key = settings.gemini_api_key.get_secret_value()
        self._client = client or genai.Client(api_key=api_key)

    async def generate(self, code: str) -> GeminiGenerateResult:
        response: Any = None
        last_exc: BaseException | None = None
        models = (GEMINI_MODEL, *GEMINI_FALLBACK_MODELS)
        for model_index, model in enumerate(models):
            config = _generate_config(model)
            for attempt in range(_MAX_ATTEMPTS):
                try:
                    response = await self._client.aio.models.generate_content(
                        model=model,
                        contents=code,
                        config=config,
                    )
                    last_exc = None
                    break
                except Exception as exc:  # noqa: BLE001 — map any SDK failure
                    last_exc = exc
                    can_fallback = model_index < len(models) - 1 and (
                        _is_rate_limited(exc) or _is_not_found(exc)
                    )
                    if _is_not_found(exc) and can_fallback:
                        logger.info(
                            "llm_model_fallback",
                            extra={"model": models[model_index + 1]},
                        )
                        break
                    if _is_retryable(exc) and attempt < _MAX_ATTEMPTS - 1:
                        await asyncio.sleep(_retry_sleep_s(exc, attempt))
                        continue
                    if can_fallback:
                        logger.info(
                            "llm_model_fallback",
                            extra={"model": models[model_index + 1]},
                        )
                        break
                    raise GeminiClientError(str(exc)) from exc
            if last_exc is None:
                break
        if response is None:
            if last_exc is not None:
                raise GeminiClientError(str(last_exc)) from last_exc
            raise GeminiClientError("empty Gemini response")

        text = getattr(response, "text", None)
        parsed = self._coerce_parsed(getattr(response, "parsed", None))
        tokens_used = self._extract_tokens(response)
        return GeminiGenerateResult(text=text, parsed=parsed, tokens_used=tokens_used)

    @staticmethod
    def _coerce_parsed(raw: Any) -> AnalysisLlmResponse | None:
        if raw is None:
            return None
        if isinstance(raw, AnalysisLlmResponse):
            return raw
        if isinstance(raw, dict):
            return AnalysisLlmResponse.model_validate(raw)
        if hasattr(raw, "model_dump"):
            return AnalysisLlmResponse.model_validate(raw.model_dump())
        return None

    @staticmethod
    def _extract_tokens(response: Any) -> int:
        usage = getattr(response, "usage_metadata", None)
        if usage is None:
            return 0
        total = getattr(usage, "total_token_count", None)
        if isinstance(total, int):
            return total
        return 0
