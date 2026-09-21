## 1. Setup (depende de C02 e C03 aplicados)

- [x] 1.1 Confirmar C02+C03: `backend/src/main.py`, settings com `GEMINI_API_KEY`, `sse-starlette` no `pyproject.toml`, `analyze()` e `LlmTimeoutError`/`LlmApiError`/`LlmSchemaError` importáveis. Se C02 ou C03 não estiver aplicado, parar e aplicar antes. Verificar: `python -c "from sse_starlette import EventSourceResponse; from src.core.analyzer.orchestrator import analyze"` (ou import equivalente) funciona no venv do backend.
- [x] 1.2 Garantir `httpx` disponível para testes ASGI/SSE (`[dev]`). Verificar: `pip install -e ".[dev]"` exit 0.

## 2. Schema de request (D4) — depende de 1

- [x] 2.1 Implementar `AnalyzeRequest` (`code` não vazio após trim; `language` Literal do enum §5.1; `filename` opcional) em `backend/src/api/schemas/analyze.py` ou na rota. Envelope 422 `INVALID_ANALYZE_REQUEST` alinhado ao handler C02 (`RequestValidationError` ou HTTPException). Verificar: `mypy --strict` aceita o módulo.
- [x] 2.2 Testes unitários em `backend/tests/unit/test_analyze_request_schema.py`: `code` vazio/`"   "` falha; `language` `cobol` falha; pedido válido com e sem `filename` parseia; `auto` aceito. Verificar: `pytest -q tests/unit/test_analyze_request_schema.py` exit 0.

## 3. Rota SSE `POST /api/analyze` (D1–D3, D5) — depende de 2

- [x] 3.1 Implementar `backend/src/api/routes/analyze.py`: validar body → `EventSourceResponse` imediato (`ping=15`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`); publisher faz `json.dumps` de `alert`/`score`/`done`; mapeia exceções C03 para `event: error` (`LLM_TIMEOUT`/`LLM_UNAVAILABLE`/`LLM_SCHEMA`/`RATE_LIMITED`); trata `CancelledError`/`is_disconnected` sem logar `code`; sem `id` SSE. Registrar `include_router(..., prefix="/api")` no app C02. Verificar: OpenAPI lista `POST /api/analyze` e o módulo exporta o router.
- [x] 3.2 Testes unitários do publisher/mapeamento em `backend/tests/unit/test_analyze_sse_publisher.py` com `unittest.mock` do `analyze()`: sequência `alert`→`score`→`done`; timeout → só `error` `LLM_TIMEOUT` (CT04); schema → `LLM_SCHEMA` sem `alert`; API down → `LLM_UNAVAILABLE`; 429 → `RATE_LIMITED`; payload SSE é JSON (não `str(dict)`). Verificar: `pytest -q tests/unit/test_analyze_sse_publisher.py` exit 0. Sem chamada real à Gemini.

## 4. Integração HTTP (spec) — depende de 3

- [x] 4.1 Testes de integração em `backend/tests/integration/test_analyze_endpoint.py` com `httpx.AsyncClient` + patch do orquestrador (fixtures C03 CT01–CT03 como eventos): `code` vazio → 422 sem `text/event-stream`; `language` inválida → 422; pedido válido → 200 `text/event-stream`; CT01 SQL Injection → `alert` CRITICAL/SECURITY + `score` + `done` completed; CT02 secret → CRITICAL/SECURITY; CT03 limpo → zero `alert`, score 100, `done` completed; headers SSE em ≤ 500ms com orquestrador que atrasa o primeiro yield; timeout → `event: error` `LLM_TIMEOUT` sem `done` completed (CT04); schema error → `LLM_SCHEMA` e log sem fonte (CA-RF02-02); capturar logs de sucesso e assertir `analysis_id`/`analysis_duration_ms` sem `code` nem `GEMINI_API_KEY` (RNF03). Verificar: `pytest -q tests/integration/test_analyze_endpoint.py` exit 0 e zero I/O real a Gemini/GitHub/GitLab.

## 5. Qualidade (depende de 2–4)

- [x] 5.1 `cd backend && ruff check src tests --fix --select E,W,F && ruff format src tests && mypy --strict src` exit 0.
- [x] 5.2 `cd backend && pytest -q --cov=src/core --cov-fail-under=80` exit 0 (gate de C03; esta mudança não reduz cobertura de `core/`).
- [x] 5.3 Grep nos handlers/testes de log: nenhuma interpolação do body `code`, `suggestion` ou `GEMINI_API_KEY`; confirmar que a rota não lê a chave do request e que não há persistência (ADR-02). Prompt/Pydantic da LLM permanecem no C03 — esta mudança só retransmite eventos já validados.
