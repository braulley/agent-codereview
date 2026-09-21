# AGENTS.md — Agent Code Review

Agente de implementação deste monorepo. Prioridades (nessa ordem):
1. Conformidade com `docs/spec.md` e segurança (chaves só no servidor; código submetido não é persistido).
2. Verificação verde: lint, types e testes com exit 0; cobertura de `backend/src/core` ≥ 80%.
3. Diff cirúrgico: mínimo de código; sem feature, abstração ou refactor fora do pedido.

## Comandos

Monorepo já possui `frontend/` e `backend/` no layout abaixo. Não troque a stack.

```bash
cp .env.example .env   # GEMINI_API_KEY obrigatória; GITHUB_TOKEN e GITLAB_TOKEN opcionais
# BACKEND_URL (opcional): rewrite server-side Next `/api/*` → FastAPI; não é secret de produto.
# Compose define BACKEND_URL=http://backend:8000 no serviço frontend.
docker compose up --build
```

```bash
# backend local (Python 3.12+)
cd backend && python -m venv .venv
# Windows: .venv\Scripts\Activate.ps1   |   Unix: source .venv/bin/activate
pip install -e ".[dev]"
uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
# frontend local
cd frontend && npm ci && npm run dev
```

Banco: **não há SGBD no MVP** (ADR-02). Não rode migrations e não adicione Postgres/SQLite/Redis. Sessão fica no frontend. Probe: `curl -s http://127.0.0.1:8000/api/health`.

```bash
cd backend && ruff check src tests --fix --select E,W,F && ruff format src tests
cd backend && mypy --strict src
cd backend && pytest -q --cov=src/core --cov-fail-under=80
cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build
```

Pronto só se os quatro blocos acima retornarem exit 0. Mudança de UI: exercitar no browser colar → Analisar → Aplicar Correção → Ctrl+Z.

## Stack e monorepo

| Camada | Tecnologia | Versão |
|---|---|---|
| Frontend | Next.js App Router, TypeScript, Tailwind CSS | 15.x, 5.x, v4 |
| Editor | `@monaco-editor/react`, `react-diff-viewer-continued` | 4.x |
| Backend | FastAPI, Uvicorn, Pydantic, `sse-starlette` | 0.115.x, 3.12+, v2 |
| LLM | Gemini `gemini-2.5-flash` + `response_schema` | só no backend |
| Infra | Docker Compose; CI GitHub Actions | — |

```
frontend/{app,components/{Editor,AlertPanel,DiffViewer,HealthDashboard,ui},hooks,lib,types}
backend/src/{api/routes,core/{analyzer,validator,scorer},integrations/{llm,github,gitlab},config}
backend/tests/{unit,integration}
docs/  openspec/  docker-compose.yml  .github/workflows/
```

Negócio e truncamento de diff (>500 linhas) só no backend. Estado de sessão só no frontend. Endpoints: `POST /api/analyze` (SSE `alert|score|done`), `POST /api/diff/ingest`, `GET /api/health`.

## Comportamento

1. Declare premissas. Se houver duas interpretações, pergunte; não escolha em silêncio.
2. Escreva o mínimo que resolve o pedido. Sem knobs, wrappers ou “flexibilidade” não solicitados.
3. Edite só o necessário. Não limpe código adjacente. Remova órfãos apenas se **esta** mudança os criou.
4. Transforme a tarefa em critério verificável e itere até os comandos da seção Comandos passarem.

## Qualidade, testes, logging

- Schema de alerta e SSE: `docs/spec.md` RF02 e §5. Backend valida 100% das respostas LLM com Pydantic v2 **antes** de retransmitir.
- CTs obrigatórios: CT01–CT08 (`docs/spec.md` §7). Unit/integration **não** chamam Gemini/GitHub/GitLab — use `respx` / `unittest.mock`.
- Score: `max(0, 100 - (CRITICAL*25 + HIGH*10 + MEDIUM*3 + LOW*1))`.
- Log JSON em stdout (`tokens_used`, `analysis_duration_ms`, erro de schema/API). Erro HTTP: `{error, message, detail?}`. Parsing inválido: log + toast; editor permanece.

```python
logger.info("analysis_done", extra={"analysis_id": aid, "tokens_used": n, "analysis_duration_ms": ms})
# nunca logue código, diff, GEMINI_API_KEY, GITHUB_TOKEN, GITLAB_TOKEN
```

## Governança e terminal

Sempre: ler arquivos; Context7 para libs; ruff/mypy/pytest/npm; `docker compose` local; criar arquivos no layout acima.
Sempre: antes de implementar `backend/src/config` (Settings), alinhar `.env.example` com `docs/spec.md` §2.4 — `GEMINI_API_KEY` obrigatória; `GITHUB_TOKEN` e `GITLAB_TOKEN` opcionais; API em `/api` sem `/v1`. `docs/*` vence. Não carregue Settings contra `CONTEXT7_API_KEY`, `STITCH_API_KEY` ou `GLOBAL_PREFIX`.
Pergunte antes: `git commit`/`push`; nova dependência; mudar contrato `/api/*`; adicionar persistência/fila; alterar CI; git `--force`.
Nunca: `GEMINI_API_KEY`/`GITHUB_TOKEN`/`GITLAB_TOKEN` no bundle client → coloque em env do servidor via `backend/src/config`.
Nunca: chamar Gemini do browser → use `POST /api/analyze`.
Nunca: persistir código/diff → mantenha stateless (ADR-02).
Nunca: commit de `.env`, `git push --force` em `main`, `--no-verify`, IA como author do commit.

## Context7 MCP

Antes de gerar código de Next.js, FastAPI, Pydantic, Tailwind, Monaco ou Gemini:
1. `resolve-library-id` com `libraryName` + `query`
2. `query-docs` com o `libraryId` e **um** conceito por chamada
Não use memória de treino para APIs dessas bibliotecas.

## Workflow

1. Ler o RF/RNF em `docs/spec.md` (ADR em `docs/architecture.md` se a mudança for estrutural).
2. Se a mudança toca Settings ou boot do backend: conferir `.env.example` contra `docs/spec.md` §2.4 e alinhar o exemplo **antes** do loader.
3. Context7 se a tarefa toca API de biblioteca.
4. Implementar o mínimo; mockar bordas externas.
5. Rodar os comandos de qualidade. **Feito** = exit 0 e CTs afetados cobertos.

| Decisão | Escolha |
|---|---|
| UI → Gemini | só backend; frontend usa REST + SSE |
| Streaming | SSE (`sse-starlette`), não WebSocket |
| Estado | frontend in-memory; backend stateless |
| Persistência / fila / Redis | nenhuma no MVP |
| `docs/*` vs `openspec/config.yaml` | `docs/*` vence |
| `docs/*` vs `.env.example` | `docs/*` vence; alinhe o exemplo antes do loader |
| Mudança spec-driven | `openspec/` + `.agents/skills/openspec-*` |

## Aprendizado contínuo

Ao final de cada mudança, no relatório: (1) o que mudou e os comandos/exit codes; (2) o que falhou ou surpreendeu; (3) uma sugestão concreta para `AGENTS.md` ou `docs/` se a falha for evitável por regra. Não edite `AGENTS.md` sem pedido.

## Docs

`docs/problem.md` problema · `docs/prd.md` produto · `docs/spec.md` contratos/CTs/DoD · `docs/architecture.md` stack/ADRs · `docs/design.md` UI · `openspec/` mudanças (não duplique regras daqui).

## Regras
- Antes de Settings/`backend/src/config`: `.env.example` deve declarar `GEMINI_API_KEY` (obrigatória), `GITHUB_TOKEN` e `GITLAB_TOKEN` (opcionais) com os nomes de `docs/spec.md` §2.4. Prefixo `/api` sem `/v1`. Alinhe o exemplo antes de implementar o loader; `docs/*` vence o `.env.example` desalinhado.
- `BACKEND_URL` (opcional em `.env.example`) é rewrite server-side do Next (`frontend/next.config.ts`) para FastAPI; não é secret de produto e não entra em Settings do backend. Compose precisa de `BACKEND_URL=http://backend:8000` no frontend (builder + runtime); o default `127.0.0.1` quebra o rewrite dentro do container.
- Ao iniciar qualquer mudança OpenSpec, verificar se `openspec/config.yaml` está alinhado com `docs/spec.md` e `docs/architecture.md`. Divergências no `context` contaminam os artefatos gerados.