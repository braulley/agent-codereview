## Purpose

Defines the canonical monorepo layout for CodeReview Agent: sibling `backend/` and `frontend/` apps under the git root, with OpenSpec and shared local infrastructure at that same root, without changing product HTTP behavior.

## ADDED Requirements

### Requirement: RF-ML-01 Canonical sibling applications
**ID:** RF-ML-01 | **Nome:** Aplicações irmãs na raiz | **Prioridade:** Alta | **Ator:** Desenvolvedor / Agente de IA

The git repository root SHALL contain application directories `backend/` (Python API and worker) and `frontend/` (web SPA) as siblings. Application source SHALL NOT live under `opencode/`.

#### Scenario: Repository tree exposes sibling apps
- **WHEN** a developer inspects the git root `agent-codereview/`
- **THEN** the directories `backend/` and `frontend/` MUST exist at that root and MUST contain the Python service and the web SPA respectively.

#### Scenario: opencode is not an application home
- **WHEN** the layout change is complete
- **THEN** there SHALL NOT be application source under `opencode/src` or `opencode/frontend`.

### Requirement: RF-ML-02 OpenSpec root coincides with git root
**ID:** RF-ML-02 | **Nome:** OpenSpec na raiz git | **Prioridade:** Alta | **Ator:** Desenvolvedor / Agente de IA

The OpenSpec planning root SHALL be the git repository root so that `openspec list` succeeds without changing into a nested folder.

#### Scenario: CLI resolves OpenSpec from git root
- **WHEN** `openspec list --json` is executed from the git root
- **THEN** the command SHALL succeed and SHALL report a resolved root at the git repository root (not `opencode/`).

### Requirement: RF-ML-03 Backend package and tests colocation
**ID:** RF-ML-03 | **Nome:** Colocação do backend | **Prioridade:** Alta | **Ator:** Desenvolvedor

The backend application SHALL keep the Python package import prefix `src` and SHALL colocate package code, tests, and Python project metadata under `backend/`.

#### Scenario: Backend is runnable from its directory
- **WHEN** the working directory is `backend/` and the ASGI app is started with `uvicorn src.main:app`
- **THEN** the process SHALL import `src.main` successfully.

#### Scenario: Backend tests run from backend metadata
- **WHEN** `pytest` is executed using `backend/pyproject.toml` from `backend/`
- **THEN** tests under `backend/tests/` SHALL be discovered.

### Requirement: RF-ML-04 Frontend application colocation
**ID:** RF-ML-04 | **Nome:** Colocação do frontend | **Prioridade:** Alta | **Ator:** Desenvolvedor

The web SPA SHALL live under `frontend/` at the git root, including Node project metadata and frontend unit/E2E tests that belong to the SPA.

#### Scenario: Frontend scripts run from frontend directory
- **WHEN** the working directory is `frontend/` and `npm run dev` is executed
- **THEN** the Vite development server SHALL start using `frontend/package.json` and `frontend/vite.config.ts`.

### Requirement: RF-ML-05 HTTP API compatibility
**ID:** RF-ML-05 | **Nome:** Compatibilidade de contratos HTTP | **Prioridade:** Alta | **Ator:** Cliente HTTP / SPA

Relocating source files SHALL NOT change public HTTP contracts. Existing paths and payloads MUST remain valid.

#### Scenario: Health endpoint unchanged
- **WHEN** `GET /health` is sent to the running API
- **THEN** the response SHALL remain `200` with a JSON body that includes `"status": "ok"` and a `"version"` field.

#### Scenario: Results list endpoint unchanged
- **WHEN** `GET /api/v1/analyses` is sent to the running API
- **THEN** the path SHALL remain available and SHALL NOT require a new URL prefix because of the folder move.

Example payload (unchanged contract):

```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

### Requirement: RNF-ML-01 Shared local infrastructure at git root
**ID:** RNF-ML-01 | **Requisito:** Infra local compartilhada | **Critério de aceite mensurável:** compose e env template na raiz

Shared local infrastructure files (`docker-compose.yml`, `.env.example`) SHALL remain at the git root so both apps use the same Redis/RabbitMQ endpoints and documented environment variables.

#### Scenario: Compose stack remains at repository root
- **WHEN** `docker-compose up -d redis rabbitmq` is executed from the git root
- **THEN** Redis SHALL be reachable on port `6379` and RabbitMQ on ports `5672` and `15672`.

### Requirement: RNF-ML-02 Documentation matches layout
**ID:** RNF-ML-02 | **Requisito:** Documentação alinhada à árvore | **Critério de aceite mensurável:** AGENTS.md e README descrevem backend/ e frontend/

Operator and agent documentation at the git root SHALL describe `backend/` and `frontend/` commands and SHALL NOT instruct running the API as `opencode.src.main:app`.

#### Scenario: Agent guide uses new module path
- **WHEN** a developer follows `AGENTS.md` to start the API
- **THEN** the documented command SHALL use `src.main:app` with working directory `backend/`.
