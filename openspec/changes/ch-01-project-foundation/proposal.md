# CH-01 — Fundação do Projeto: Estrutura, Configuração e Entrypoint

**Tipo:** MVP | **Tamanho:** Pequeno | **Complexidade:** Baixa | **Risco:** Baixo

---

## Descrição

Estabelece a estrutura de diretórios canônica do projeto Python, as dependências base (`pyproject.toml` / `requirements.txt`), as configurações via Pydantic Settings, o entrypoint FastAPI com health check e o `docker-compose.yml` para serviços auxiliares (Redis e RabbitMQ) em ambiente local.

Sem esta mudança, nenhuma outra pode ser implementada.

## Escopo Funcional

- Criar estrutura `opencode/src/{api,core/{analyzer,classifier,reporter},integrations/{github,llm},queue,config}` e `opencode/tests/{unit,integration,e2e}` com arquivos `__init__.py`.
- Configurar `pyproject.toml` com dependências: `fastapi`, `uvicorn`, `pydantic-settings`, `redis`, `ruff`, `mypy`, `pytest`, `pytest-cov`, `httpx`, `pytest-mock`.
- Implementar `config/settings.py` com Pydantic BaseSettings (variáveis: `GITHUB_TOKEN`, `GITHUB_WEBHOOK_SECRET`, `GEMINI_API_KEY`, `REDIS_URL`, `RABBITMQ_URL`, `LOG_LEVEL`).
- Implementar `main.py` com `GET /health` retornando `{"status": "ok", "version": "1.0.0"}`.
- Criar `docker-compose.yml` com serviços `redis` e `rabbitmq` (portas padrão).
- Criar `.env.example` documentando todas as variáveis obrigatórias.

## Requisitos Referenciados

- **RNF-13:** Arquitetura modular (gateways isolados em `integrations/`)
- **RNF-14:** Rastreabilidade (preparação de estrutura de logging)
- **RNF-15:** Testabilidade (estrutura de testes desde o início)

## Non-goals

- Não implementa nenhuma lógica de negócio, análise ou integração real.
- Não configura CI/CD ou deploy em cloud.
- Não inclui autenticação nem webhook nesta mudança.

## Dependências

- Nenhuma dependência em outras mudanças (é a base de todas).

## Riscos

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Incompatibilidade de versões de dependências no Windows | Baixa | Fixar versões no `pyproject.toml`; testar com `pip install -e .` |
| Estrutura de diretórios não refletir corretamente o módulo Python | Baixa | Verificar imports com `python -c "import opencode.src.main"` após criação |

## Execução de Linter

```bash
ruff check opencode/src opencode/tests
ruff format --check opencode/src opencode/tests
mypy opencode/src --strict
```

## Testes Unitários Necessários

- `tests/unit/config/test_settings.py` — verificar que `Settings` carrega variáveis de ambiente corretamente e lança `ValidationError` para campos obrigatórios ausentes.
- `tests/unit/api/test_health.py` — verificar que `GET /health` retorna `200 OK` com payload `{"status": "ok", "version": "1.0.0"}` usando `httpx.AsyncClient`.

## Testes de Integração Necessários

- Nenhum nesta mudança (sem integrações externas ativas).

## Testes E2E Necessários

- Nenhum nesta mudança.

## Critério de Conclusão

- Todos os testes unitários passam (`pytest opencode/tests/unit`).
- `ruff check` e `mypy --strict` sem erros.
- `uvicorn opencode.src.main:app --reload` sobe sem erros e `GET /health` retorna `200`.
- `docker-compose up -d redis rabbitmq` sobe os serviços sem erros.
