## Context

Hoje o repo tem docs, OpenSpec e um `.env.example` desalinhado; **não existem** `frontend/`, `backend/`, `docker-compose.yml`, Dockerfiles nem `.github/workflows/`. Motivação: ver `proposal.md` (Why). Comportamento alvo: specs `monorepo-layout`, `containerization`, `ci-quality-gates`.

Camadas desta mudança:

| Camada | O que entra | O que não entra |
|---|---|---|
| `frontend/` | scaffold App Router + pastas vazias de componentes/hooks | hooks, Monaco, tema de `docs/design.md` (C06) |
| `backend/` | `src/main.py`, stub `src/api/routes/health.py`, `pyproject.toml`, árvore `src/core` vazia | analyzer/validator/scorer reais, settings estrito, logging JSON (C02) |

Esta mudança **não altera** o fluxo `POST /api/analyze` → SSE → Monaco (ainda não existe). **RNF01** e **RNF02** não se aplicam. Segurança: **RNF03**.

## Goals / Non-Goals

**Goals:**

- Scaffold reproduzível (local e Compose) nas portas 3000/8000.
- Gates de `AGENTS.md` verdes no CI sem rede real.
- Env de produto correto; chaves só no servidor.

**Non-Goals (nível de design):**

- Tema brutalist / three-pane (`docs/design.md`) — C06.
- CORS, Pydantic Settings e schema §5.3 completo — C02.
- CD, branch protection, Dependabot.

## Decisions

### D1 — Next.js 15 na raiz de `frontend/` (sem `src/`)

Usar `npx create-next-app@15 frontend` com App Router, TypeScript, Tailwind, ESLint, npm. **Não** passar `--src-dir` para ficar `frontend/app/` como em `docs/spec.md` §2.3. `--disable-git`. Não gerar `AGENTS.md` aninhado. Depois criar `components/{Editor,AlertPanel,DiffViewer,HealthDashboard,ui}`, `hooks/`, `lib/`, `types/` vazios (`.gitkeep`).

**Por quê:** `create-next-app@latest` já pode gerar Next 16; a stack mandatória é 15.x. Alternativa rejeitada: `frontend/src/app/` (quebra a árvore da spec).

CLI (apply): `--ts --tailwind --eslint --app --use-npm --import-alias "@/*"`. Test runner: Jest + Testing Library (C06 já assume Jest). Smoke: a home renderiza.

UI C01: página default do scaffold. Paleta/fontes/0px radius de `docs/design.md` ficam para C06.

### D2 — Backend `src/` + Uvicorn `src.main:app`

Layout FastAPI “bigger apps” (routers incluídos no app), mas o pacote raiz é `src/` — não `app/` — para casar com `AGENTS.md` (`uvicorn src.main:app --reload --host 127.0.0.1 --port 8000`). `pyproject.toml` com `[project.optional-dependencies] dev` (ruff, mypy, pytest, pytest-cov, httpx, respx). Instalação: `pip install -e ".[dev]"` (README hoje cita `requirements.txt`; corrigir).

Stub de health em `backend/src/api/routes/health.py` registrado em `main.py`. C02 só enriquece o payload. **Não** validar `GEMINI_API_KEY` no startup (senão CI/Compose quebram); C02 adiciona Pydantic Settings.

`src/core/__init__.py` exporta `__version__ = "1.0.0-MVP"` para o gate `--cov=src/core --cov-fail-under=80` ter pelo menos um statement. Teste unitário importa o pacote. Sem chamadas HTTP reais.

### D3 — Compose com imagens de runtime, dois serviços, sem datastore

`docker-compose.yml` na raiz: `backend` (Python 3.12-slim, `uvicorn src.main:app --host 0.0.0.0 --port 8000`) e `frontend` (multi-stage Next.js, `next start` na 3000). `env_file: .env` só no backend. Sem `postgres`/`redis`. Browser fala com `localhost:3000` e `localhost:8000` (DNS Docker não serve o browser).

**Por quê:** `docker compose up --build` é o caminho canônico. Alternativa (`next dev` + bind-mount) é mais lenta e menos reproduzível para smoke; hot reload fica no fluxo sem Docker.

### D4 — `.env.example` só de produto

Substituir o template atual (`CONTEXT7_API_KEY`, `STITCH_API_KEY`, `GLOBAL_PREFIX=api/v1`) por:

```env
GEMINI_API_KEY=
GITHUB_TOKEN=
GITLAB_TOKEN=
```

Chaves de Cursor/MCP permanecem fora deste arquivo. `.gitignore`: completar `.next/`, `coverage/`, `*.tsbuildinfo`; `.env` já ignorado. **RNF03:** nenhum `NEXT_PUBLIC_*` de chave.

### D5 — CI em dois jobs paralelos

`.github/workflows/ci.yml`: `on.push.branches: [main]` e `on.pull_request.branches: [main]`. Jobs `backend` e `frontend` em `ubuntu-latest`. Node 20 (`actions/setup-node`, `cache: npm`, `frontend/package-lock.json`). Python 3.12 (`actions/setup-python`). Comandos = `AGENTS.md`. Após `npm run build`, grep no `.next` pelas strings `GEMINI_API_KEY`, `GITHUB_TOKEN`, `GITLAB_TOKEN` (falha se achar). Env de CI: `GEMINI_API_KEY=ci-not-a-secret` (placeholder, não secret de produção). Sem CD.

`.nvmrc` = `20`.

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| `create-next-app@latest` puxar Next 16 | Pin `@15` |
| Tailwind v4 vs Next 15 | Deixar o wiring do `create-next-app@15`; C06 consulta Context7 se o tema quebrar |
| `--cov-fail-under=80` em `core/` vazio | D2 (`__version__` + teste) |
| Docker Desktop ausente | README: fluxo local venv/npm (spec `monorepo-layout`) |
| Stub de health divergir de §5.3 | C02 é o dono do contrato completo; C01 só garante `status: healthy` |
| `create-next-app` criar git/AGENTS.md internos | `--disable-git`; remover extras |
| Chave no bundle | Gate de grep (RNF03) |

Trade-off: Compose em modo produção (sem HMR) vs DX. Aceito: smoke reproduzível; DX no `npm run dev` / `--reload`.

## Migration Plan

Greenfield. Não há usuários nem dados. Rollback = revert do commit. Após o apply: `cp .env.example .env`, `docker compose up --build`, `curl` health e `/`. Quem já copiou o `.env.example` antigo deve recriar o `.env`.

## Open Questions

Nenhuma que altere specs ou o recorte de tarefas. Versões patch (Next 15.x, FastAPI 0.115.x) são fixadas no apply via lockfile / `pyproject.toml`.
