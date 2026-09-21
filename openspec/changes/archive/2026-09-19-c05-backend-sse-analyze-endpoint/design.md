## Context

Ver `proposal.md` (Why) e `specs/sse-analyze/spec.md`. `backend/` ainda não existe neste checkout; C02 cria FastAPI, `/api` sem `/v1`, envelope `{error, message, detail?}` e declara `sse-starlette`. C03 entrega `analyze()` (async generator) e `LlmTimeoutError` / `LlmApiError` / `LlmSchemaError`. C04 não é importado pela rota: o body já traz `code`.

Camada afetada: **somente `backend/`** (`src/api/routes/analyze.py` + include no app C02). Sem UI (`docs/design.md` não aplica). Esta mudança **é** o fluxo `POST /api/analyze` → SSE; o Monaco fica no C11.

Premissas: testes não chamam Gemini (mock do orquestrador). `.env.example` atual (`GLOBAL_PREFIX=api/v1`) diverge de `docs/spec.md`; `docs/*` vence — a rota permanece `/api/analyze`.

## Goals / Non-Goals

**Goals:**

- Adaptar o generator C03 ao fio SSE (`alert` | `score` | `done` | `error`) com headers em ≤ 500ms (RNF02).
- 422 pré-stream para body inválido; falhas LLM pós-stream só via `event: error` (HTTP 500/503 não são mutáveis depois do commit).
- Cancelamento e logs sem vazar fonte ou chaves (RNF03).

**Non-Goals:**

- Reimplementar validação de alerta, score, truncamento ou cliente Gemini.
- Rate limiter por IP; UI/toasts; ingestão de PR.
- Trocar `sse-starlette` por `fastapi.sse` (Context7 documenta os dois; o produto e o C02 já cravaram `sse-starlette`, ADR-01).

## Decisions

### D1 — `sse-starlette.EventSourceResponse` em POST

**Escolha:** `from sse_starlette import EventSourceResponse, ServerSentEvent`; rota `POST` que devolve `EventSourceResponse` imediatamente após o 422-check.

**Por quê:** ADR-01 e C02 D7. Context7 (`/sysid/sse-starlette`): `event`, `data`, `comment`/ping, `request.is_disconnected()`, `CancelledError`. FastAPI 0.128+ tem `fastapi.sse` nativo (também POST), mas mudaria a dependência já declarada.

**Alternativa:** WebSocket — rejeitada (ADR-01). `StreamingResponse` cru — mais código de framing.

**RNF02:** o response é commitado antes de `await` na Gemini. **RNF01:** o adapter só faz `model_dump`/`json.dumps` de eventos já validados; não “conserta” alerta inválido.

### D2 — Abrir SSE cedo; HTTP 5xx só pré-commit

**Escolha:** validar body → `return EventSourceResponse(event_publisher())`. Dentro do publisher: `async for event in analyze(...)` e yield SSE. Exceção C03 → yield `event: error` e return.

**Por quê:** §5.1 lista 500/503/429, mas um stream 200 já enviado não pode mudar o status. RNF02 exige headers em ≤ 500ms; esperar a Gemini quebraria o target (C03 D3: JSON só fecha no último token).

**Mapeamento:**

| Momento | Sinal |
|---|---|
| Body inválido | HTTP 422 `INVALID_ANALYZE_REQUEST` |
| Exceção antes do `EventSourceResponse` | HTTP 500 envelope C02 |
| `LlmTimeoutError` no publisher | SSE `error` / `LLM_TIMEOUT` (CT04) |
| `LlmSchemaError` | SSE `error` / `LLM_SCHEMA` |
| `LlmApiError` indisponível | SSE `error` / `LLM_UNAVAILABLE` |
| `LlmApiError` 429 | SSE `error` / `RATE_LIMITED` |
| Sucesso | `alert*` → `score` → `done` `completed` |

Sem limiter local (architecture: cota da Gemini). Sem `done` `completed` em erro (C03).

**Alternativa:** esperar o primeiro evento e só então decidir 200 vs 503 — viola RNF02.

### D3 — `data` como JSON string; ping; sem `id` SSE

**Escolha:** `ServerSentEvent(event=nome, data=json.dumps(payload, separators=(",", ":")))`. `ping=15` (comment keepalive) enquanto a Gemini demora até 30s. Não setar `id` SSE nem `retry` baixo.

**Por quê:** sse-starlette converte `data` com `str()`; um `dict` viraria `"{'a': 1}"` inválido. FastAPI `fastapi.sse.ServerSentEvent.data` serializa JSON sozinho — não é o caso aqui. Ping evita proxy/idle timeout. `id` + EventSource GET reexecutaria análise cara e stateless; C11 usa `fetch`+`ReadableStream` (EventSource nativo é GET-only).

**RNF02:** ping não atrasa o primeiro `alert`; só mantém o TCP.

### D4 — Adapter fino, sem segunda validação de negócio

**Escolha:** a rota conhece o schema de **request** (`AnalyzeRequest`) e o mapeamento de eventos. Não revalida `AlertItem` (C03 já fez). Truncamento de 500 linhas permanece no orquestrador (C03 D5), inclusive para paste que não passou pelo C04.

**Layout:**

```
backend/src/api/routes/analyze.py     # POST /analyze, publisher SSE
backend/src/api/schemas/analyze.py    # AnalyzeRequest (opcional; pode viver na rota)
```

Include: `app.include_router(analyze.router, prefix="/api")` no `main` C02, ao lado de health e diff.

### D5 — Cancelamento e logs

**Escolha:** no publisher, `try/except` de `asyncio.CancelledError` e `await request.is_disconnected()`; log `analysis_cancelled` só com `analysis_id` se já existir. Sucesso: o C03 já emite `analysis_done`; a rota não duplica o body no log. Middleware C02 não deve logar o JSON do POST.

**RNF03:** chave Gemini nunca no handler; nenhum persist. Disconnect não vaza fonte.

**Alternativa:** background task após disconnect — desperdício de cota e contradiz “stateless por request”.

### D6 — Testes HTTP com orquestrador mockado

**Escolha:** unitários do schema de request; integração com `httpx.AsyncClient` (`stream=True` ou ASGI transport) iterando linhas SSE. `unittest.mock.patch` de `analyze()` (não `respx` na Gemini nesta camada — C03 já cobre o wrapper). Fixtures CT01–CT03 reutilizadas como eventos yieldados.

Não chamar GitHub/GitLab. Não exigir `backend/` existente no propose; o apply cria a rota no layout.

## Risks / Trade-offs

- [TTFA p95 > 1,5s se a Gemini atrasar] → Mitigação: SSE abre em ≤ 500ms (spinner C11); timeout 30s → `LLM_TIMEOUT`; parser incremental rejeitado no C03 (RNF01).
- [Cliente interpreta `error` como `message` genérico] → Mitigação: evento nomeado `error` + código de máquina; C11 escuta o nome. Additive em relação ao exemplo curto de §5.1.
- [Proxy buffering esconde o stream] → Mitigação: headers `Cache-Control: no-cache`, `X-Accel-Buffering: no`; ping 15s.
- [Auto-retry EventSource duplica análise] → Mitigação: POST+fetch no C11; sem `id` SSE.
- [422 do FastAPI default ≠ envelope] → Mitigação: reutilizar handler C02 de `RequestValidationError` **ou** validar `AnalyzeRequest` e raise HTTPException 422 com `INVALID_ANALYZE_REQUEST` para o cliente não ver `{"detail":[...]}`.
- [Cobertura `--cov=src/core`] → A rota não mora em `core/`; gate 80% continua sendo o de C03. Testes desta mudança cobrem `src/api/routes`.

## Migration Plan

1. Aplicar C02 e C03 antes (settings, `sse-starlette`, orquestrador). C04 opcional para o paste.
2. Registrar a rota; probe: `POST /api/analyze` com body mínimo e LLM mockada deve devolver `text/event-stream`.
3. Deploy stateless; rollback = remover o router. Sem migration de banco (ADR-02).
4. Qualidade: `ruff` + `mypy --strict src` + `pytest -q --cov=src/core --cov-fail-under=80`.

## Open Questions

Nenhuma. Evento `error` vs HTTP 503, POST vs EventSource GET, e 429 sem limiter local estão fechados acima (spec + RNF02 + architecture).
