## Context

Ver `proposal.md` (Why). O repositório ainda não tem `backend/` (C01 não aplicado). `openspec/specs/` está vazio. `.env.example` atual lista chaves de ferramentas e `GLOBAL_PREFIX=api/v1`, o que **diverge** de `docs/spec.md` (`/api/*` sem versão; `GEMINI_API_KEY`, `GITHUB_TOKEN`, `GITLAB_TOKEN`). `docs/*` vence. Esta mudança só toca a camada **backend/** (`src/main.py`, `src/config/`, `src/api/`). Não altera `POST /api/analyze` → SSE → Monaco; RNF01 e RNF02 não são impactados.

## Goals / Non-Goals

**Goals:**

- App FastAPI inicializável com settings tipados e `GET /api/health` conforme §5.3.
- Segredos só no processo servidor (RNF03); logging JSON sem payload de código.
- Envelope de erro estável para rotas futuras.
- Layout de pacotes de `docs/spec.md` §2.3, com `core/` e `integrations/` vazios de lógica.

**Non-Goals:**

- Cliente Gemini, validator, scorer, SSE, ingestão de PR.
- Probe HTTP real à Gemini.
- Frontend, Docker, CI (C01/C06+).
- Corrigir `.env.example` se C01 já o alinhar aos docs; se C01 ainda não o tiver feito, C02 ajusta só as variáveis que Settings lê.

## Decisions

### 1. Settings com Pydantic Settings v2, não `os.getenv` solto

- **Escolha:** `BaseSettings` com `GEMINI_API_KEY: str` obrigatória; tokens GitHub/GitLab `str | None = None`; `APP_VERSION` default `1.0.0`.
- **Por quê:** Falha de boot explícita (ValidationError) se a chave Gemini faltar; tipagem para mypy `--strict`.
- **Alternativa:** dotenv manual — mais código e sem validação.

### 2. `gemini_api` no health = presença da chave, não ping

- **Escolha:** `"reachable"` se a settings tem `gemini_api_key`; sem chamada de rede.
- **Por quê:** C03 introduz o cliente LLM; ping agora criaria dependência circular, flakiness e violaria “testes não chamam Gemini”.
- **Alternativa:** HEAD/generateContent no health — adiado para C03 se o probe real for necessário.
- **RNF03:** a resposta nunca ecoa a chave.

### 3. Prefixo `/api` sem `/v1`

- **Escolha:** router montado em `/api`; health em `/api/health`.
- **Por quê:** `docs/spec.md` e `docs/architecture.md` (MVP sem versionamento). Ignorar `GLOBAL_PREFIX=api/v1` do `.env.example` atual.
- **Alternativa:** `/api/v1` — breaking com o contrato publicado.

### 4. CORS só para origem do frontend local

- **Escolha:** `allow_origins=["http://localhost:3000"]` (browser origin, inclusive com Compose).
- **Por quê:** o editor (C06+) chama o backend em outra origem; mínimo para o MVP local.
- **Alternativa:** `*` — desnecessário e mais permissivo.

### 5. Logging JSON via `logging` stdlib + formatter, não APM

- **Escolha:** um JSON formatter em stdout; filtro/redactor que nunca serializa campos de settings secretos; middleware de request loga método, path, status — não body.
- **Por quê:** `docs/architecture.md` pede stdout JSON (`tokens_used`, `analysis_duration_ms`); C05 preencherá esses extras. Sem Datadog/OpenTelemetry no MVP.
- **RNF03:** nenhum handler persiste body.

### 6. Exception handler global com envelope `{error, message, detail?}`

- **Escolha:** handler FastAPI para `Exception` e, se útil, `RequestValidationError` no mesmo formato.
- **Por quê:** contrato de `docs/architecture.md`; RF10/RNF05 nas rotas de análise (C05) reutilizam o envelope.
- **Alternativa:** HTML/default FastAPI — quebra o cliente.

### 7. `sse-starlette` declarado agora, não usado

- **Escolha:** dependência runtime no `pyproject.toml` desta mudança; nenhum endpoint SSE.
- **Por quê:** C05 assume a lib já no extra de C02; evita churn de lockfile.
- **Alternativa:** adicionar só em C05 — aceitável, mas quebra a fronteira já combinada no stub C02/C05.

### 8. Placeholders `core/` e `integrations/`

- **Escolha:** `__init__.py` vazios (ou docstring mínima) sem módulos de negócio.
- **Por quê:** o layout de §2.3 precisa existir para C03–C05; cobertura `--cov=src/core` sobre pacote vazio não é o gate desta mudança. Gate C02: `pytest --cov=src/config --cov=src/api --cov-fail-under=80`. C03 assume o gate `src/core` ≥ 80%.

### 9. Testes com `httpx.AsyncClient` + `unittest.mock`; sem respx ainda

- **Escolha:** TestClient/ASGI transport contra o app; env via `monkeypatch`/`os.environ`; nenhum HTTP externo.
- **Por quê:** health não chama rede. respx entra em C03/C04.

## Risks / Trade-offs

- [Health mente `reachable` sem ping Gemini] → Documentado; C03 pode promover a probe real sem mudar o schema JSON.
- [C01 não aplicado: `backend/` ausente] → Apply de C02 deve criar os arquivos no layout-alvo, não esperar pastas mágicas; se C01 já tiver `pyproject.toml`, só completar deps.
- [`.env.example` desalinhado com docs] → Settings lê os nomes de `docs/spec.md`; não introduz `api/v1`.
- [Chave Gemini obrigatória mesmo sem LLM] → Boot falha cedo; evita C05 subir “saudável” sem poder analisar.
- [sse-starlette não usado] → Dependência ociosa até C05; custo baixo vs. retrabalho de packaging.

## Migration Plan

- Deploy: processo único stateless; `uvicorn src.main:app --host 127.0.0.1 --port 8000`.
- Probe: `curl -s http://127.0.0.1:8000/api/health` → 200.
- Rollback: remover o serviço; nenhum schema de banco.
- Qualidade (exit 0): `ruff check src tests --fix --select E,W,F && ruff format src tests`; `mypy --strict src`; `pytest -q --cov=src/config --cov=src/api --cov-fail-under=80`.
