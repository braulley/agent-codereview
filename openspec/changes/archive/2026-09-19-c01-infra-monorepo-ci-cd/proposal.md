## Why

O repositório ainda não tem `frontend/`, `backend/`, `docker-compose.yml` nem CI. Sem essa fundação, C02–C11 não têm onde pousar e o DoD de `docs/spec.md` §8 (setup local em poucos comandos) não é verificável. O `.env.example` atual descreve `CONTEXT7_API_KEY`, `STITCH_API_KEY` e `GLOBAL_PREFIX=api/v1`, o que conflita com `docs/spec.md` (chaves `GEMINI_API_KEY` / `GITHUB_TOKEN` / `GITLAB_TOKEN`; MVP sem versionamento de URL).

## What Changes

- Criar o monorepo vazio conforme `docs/spec.md` §2.3 e `docs/architecture.md`: `frontend/` (Next.js 15 App Router, TypeScript 5.x, Tailwind CSS v4) e `backend/` (Python 3.12+, FastAPI 0.115.x, `pyproject.toml` com extras `[dev]`, árvore `src/` e `tests/`).
- Substituir `.env.example` pelas variáveis do produto: `GEMINI_API_KEY` obrigatória; `GITHUB_TOKEN` e `GITLAB_TOKEN` opcionais. Completar `.gitignore` (`.env`, `.venv`, `node_modules`, `.next`, caches).
- Adicionar `docker-compose.yml` + Dockerfiles (frontend e backend). Serviços `frontend:3000` e `backend:8000`. Sem Postgres, Redis, fila ou volume de dados (ADR-02).
- Adicionar GitHub Actions (`.github/workflows/ci.yml`) com os gates de `AGENTS.md`: ruff, mypy `--strict`, pytest com cobertura, lint/tsc/test/build do frontend. Acionar em push e PR para `main`.
- Stub mínimo de `GET /api/health` (HTTP 200) só para smoke de Compose; o contrato completo de `docs/spec.md` §5.3 fica em C02.

### Non-goals (MVP)

- Rotas de negócio (`POST /api/analyze`, `POST /api/diff/ingest`) e schema completo de health (C02/C05).
- Componentes de produto, Monaco, SSE, Gemini, GitHub/GitLab.
- Banco, fila, Redis, ORM, persistência de código/diff (ADR-02, RNF03).
- CD/deploy, preview hosting, Dependabot, branch protection no GitHub (só o workflow no repo).
- Troca de stack ou versionamento `/api/v1`.

## Capabilities

### New Capabilities

- `monorepo-layout`: layout de pastas, manifests e env de desenvolvimento alinhados à spec.
- `containerization`: Compose de dois serviços, sem datastore, com probe de liveness.
- `ci-quality-gates`: pipeline GitHub Actions com lint, types, testes e build; sem secrets no YAML.

### Modified Capabilities

- Nenhuma (não há specs em `openspec/specs/` ainda).

## Impact

- **Código:** cria `frontend/`, `backend/`, Dockerfiles, `docker-compose.yml`, `.github/workflows/ci.yml`; reescreve `.env.example`; amplia `.gitignore`; README de setup.
- **APIs:** nenhum contrato de negócio. Stub `GET /api/health` (200) para probe; C02 substitui pelo payload `{status, version, gemini_api, timestamp}`.
- **RFs/RNFs:** não implementa RF01–RF10. Habilita o DoD de setup e reforça **RNF03** (chaves só em env de servidor; `.env` fora do git; CI não embute `GEMINI_API_KEY`/`GITHUB_TOKEN`/`GITLAB_TOKEN`; grep de ausência no bundle do frontend). **RNF01/RNF02** não são exercitados aqui (sem LLM/SSE).
- **Segurança/privacidade:** nenhum código submetido é persistido (não há SGBD). Stub de health não loga secrets. Frontend scaffold não recebe `NEXT_PUBLIC_*` de chaves.
- **Dependências novas (a confirmar no apply):** Next.js 15.x, Tailwind v4, FastAPI 0.115.x, Uvicorn, Pydantic v2, ruff, mypy, pytest, pytest-cov. Node 20+ e Python 3.12+ pinados no CI.
- **Bloqueia:** C02 (skeleton FastAPI) e C06 (foundation Next.js).
- **CTs:** nenhum CT01–CT08 nesta mudança.
