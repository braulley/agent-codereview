## Context

See `proposal.md` for motivation. Current constraints:

- Git root already holds Python `src/`, `tests/`, `pyproject.toml`, `docker-compose.yml`, `.env.example`, `docs/`, `AGENTS.md`, `.agents/`.
- OpenSpec root is nested: `opencode/openspec/` (CLI fails at git root).
- Frontend lives in `opencode/frontend/`; Playwright `testDir` points at `tests/e2e/frontend` relative to the frontend package, with a duplicate spec also under repo `tests/e2e/frontend/`.
- `Settings` loads `env_file=".env"` from process CWD. After the move, uvicorn from `backend/` will not see a root `.env` unless CWD, `env_file` path, or env vars are adjusted.
- `database_url` default is `sqlite+aiosqlite:///./data/analysis_results.db` (relative to CWD).
- This change does **not** alter Webhook → Fila → Worker → LLM (RNF-01 / RNF-03 unaffected). Components `api/`, `core/`, `integrations/`, `queue/` move as a unit under `backend/src/`.

## Goals / Non-Goals

**Goals:**
- Make git root the OpenSpec root and the monorepo root.
- Keep Python import prefix `src` to avoid a mass rename.
- Keep HTTP contracts and Vite proxy `/api` → `localhost:8000`.
- Single move sequence that relocates this change folder along with `openspec/`.

**Non-Goals:**
- Renaming `src` to `codereview_agent` or introducing src-layout vs flat-layout debate.
- npm/pnpm workspaces, Turbo, Nx.
- Changing FastAPI routers, CORS policy, or SQLite schema.

## Decisions

### Decision 1: Sibling directories `backend/` and `frontend/` (Option A)
- **Chosen:** `agent-codereview/{backend,frontend,openspec,docs}`.
- **Why:** Matches the confirmed product decision; two runtimes (Python vs Node) get clear homes; OpenSpec and compose stay shared.
- **Rejected:** Python at git root + only lift frontend (Option B) — leaves the repo looking like “a Python project with a UI folder”.
- **Rejected:** `apps/api` + `apps/web` — extra nesting without a third app.

### Decision 2: Keep package name `src` under `backend/`
- **Chosen:** `backend/src/...`, `from src.api...`, `uvicorn src.main:app` from `backend/`.
- **Why:** Imports, pytest `pythonpath`, ruff `known-first-party`, and mypy `packages` already use `src`.
- **Rejected:** Rename to `codereview_agent` now — large diff unrelated to layout.

### Decision 3: Relocate OpenSpec to git root in the same change
- **Chosen:** `git mv opencode/openspec openspec` (including `changes/ch-11-monorepo-layout`), then delete empty `opencode/`.
- **Why:** `openspec list` from git root is an acceptance criterion; leaving a nested root recreates the bug.
- **Rejected:** Dual roots or a pointer-only `openspec/` stub.

### Decision 4: Shared `.env` at git root, backend-aware load path
- **Chosen:** Keep `.env` / `.env.example` at git root. Update `Settings` `env_file` to resolve the git-root `.env` when CWD is `backend/` (e.g. parent path plus CWD `.env`, without logging secret values).
- **Why:** One local secret file for API + compose; developers already have root `.env`.
- **Rejected:** Duplicate `backend/.env` — drift risk.
- **Rejected:** Require exporting vars only — worse DX on Windows.

### Decision 5: No workspace manager
- **Chosen:** Independent `backend/pyproject.toml` and `frontend/package.json`.
- **Why:** Zero shared JS/Python packages in MVP; workspaces add tooling without benefit.
- **Rejected:** npm workspaces / uv workspace.

### Decision 6: Frontend E2E stays in the frontend package
- **Chosen:** Playwright specs live under `frontend/` (existing `frontend/tests/e2e/...`). Remove or stop treating repo-root `tests/e2e/frontend/` as the SPA suite after Python tests move to `backend/tests/`.
- **Why:** `playwright.config.ts` already belongs to the Node app.

## Risks / Trade-offs

- **[CWD vs root `.env` / SQLite path]** → After `cd backend`, relative `.env` and `./data/*.db` miss the root files. Mitigate by resolving env file from git root and documenting `database_url` or a `backend/data/` default aligned with `.gitignore`.
- **[In-progress OpenSpec paths]** → CH-08/09/10 still say `opencode/src` and `opencode/frontend`. Mitigate by updating those three changes in this change’s tasks; leave completed CH-01–07 as historical.
- **[Moving OpenSpec while applying CH-11]** → The change directory moves mid-implementation. Mitigate with `git mv` of the whole `openspec/` tree first or last as an atomic step; do not copy-delete.
- **[Import / pytest from git root]** → Old `pytest` at repo root will not find `backend/tests`. Mitigate by documenting `cd backend`; optional later wrapper is out of scope.
- **[AGENTS.md uvicorn module]** → `opencode.src.main:app` is already wrong vs current `src.main:app`. Mitigate by rewriting the command block in the same docs pass.

## Migration Plan

1. Create `backend/` and move Python package, tests, and Python metadata into it; fix `pyproject.toml` paths if they assumed git root.
2. Move `opencode/frontend/` → `frontend/`.
3. Move `opencode/openspec/` → `openspec/` (CH-11 moves with it).
4. Remove empty `opencode/` if nothing remains.
5. Point Settings at root `.env`; keep compose at root.
6. Update `AGENTS.md`, `README.md`, `openspec/config.yaml`, `roadmap.md`, CH-08/09/10 paths.
7. Verify: `openspec list` at git root; `pytest` in `backend/`; `npm test` in `frontend/`; `GET /health`.
8. Rollback: reverse `git mv` of the three trees.

No production deploy; local-only.

## Open Questions

None that block this design. Optional later: a root Makefile/`package.json` to orchestrate both apps without workspaces.
