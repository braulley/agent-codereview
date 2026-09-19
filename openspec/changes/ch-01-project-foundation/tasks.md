## 1. Estrutura do Projeto e Dependências

- [x] 1.1 Criar a estrutura canônica de diretórios (`src/{api,config,core/{analyzer,classifier,reporter},integrations/{github,llm},queue}` e `tests/{unit,integration,e2e}`) na raiz do repositório com arquivos `__init__.py` e verificar com `python -c "import src"`.
- [x] 1.2 Configurar `pyproject.toml` (ou `requirements.txt`) com dependências base (`fastapi`, `uvicorn`, `pydantic-settings`, `redis`, `ruff`, `mypy`, `pytest`, `pytest-cov`, `httpx`, `pytest-mock`) e verificar instalação executando `pip list`.
- [x] 1.3 Criar `.env.example` documentando todas as variáveis de ambiente obrigatórias e verificar presença dos campos exigidos.

## 2. Configurações e Runtime Base

- [x] 2.1 Implementar `src/config/settings.py` utilizando `pydantic_settings.BaseSettings` para carregar `GITHUB_TOKEN`, `GITHUB_WEBHOOK_SECRET`, `GEMINI_API_KEY`, `REDIS_URL`, `RABBITMQ_URL` e `LOG_LEVEL`.
- [x] 2.2 Criar testes unitários em `tests/unit/config/test_settings.py` validando o carregamento correto de variáveis de ambiente e o lançamento de `ValidationError` quando secrets obrigatórias estiverem ausentes, verificando com `pytest tests/unit/config/test_settings.py`.

## 3. Entrypoint FastAPI e Health Check

- [x] 3.1 Implementar `src/main.py` com app FastAPI e endpoint `GET /health` que retorna `{"status": "ok", "version": "1.0.0"}`.
- [x] 3.2 Criar teste unitário para a API em `tests/unit/api/test_health.py` usando `httpx.AsyncClient` e verificar retorno de HTTP status `200` e payload correto via `pytest tests/unit/api/test_health.py`.

## 4. Servidores Auxiliares e Qualidade

- [x] 4.1 Criar `docker-compose.yml` contendo os serviços `redis` (porta `6379`) e `rabbitmq` (portas `5672` e `15672`) e verificar subida dos containers com `docker-compose ps`.
- [x] 4.2 Executar suíte de testes completa, verificação estática e linting (`pytest`, `ruff check`, `mypy src --strict`) e validar ausência de erros de formatação ou tipagem.
