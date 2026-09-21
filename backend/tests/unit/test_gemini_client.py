from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pydantic import SecretStr

from src.config.settings import Settings
from src.core.validator.alert_schema import AnalysisLlmResponse
from src.integrations.llm.gemini_client import (
    GeminiClient,
    GeminiClientError,
    GeminiGenerateResult,
)


def _settings() -> Settings:
    return Settings(
        gemini_api_key=SecretStr("test-key-not-real"),
        github_token=None,
        gitlab_token=None,
    )


def test_generate_passes_response_schema_and_json_mime() -> None:
    mock_aio_models = MagicMock()
    mock_response = SimpleNamespace(
        text='{"alerts":[]}',
        parsed=AnalysisLlmResponse(alerts=[]),
        usage_metadata=SimpleNamespace(total_token_count=42),
    )
    mock_aio_models.generate_content = AsyncMock(return_value=mock_response)
    mock_client = MagicMock()
    mock_client.aio.models = mock_aio_models

    client = GeminiClient(_settings(), client=mock_client)
    result = asyncio.run(client.generate("print(1)"))

    assert isinstance(result, GeminiGenerateResult)
    assert result.tokens_used == 42
    assert result.parsed is not None
    assert result.parsed.alerts == []

    kwargs = mock_aio_models.generate_content.await_args.kwargs
    config = kwargs["config"]
    assert config.response_mime_type == "application/json"
    assert config.response_schema is AnalysisLlmResponse
    assert config.temperature == 0
    assert kwargs["model"] == "gemini-3.6-flash"
    thinking = config.thinking_config
    assert thinking is not None
    level = getattr(thinking.thinking_level, "value", thinking.thinking_level)
    assert str(level).lower() == "minimal"
    afc = config.automatic_function_calling
    assert afc is not None
    assert afc.disable is True


def test_generate_maps_sdk_failure() -> None:
    mock_aio_models = MagicMock()
    mock_aio_models.generate_content = AsyncMock(side_effect=RuntimeError("down"))
    mock_client = MagicMock()
    mock_client.aio.models = mock_aio_models

    client = GeminiClient(_settings(), client=mock_client)
    with pytest.raises(GeminiClientError, match="down"):
        asyncio.run(client.generate("x"))
    assert mock_aio_models.generate_content.await_count == 1


def test_generate_retries_503_then_succeeds() -> None:
    mock_aio_models = MagicMock()
    mock_response = SimpleNamespace(
        text='{"alerts":[]}',
        parsed=AnalysisLlmResponse(alerts=[]),
        usage_metadata=SimpleNamespace(total_token_count=1),
    )
    mock_aio_models.generate_content = AsyncMock(
        side_effect=[
            RuntimeError("503 UNAVAILABLE high demand"),
            mock_response,
        ]
    )
    mock_client = MagicMock()
    mock_client.aio.models = mock_aio_models
    client = GeminiClient(_settings(), client=mock_client)

    with patch(
        "src.integrations.llm.gemini_client.asyncio.sleep",
        new_callable=AsyncMock,
    ) as sleep:
        result = asyncio.run(client.generate("print(1)"))

    assert result.tokens_used == 1
    assert mock_aio_models.generate_content.await_count == 2
    sleep.assert_awaited_once_with(0.4)


def test_generate_retries_429_then_succeeds() -> None:
    mock_aio_models = MagicMock()
    mock_response = SimpleNamespace(
        text='{"alerts":[]}',
        parsed=AnalysisLlmResponse(alerts=[]),
        usage_metadata=SimpleNamespace(total_token_count=1),
    )
    mock_aio_models.generate_content = AsyncMock(
        side_effect=[
            RuntimeError("429 RESOURCE_EXHAUSTED rate limit"),
            mock_response,
        ]
    )
    mock_client = MagicMock()
    mock_client.aio.models = mock_aio_models
    client = GeminiClient(_settings(), client=mock_client)

    with patch(
        "src.integrations.llm.gemini_client.asyncio.sleep",
        new_callable=AsyncMock,
    ) as sleep:
        result = asyncio.run(client.generate("print(1)"))

    assert result.tokens_used == 1
    assert mock_aio_models.generate_content.await_count == 2
    sleep.assert_awaited_once_with(1.5)


def test_generate_exhausted_429_raises() -> None:
    mock_aio_models = MagicMock()
    mock_aio_models.generate_content = AsyncMock(
        side_effect=RuntimeError("429 Too Many Requests")
    )
    mock_client = MagicMock()
    mock_client.aio.models = mock_aio_models
    client = GeminiClient(_settings(), client=mock_client)

    with patch(
        "src.integrations.llm.gemini_client.asyncio.sleep",
        new_callable=AsyncMock,
    ):
        with pytest.raises(GeminiClientError, match="429"):
            asyncio.run(client.generate("x"))

    # 3 attempts per model across primary + fallbacks
    assert mock_aio_models.generate_content.await_count == 9
    models = [
        call.kwargs["model"]
        for call in mock_aio_models.generate_content.await_args_list
    ]
    assert models == (
        ["gemini-3.6-flash"] * 3 + ["gemini-3.5-flash"] * 3 + ["gemini-2.0-flash"] * 3
    )


def test_generate_falls_back_to_2_5_after_primary_429() -> None:
    mock_aio_models = MagicMock()
    mock_response = SimpleNamespace(
        text='{"alerts":[]}',
        parsed=AnalysisLlmResponse(alerts=[]),
        usage_metadata=SimpleNamespace(total_token_count=7),
    )
    mock_aio_models.generate_content = AsyncMock(
        side_effect=[
            RuntimeError("429 RESOURCE_EXHAUSTED"),
            RuntimeError("429 RESOURCE_EXHAUSTED"),
            RuntimeError("429 RESOURCE_EXHAUSTED"),
            mock_response,
        ]
    )
    mock_client = MagicMock()
    mock_client.aio.models = mock_aio_models
    client = GeminiClient(_settings(), client=mock_client)

    with patch(
        "src.integrations.llm.gemini_client.asyncio.sleep",
        new_callable=AsyncMock,
    ):
        result = asyncio.run(client.generate("print(1)"))

    assert result.tokens_used == 7
    assert mock_aio_models.generate_content.await_count == 4
    models = [
        call.kwargs["model"]
        for call in mock_aio_models.generate_content.await_args_list
    ]
    assert models[-1] == "gemini-3.5-flash"


def test_generate_skips_missing_fallback_model() -> None:
    mock_aio_models = MagicMock()
    mock_response = SimpleNamespace(
        text='{"alerts":[]}',
        parsed=AnalysisLlmResponse(alerts=[]),
        usage_metadata=SimpleNamespace(total_token_count=3),
    )
    mock_aio_models.generate_content = AsyncMock(
        side_effect=[
            RuntimeError("429 RESOURCE_EXHAUSTED"),
            RuntimeError("429 RESOURCE_EXHAUSTED"),
            RuntimeError("429 RESOURCE_EXHAUSTED"),
            RuntimeError("404 NOT_FOUND"),
            mock_response,
        ]
    )
    mock_client = MagicMock()
    mock_client.aio.models = mock_aio_models
    client = GeminiClient(_settings(), client=mock_client)

    with patch(
        "src.integrations.llm.gemini_client.asyncio.sleep",
        new_callable=AsyncMock,
    ):
        result = asyncio.run(client.generate("print(1)"))

    assert result.tokens_used == 3
    models = [
        call.kwargs["model"]
        for call in mock_aio_models.generate_content.await_args_list
    ]
    assert models == [
        "gemini-3.6-flash",
        "gemini-3.6-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-2.0-flash",
    ]


def test_client_uses_settings_api_key_only() -> None:
    with patch("src.integrations.llm.gemini_client.genai.Client") as client_cls:
        client_cls.return_value = MagicMock()
        GeminiClient(_settings())
        client_cls.assert_called_once_with(api_key="test-key-not-real")
