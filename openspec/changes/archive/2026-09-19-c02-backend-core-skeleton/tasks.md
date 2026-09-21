## 1. Packaging e layout

Depende de: C01 ter o scaffold `backend/` **ou** esta mudança criar os arquivos no layout de `docs/spec.md` §2.3 se a pasta ainda não existir.

- [x] 1.1 Criar `backend/src/` com `__init__.py` em `api/`, `api/routes/`, `config/`, `core/`, `core/analyzer/`, `core/validator/`, `core/scorer/`, `integrations/`, `integrations/llm/`, `integrations/github/`, `integrations/gitlab/` e `backend/tests/{unit,integration}/` (sem lógica de negócio). Verificar: os caminhos existem e `core/` / `integrations/` não definem clientes Gemini/GitHub/GitLab.
- [x] 1.2 Completar `backend/pyproject.toml` (Python ≥3.12, `fastapi==0.115.*`, `uvicorn[standard]`, `pydantic>=2,<3`, `pydantic-settings`, `sse-starlette`, extras `[dev]` com ruff, mypy, pytest, pytest-cov, httpx). Não adicionar SGBD/ORM/Redis. Verificar: `cd backend && pip install -e ".[dev]"` exit 0 e o arquivo não cita sqlalchemy/postgres/redis.
- [x] 1.3 Garantir que `.env.example` documenta `GEMINI_API_KEY` (obrigatória), `GITHUB_TOKEN` e `GITLAB_TOKEN` (opcionais) para o backend, sem prefixo `/api/v1`. Verificar: grep no arquivo mostra os três nomes e não introduz `GLOBAL_PREFIX=api/v1` como contrato da API.

## 2. Settings (RNF03)

Depende de: 1.2.

- [x] 2.1 Implementar `backend/src/config/settings.py` com Pydantic Settings v2: `GEMINI_API_KEY` obrigatória; tokens GitHub/GitLab opcionais; versão default `1.0.0`; CORS `http://localhost:3000`. Consultar Context7 (Pydantic Settings) antes de escrever o loader. Verificar: instanciar Settings com env de teste não lê arquivo `.env` de produção e não loga a chave.
- [x] 2.2 Testes unitários em `backend/tests/unit/test_config.py`: key Gemini ausente/vazia levanta ValidationError; tokens opcionais default `None`; Settings não expõe a chave em `repr` se houver configuração para isso. Verificar: `pytest tests/unit/test_config.py -q` exit 0.

## 3. Logging JSON

Depende de: 1.1.

- [x] 3.1 Configurar logging JSON em stdout (formatter + filtro) que aceita extras `analysis_id`, `tokens_used`, `analysis_duration_ms` e nunca serializa `GEMINI_API_KEY` / `GITHUB_TOKEN` / `GITLAB_TOKEN` nem body de request. Verificar: um `logger.info` de teste emite uma linha JSON parseável com `path` ou `msg` e sem o valor da chave.
- [x] 3.2 Testes unitários em `backend/tests/unit/test_logging.py` cobrindo JSON válido e redaction de segredos. Verificar: `pytest tests/unit/test_logging.py -q` exit 0.

## 4. Aplicação FastAPI

Depende de: 2.1, 3.1.

- [x] 4.1 Implementar `backend/src/main.py` e `backend/src/api/dependencies.py`: app FastAPI, CORS para `http://localhost:3000`, `get_settings`, middleware de request (método, path, status; sem body), exception handlers com `{error, message, detail?}`. Prefixo `/api` sem `/v1`. OpenAPI em `/docs` e `/redoc`. Consultar Context7 (FastAPI CORS + exception handlers). Verificar: importar `app` com `GEMINI_API_KEY` no env não levanta; `app.openapi()` lista `/api/health` após a tarefa 5.1.
- [x] 4.2 Testes unitários/integration do envelope de erro: montar (só em teste) uma rota que levanta `Exception` e assertir JSON com `error` e `message` sem segredos. Verificar: `pytest` no arquivo de erro exit 0.

## 5. Health check (`docs/spec.md` §5.3)

Depende de: 4.1.

- [x] 5.1 Implementar `backend/src/api/routes/health.py` em `GET /api/health` com `{status, version, gemini_api, timestamp}`; `gemini_api` = `"reachable"` se a key está na settings, sem HTTP à Gemini. Verificar: schema Pydantic da resposta tem os quatro campos.
- [x] 5.2 Testes unitários em `backend/tests/unit/test_health_route.py`: 200, campos obrigatórios, `gemini_api == "reachable"`, corpo sem nomes/valores das três chaves. Verificar: `pytest tests/unit/test_health_route.py -q` exit 0.
- [x] 5.3 Testes de integração em `backend/tests/integration/test_health_endpoint.py` com `httpx.AsyncClient` + ASGI (sem servidor real, sem respx): 200, `content-type` JSON, tokens opcionais ausentes ainda retornam 200, processo/Settings falha sem `GEMINI_API_KEY`. Verificar: `pytest tests/integration/test_health_endpoint.py -q` exit 0.

## 6. Gate de qualidade

Depende de: 2.2, 3.2, 4.2, 5.2, 5.3.

- [x] 6.1 Rodar na pasta `backend/`: `ruff check src tests --fix --select E,W,F && ruff format src tests`, `mypy --strict src`, `pytest -q --cov=src/config --cov=src/api --cov-fail-under=80`. Verificar: os três blocos com exit 0. Não exigir `--cov=src/core` nesta mudança (pacotes vazios; gate de core é C03).
- [x] 6.2 Smoke opcional com env de teste: `python -m uvicorn src.main:app --host 127.0.0.1 --port 8000` e `curl -s http://127.0.0.1:8000/api/health` → 200. Verificar: JSON com `status=healthy`. Encerrar o processo ao terminar.
