## 1. Ambiente de produto

- [x] 1.1 Substituir `.env.example` por `GEMINI_API_KEY` (obrigatória), `GITHUB_TOKEN` e `GITLAB_TOKEN` (opcionais), sem `GLOBAL_PREFIX`, `CONTEXT7_API_KEY` ou `STITCH_API_KEY`. Verificar: `rg -n "GEMINI_API_KEY|GITHUB_TOKEN|GITLAB_TOKEN|CONTEXT7|STITCH|GLOBAL_PREFIX" .env.example` lista só as três chaves de produto.
- [x] 1.2 Completar `.gitignore` com `.env`, `.venv`, `node_modules/`, `.next/`, `coverage/`, `*.tsbuildinfo` e caches Python. Verificar: `git check-ignore -v .env frontend/.next backend/.venv` reporta ignore.

## 2. Backend scaffold

- [x] 2.1 Criar `backend/pyproject.toml` (FastAPI 0.115.x, uvicorn[standard], Pydantic v2, extras `[dev]`: ruff, mypy, pytest, pytest-cov, httpx, respx) e a árvore `src/{api/routes, core/{analyzer,validator,scorer}, integrations/{llm,github,gitlab}, config}` + `tests/{unit,integration}` com `__init__.py`. Verificar: os diretórios de `docs/spec.md` §2.3 existem; `pip install -e ".[dev]"` em `backend/` exit 0.
- [x] 2.2 Implementar `src/main.py` incluindo o router de `src/api/routes/health.py` (`GET /api/health` → 200 e `{"status":"healthy"}`). Sem validar `GEMINI_API_KEY` no startup. Sem `POST /api/analyze` e sem `POST /api/diff/ingest`. Verificar: `uvicorn src.main:app --host 127.0.0.1 --port 8000` sobe; `curl -s -o NUL -w "%{http_code}" http://127.0.0.1:8000/api/health` é 200; `curl -s -o NUL -w "%{http_code}" -X POST http://127.0.0.1:8000/api/analyze` é 404.
- [x] 2.3 Em `src/core/__init__.py` exportar `__version__ = "1.0.0-MVP"` (pacotes analyzer/validator/scorer vazios). Verificar: `python -c "from src.core import __version__; assert __version__ == '1.0.0-MVP'"`.

## 3. Testes do backend

- [x] 3.1 (depende de 2.2–2.3) Unit: `tests/unit/test_health_route.py` (200 + `status`) e `tests/unit/test_core_package.py` (`__version__`). Sem rede. Verificar: `pytest tests/unit -q` exit 0.
- [x] 3.2 (depende de 2.2) Integration: `tests/integration/test_health_endpoint.py` com `httpx.AsyncClient` + app FastAPI (sem servidor real, sem Gemini). Verificar: `pytest tests/integration -q` exit 0.
- [x] 3.3 (depende de 3.1–3.2) Quality backend. Verificar: `ruff check src tests --select E,W,F`, `ruff format --check src tests`, `mypy --strict src` e `pytest -q --cov=src/core --cov-fail-under=80` todos exit 0.

## 4. Frontend scaffold

- [x] 4.1 Gerar `frontend/` com `npx create-next-app@15` (App Router, TS, Tailwind, ESLint, npm, alias `@/*`, sem `--src-dir`, `--disable-git`). Remover `AGENTS.md`/`CLAUDE.md` aninhados se existirem. Nenhum hook. Componente afetado: `app/page.tsx` (página default). Verificar: `frontend/package.json` tem `next` 15.x; existe `frontend/app/page.tsx`; não existe `frontend/src/`.
- [x] 4.2 (depende de 4.1) Criar pastas vazias `components/{Editor,AlertPanel,DiffViewer,HealthDashboard,ui}`, `hooks/`, `lib/`, `types/` (`.gitkeep`). Nenhum hook implementado. Verificar: os oito caminhos existem.
- [x] 4.3 (depende de 4.1) Adicionar `.nvmrc` com `20` na raiz. Verificar: conteúdo é `20`.

## 5. Testes do frontend

- [x] 5.1 (depende de 4.1) Configurar Jest + Testing Library e smoke da home (`app/page.tsx`; nenhum hook). Verificar: `npm test` em `frontend/` exit 0.
- [x] 5.2 (depende de 5.1) Quality frontend. Verificar: `npm run lint`, `npx tsc --noEmit`, `npm test` e `npm run build` em `frontend/` exit 0; `rg -l "GEMINI_API_KEY|GITHUB_TOKEN|GITLAB_TOKEN" frontend/.next` não encontra matches (RNF03).

## 6. Containerização

- [x] 6.1 (depende de 2.2 e 4.1) `backend/Dockerfile` (Python 3.12-slim, `uvicorn src.main:app --host 0.0.0.0 --port 8000`) e `frontend/Dockerfile` multi-stage (`next start` na 3000). Sem chaves no Dockerfile. Verificar: `rg "GEMINI_API_KEY=|GITHUB_TOKEN=|GITLAB_TOKEN=" backend/Dockerfile frontend/Dockerfile` vazio.
- [x] 6.2 (depende de 6.1) `docker-compose.yml` na raiz: serviços `frontend` e `backend`, portas 3000 e 8000, `env_file: .env` só no backend, sem Postgres/Redis/fila. Verificar: `rg -i "postgres|redis|rabbit|sqlite" docker-compose.yml` vazio; Compose declara as duas portas.
- [x] 6.3 (depende de 1.1 e 6.2) Smoke Compose. Verificar: `docker compose up --build -d` exit 0; `curl -sf http://127.0.0.1:8000/api/health` contém `"status"`/`"healthy"`; `curl -sf -o NUL -w "%{http_code}" http://127.0.0.1:3000` é 200; `docker compose down` exit 0.

## 7. CI

- [x] 7.1 (depende de 3.3 e 5.2) `.github/workflows/ci.yml`: `push` e `pull_request` para `main`; jobs paralelos `backend` e `frontend` com os comandos de `AGENTS.md`; Node 20 + cache npm; Python 3.12. Sem valores reais das três chaves no YAML. Verificar: o arquivo existe; `rg "GEMINI_API_KEY: ['\"]sk-|GITHUB_TOKEN: ['\"]ghp|GITLAB_TOKEN:" .github/workflows/ci.yml` vazio.
- [x] 7.2 (depende de 7.1) No job frontend, após o build, falhar se o artefato `.next` contiver `GEMINI_API_KEY`, `GITHUB_TOKEN` ou `GITLAB_TOKEN`. Verificar: o step de grep está no YAML.

## 8. Documentação de setup

- [x] 8.1 (depende de 2.1) Ajustar README: `pip install -e ".[dev]"` (não `requirements.txt`), fluxo `cp .env.example .env` + `docker compose up --build`, e setup local Windows/Unix. Verificar: `rg "requirements.txt" README.md` vazio no trecho de instalação; o README cita os três comandos acima.
