## Why

O MVP precisa de um motor de análise confiável (RF02, RF06) antes de expor `POST /api/analyze`. Sem `response_schema` + validação independente (RNF01, ADR-03) e sem o Code Health Score no backend, o C05 não tem eventos `alert|score|done` para retransmitir. Esta mudança é o núcleo de inteligência; o endpoint SSE permanece no C05.

## What Changes

- Cliente Gemini (`gemini-2.5-flash`) no backend, com Structured Outputs em **100%** das chamadas (RNF01).
- Contrato `AlertItem` validado **antes** de qualquer yield (RF02, CA-RF02-01).
- Orquestrador async que gera `analysis_id`, chama a LLM, descarta itens inválidos (CA-RF02-02 / RF10), aplica a fórmula de score (RF06) e emite a sequência `alert*` → `score` → `done`.
- Timeout de 30s na chamada LLM (RF10, CT04) como erro tipado para o C05.
- Cap de 500 linhas no payload enviado à LLM (RNF03); aviso de ingestão de PR continua no C04.
- Logs JSON (`tokens_used`, `analysis_duration_ms`, erros de schema/API) sem código, diff, `suggestion` ou chaves (RNF03).

**Não é BREAKING** (nenhum endpoint público nesta mudança).

### Non-goals (MVP)

- Endpoint SSE `/api/analyze` e mapeamento HTTP 422/429/500/503 (C05).
- Ingestão GitHub/GitLab e campo `truncated` da API de diff (C04).
- Chamadas reais à Gemini em testes; UI, persistência, fila, Redis (ADR-02).
- Pós-MVP: multi-modelo, cache de análise, rate limit por IP.

## Capabilities

### New Capabilities

- `alert-schema`: contrato do alerta (campos, enums, UUID, intervalos de linha) e rejeição de payload inválido.
- `llm-orchestration`: chamada Gemini com schema imposto, prompt determinístico, truncamento pré-LLM, yield de eventos e erros tipados (timeout/API/schema).
- `health-score`: fórmula `max(0, 100 - (CRITICAL×25 + HIGH×10 + MEDIUM×3 + LOW×1))` e contagem por severidade.

### Modified Capabilities

- Nenhum. `openspec list --specs` está vazio.

## Impact

**Camada:** apenas `backend/` (`core/{analyzer,validator,scorer}`, `integrations/llm`). Sem frontend e sem alteração de `/api/*`.

**Dependências:** assume C02 aplicado (`GEMINI_API_KEY` via settings, pacotes, logging JSON). Nova lib: `google-genai` (SDK oficial; `response_schema` / `response_mime_type=application/json`). Testes: `respx` + `unittest.mock`.

**Segurança/privacidade (RNF03):** chave só no servidor; código submetido não é persistido nem logado; cliente Gemini nunca importado no Next.js. Itens inválidos não são retransmitidos (RNF01, RNF05).

**RNF02:** o orquestrador é um async generator para o C05 abrir o SSE em ≤500ms; o TTFA (≤1.500ms) continua limitado pelo primeiro JSON completo da Gemini.

**CTs:** CT01, CT02, CT03 no orquestrador (mocks); CT04 timeout/parse como erros tipados (toast fica no C05/C11).

**Qualidade:** `ruff`, `mypy --strict`, `pytest --cov=src/core --cov-fail-under=80`.
