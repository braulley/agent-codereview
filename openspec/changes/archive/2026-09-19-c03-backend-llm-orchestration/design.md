## Context

C02 (skeleton FastAPI + settings) ainda não está no working tree; esta mudança assume C02 aplicado: `GEMINI_API_KEY` só em env de servidor, logging JSON, pacotes `core/` e `integrations/llm/` vazios. Não há endpoint `/api/analyze` (C05). Ver `proposal.md` (Why). Comportamento normativo: `specs/alert-schema`, `specs/llm-orchestration`, `specs/health-score`.

Camada afetada: **backend/** apenas (`core/validator`, `core/analyzer`, `core/scorer`, `integrations/llm`). Sem UI (`docs/design.md` não aplica).

## Goals / Non-Goals

**Goals:**

- Cliente Gemini isolado, orquestrador async generator e scorer puro, testáveis sem rede.
- Defense-in-depth: schema na chamada **e** validação Pydantic v2 antes de cada yield (RNF01, ADR-03).
- Superfície estável para o C05 mapear eventos → SSE.

**Non-Goals:**

- Não abrir SSE, não tratar disconnect do browser, não definir HTTP 429/503 (C05).
- Não implementar truncamento com campo `truncated` na API de ingestão (C04); aqui o cap de 500 linhas é só última milha antes da LLM.
- Não parser JSON incremental token-a-token.

## Decisions

### D1 — SDK `google-genai` (não `google-generativeai` nem REST cru)

**Escolha:** dependência `google-genai`; `google.genai.Client(api_key=settings.gemini_api_key)` e `client.aio.models.generate_content`.

**Por quê:** Context7 (`/googleapis/python-genai`, `/websites/ai_google_dev_gemini-api`) documenta `GenerateContentConfig(response_mime_type="application/json", response_schema=<Pydantic model>)` em `gemini-2.5-flash`. O pacote legado `google-generativeai` está em desuso.

**Alternativas:** `httpx` direto no REST `generateContent` (mais código, duplica auth/retry); SDK legado (API incompatível).

**Segurança (RNF03):** o cliente vive só no backend; a chave nunca vai ao bundle Next.js.

### D2 — Envelope `{ "alerts": [...] }` e `id` gerado no backend

**Escolha:** schema Gemini = objeto raiz `alerts: list[AlertDraft]` **sem** `id`. O orquestrador atribui `uuid4` e valida `AlertItem` completo (RF02) via Pydantic v2 (`Field(ge=1)`, `max_length=120`, `Literal` de severity/category, `@model_validator(mode="after")` para `line_end >= line_start`).

**Por quê:** Structured Outputs não garante `format: uuid`. `id` é token de correlação nosso, não semântica da LLM. `response.parsed` do SDK **não** substitui `AlertItem.model_validate` (ADR-03).

**Alternativas:** exigir UUID da LLM (descarta alertas bons); confiar só em `response.parsed` (quebra RNF01).

### D3 — `generate_content` completo + yield sequencial (impacto RNF02)

**Escolha:** `await client.aio.models.generate_content(...)` (não stream). O orquestrador é `async def analyze(...) -> AsyncIterator[AnalysisEvent]`. C05 pode enviar headers SSE ao iterar; o primeiro `alert` só após JSON válido.

**Por quê:** JSON estruturado só fecha no último token; stream+parser incremental não reduz TTFA de forma confiável e aumenta risco de parse (RNF01). TTFA p95 ≤ 1.500ms continua dominado pela Gemini; C03 não piora o caminho além dessa espera. `temperature=0` no config para prompts determinísticos.

**Alternativas:** `generate_content_stream` concatenando chunks (mesma latência, mais código); múltiplas chamadas por alerta (pior latência).

### D4 — Erros tipados; timeout 30s

**Escolha:** `asyncio.wait_for(..., timeout=30)` → `LlmTimeoutError`; HTTP/SDK failure → `LlmApiError`; envelope ilegível → `LlmSchemaError` (sem `alert` parciais). Item inválido isolado: log + skip. C05 traduz para SSE/HTTP.

**Por quê:** RF10/CT04 e RNF05 exigem falha recuperável sem persistir fonte. O toast não é desta mudança.

### D5 — Truncamento de 500 linhas no orquestrador

**Escolha:** contar linhas do payload `code` e cortar em 500 **antes** do `contents`. Constante compartilhada no analyzer (não depende do módulo C04).

**Por quê:** RNF03 exige truncar antes da LLM. Paste no `/api/analyze` não passa pelo C04.

### D6 — Layout de módulos e protocolo de eventos

```
backend/src/integrations/llm/gemini_client.py   # wrapper SDK
backend/src/integrations/llm/prompts.py          # system_instruction OWASP + enums
backend/src/core/validator/alert_schema.py        # AlertDraft, AlertItem, AnalysisLlmResponse
backend/src/core/analyzer/orchestrator.py         # analyze() async generator
backend/src/core/scorer/health_score.py           # função pura + alert_count
```

Eventos internos (C05 só adapta nomes SSE de `docs/spec.md` §5.1): `alert` | `score` | `done`. Scorer: `max(0, 100 - (CRITICAL*25 + HIGH*10 + MEDIUM*3 + LOW*1))`. Faixa visual é frontend.

Log de sucesso: `logger.info("analysis_done", extra={"analysis_id", "tokens_used", "analysis_duration_ms"})`. Proibido: código, diff, `suggestion`, `description`, keys.

### D7 — Testes sem rede

Protocolo estreito do cliente LLM (método `generate`) mockado com `unittest.mock` nos unitários do orquestrador. Integração do wrapper: `respx` contra o host da Gemini **ou** mock do `Client` — zero chamadas reais. Fixtures CT01–CT03 calibram o JSON de retorno (não a API real).

## Risks / Trade-offs

- [JSON válido no schema Gemini mas inválido no Pydantic] → Mitigação: validação item a item; skip + log (RNF01).
- [Prompt injection via fonte] → Mitigação: cap 500 linhas; system instruction a tratar o fonte como dados; sem persistência (RNF03).
- [TTFA pior que 1,5s se a Gemini atrasar] → Mitigação: timeout 30s; C05 abre SSE cedo; sem parser incremental falso-otimista.
- [SDK troca `response_schema` vs `response_json_schema`] → Mitigação: Context7 na implementação; teste do cliente que falha se o config não carregar schema.
- [Nova dependência `google-genai`] → Mitigação: pin no `pyproject.toml` do C02/C03; sem uso no frontend.

## Migration Plan

1. Aplicar C02 antes (settings + pacotes).
2. Adicionar `google-genai` em `backend/pyproject.toml`; não copiar a key para o frontend.
3. Deploy: sem migração de dados (ADR-02). Rollback = reverter o pacote; nenhuma fila/tabela.
4. C05 passa a depender do generator; até lá o módulo não é servido por HTTP.

## Open Questions

Nenhuma. Pontos de SDK, envelope, UUID e streaming foram fechados acima (Context7 + RNF01/RNF02).
