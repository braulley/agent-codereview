## Why

O fluxo crítico do MVP (colar código → Analisar → painel) não existe sem `POST /api/analyze` em SSE (`docs/spec.md` §5.1, RF02, RNF02). C03 já produz o generator `alert*` → `score` → `done` e erros tipados; falta o ponto HTTP que abre o stream, valida o body e traduz falhas para o cliente (RF10, RNF05). Sem isso, C11 não tem contrato para consumir.

## What Changes

- Rota `POST /api/analyze` em `backend/src/api/routes/analyze.py`, prefixo `/api` sem `/v1`.
- Body Pydantic `{code, language, filename?}`: `code` vazio ou `language` fora do enum de §5.1 → HTTP **422** com envelope `{error, message, detail?}`.
- Streaming SSE via `sse-starlette` (`EventSourceResponse`, ADR-01): eventos `alert`, `score`, `done` na ordem de C03; headers SSE em **≤ 500ms** (RNF02), mesmo se o primeiro `alert` só vier depois do JSON Gemini.
- Timeout/API/schema da LLM (já tipados em C03) → evento SSE **`error`** (terminal) e fechamento do stream; toast “Tentar Novamente” permanece no C11.
- Cliente aborta (`CancelledError` / disconnect): log sem payload, sem persistência.
- Log de sucesso: `logger.info("analysis_done", extra={analysis_id, tokens_used, analysis_duration_ms})` — nunca código, diff, `suggestion` ou chaves (RNF03).

**Não é BREAKING** (endpoint ainda não existe).

### Non-goals (MVP)

- Orquestração Gemini, schema de alerta, fórmula de score, cap de 500 linhas (C03).
- `POST /api/diff/ingest` e clientes GitHub/GitLab (C04). A rota analisa o `code` já no body; o frontend (C07/C11) cola o diff ingerido.
- UI, hook `useSSE`, toasts, retry (C11).
- Rate limit por IP (architecture: cota da Gemini no MVP). HTTP **429** de §5.1 só se o provedor sinalizar 429 — mapeado para SSE `error` se o stream já abriu.
- Persistência, fila, Redis, WebSocket (ADR-01, ADR-02).
- Pós-MVP: `/api/v2`, cache por hash, limiter por IP.

## Capabilities

### New Capabilities

- `sse-analyze`: contrato HTTP/SSE de `POST /api/analyze` (validação de input, eventos `alert|score|done|error`, status pré-stream 422/500/503, privacidade e TTFA de abertura do stream).

### Modified Capabilities

- Nenhuma. `openspec list --specs` está vazio; C03 (`llm-orchestration`) não muda requisitos.

## Impact

**Camada:** `backend/` (`api/routes/analyze.py` + registro no app C02). Sem frontend.

**Dependências:** C02 (`sse-starlette`, envelope de erro, settings) e C03 (`analyze()` + `LlmTimeoutError` / `LlmApiError` / `LlmSchemaError`). C04 não é dependência de código da rota.

**Segurança (RNF03):** `GEMINI_API_KEY` só no servidor; body nunca persistido nem logado; nenhum import Gemini no Next.js.

**RNF01 / RNF02:** retransmite só alertas já validados por C03; SSE inicia cedo (ping sse-starlette durante a espera Gemini). TTFA ≤ 1.500ms continua limitado pelo JSON completo (C03 D3).

**CTs:** CT01–CT03 e CT04 (timeout → SSE `error`) no endpoint com LLM mockada; CT05–CT08 são frontend.

**Qualidade:** `ruff`, `mypy --strict`, `pytest --cov=src/core --cov-fail-under=80` (core segue C03; testes da rota em `tests/unit` + `tests/integration`).
