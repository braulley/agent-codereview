## Why

C03–C05 precisam de um processo FastAPI no ar, com configuração segura e um probe HTTP. Sem esse esqueleto, não há `GET /api/health` (`docs/spec.md` §5.3), as chaves ficam sem dono no servidor (RNF03) e o logging JSON de `docs/architecture.md` não existe. Esta mudança é MVP.

## What Changes

- Subir a aplicação FastAPI em `backend/src/main.py` (CORS para o frontend local, OpenAPI em `/docs` e `/redoc`, envelope de erro `{error, message, detail?}`).
- Carregar `GEMINI_API_KEY` (obrigatória), `GITHUB_TOKEN` e `GITLAB_TOKEN` (opcionais) via Pydantic Settings no servidor.
- Expor `GET /api/health` com `{status, version, gemini_api, timestamp}` em `/api` sem versionamento de URL.
- Configurar logging JSON em stdout, sem código, diff ou segredos.
- Completar `backend/pyproject.toml` com FastAPI 0.115.x, Uvicorn, Pydantic v2, pydantic-settings, sse-starlette e extras `[dev]`.
- Criar pacotes `__init__.py` no layout de `docs/spec.md` §2.3 (sem lógica de análise).

### Non-goals (MVP; fora desta mudança)

- `POST /api/analyze`, SSE, ingestão de diff (C03–C05).
- Probe de rede à Gemini; `gemini_api` reflete presença da chave, não latência da API (C03).
- Persistência, fila, Redis, autenticação de usuário (ADR-02).
- Frontend, CI, Docker (C01 / C06+).

## Capabilities

### New Capabilities

- `backend-core`: processo HTTP do backend, settings por ambiente, logging estruturado e health check.

### Modified Capabilities

- Nenhuma. `openspec/specs/` ainda não tem capacidades arquivadas.

## Impact

- **Código:** `backend/src/{main.py,config/,api/}`; placeholders em `core/` e `integrations/`; testes em `backend/tests/{unit,integration}`.
- **API:** adiciona `GET /api/health` (não breaking; o endpoint ainda não existe).
- **Segurança (RNF03):** chaves só em env do servidor; logs e respostas de health não vazam valores; processo falha ao iniciar se `GEMINI_API_KEY` estiver ausente; nenhum handler persiste payload.
- **Dependências:** FastAPI 0.115.x, Uvicorn, Pydantic v2, pydantic-settings, sse-starlette (declarada agora, usada em C05).
- **RFs/RNFs:** contrato §5.3; RNF03; base de envelope de erro para RF10/RNF05. CT01–CT08 não exercitados aqui.
- **Pré-requisito:** C01 deve ter criado o scaffold `backend/`. Pasta `backend/` ainda não existe neste repo.
- **Bloqueia:** C03, C04, C05.
