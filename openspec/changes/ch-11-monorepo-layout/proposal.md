# CH-11 — Monorepositório na Raiz: `backend/` e `frontend/`

**Tipo:** MVP (infraestrutura de repositório) | **Tamanho:** Médio | **Complexidade:** Baixa | **Risco:** Baixo

## Why

A raiz git `agent-codereview/` já é o workspace de agentes e docs, mas o OpenSpec só resolve em `opencode/`, o frontend ficou em `opencode/frontend/` e o backend Python já vive na raiz (`src/`, `tests/`, `pyproject.toml`). Essa árvore híbrida quebra o CLI OpenSpec na raiz, desalinha `AGENTS.md`/CH-01–CH-10 e impede tratar front e back como apps irmãs. Reorganizar agora (antes de CH-08/09/10) evita retrabalho de caminhos.

## What Changes

- Mover o código Python (`src/`, `tests/`, `pyproject.toml`, `requirements.txt`) para `backend/`, mantendo o pacote `src` e os imports `from src...`.
- Mover `opencode/frontend/` para `frontend/` na raiz.
- Relocar `opencode/openspec/` para `openspec/` na raiz para o CLI funcionar no git root; em seguida remover `opencode/` como pasta de código.
- Atualizar `AGENTS.md`, `README.md`, `openspec/config.yaml`, `roadmap.md` e caminhos em CH-08, CH-09 e CH-10 (ainda in-progress).
- Ajustar comandos de run/test/lint para `cd backend` / `cd frontend`.
- **BREAKING** (apenas DX): `uvicorn opencode.src.main:app` e pytest/ruff apontando para `opencode/` deixam de ser válidos. Contratos HTTP (`/health`, `/webhooks/github`, `/api/v1/analyses`) **não** mudam.

## Capabilities

### New Capabilities

- `monorepo-layout`: layout canônico do repositório (apps irmãs, OpenSpec na raiz, comandos por app).

### Modified Capabilities

- Nenhuma. Specs principais em `openspec/specs/` estão vazias; comportamento de produto (webhook, LLM, dashboard) não muda.

## Non-goals

- Não altera lógica de análise, API REST, UI, fila ou persistência.
- Não introduz npm/pnpm workspaces, CI/CD, Docker da aplicação, auth ou deploy.
- Não reescreve artefatos históricos de CH-01–CH-07 além do necessário para o roadmap.
- Não unifica suites E2E backend/frontend.

## Requisitos Referenciados

- **RNF-13:** Arquitetura modular — front e back isolados como apps, gateways continuam em `backend/src/integrations/`.
- **RNF-15:** Testabilidade — pytest em `backend/tests/`, Vitest/Playwright em `frontend/`; cobertura de `core/` inalterada.
- Nenhum RF de produto (RF-01–RF-09) muda.

## Impacto em segurança / privacidade (LGPD/GDPR)

Neutro: não altera retenção de código-fonte (RNF-07/RNF-08), logs de secrets nem destino de dados. `.env` permanece na raiz e fora do git.

## Impact

- **Código:** move `src/`, `tests/`, `opencode/frontend/`; `pyproject.toml` passa a viver em `backend/` (`pythonpath`, ruff, mypy).
- **APIs:** nenhuma mudança de contrato ou CORS.
- **Deps:** nenhuma biblioteca nova.
- **Sistemas:** `docker-compose.yml` e `.env.example` permanecem na raiz.
- **Governança:** OpenSpec root = git root; skills em `.agents/` já na raiz.
- **Mudanças ativas:** atualizar paths em CH-08, CH-09, CH-10.

## Dependências

- CH-01 e CH-07 concluídas (código a relocar já existe).
- Não bloqueia produto; deve preceder implementação de CH-08+.
