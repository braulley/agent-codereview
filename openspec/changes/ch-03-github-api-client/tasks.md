## 1. Modelos de Dados e Exceções do GitHub

- [x] 1.1 Criar `src/integrations/github/models.py` contendo os modelos `PRFile`, `PRMetadata` e `PRDiff` com suporte ao atributo `diff_truncated: bool`. Validar a estrutura importando os modelos no Python e executando `mypy src/integrations/github --strict`.
- [x] 1.2 Criar `src/integrations/github/exceptions.py` contendo as exceções `GitHubClientError` e `RateLimitError`. Validar com `mypy src/integrations/github --strict`.

## 2. Implementação do GitHubClient

- [x] 2.1 Criar `src/integrations/github/client.py` (`GitHubClient`) utilizando `httpx.AsyncClient` para buscar arquivos e metadados de PRs do GitHub, com truncamento de diffs maiores que 500 linhas e captura do cabeçalho de Rate Limit. Validar com `mypy src/integrations/github --strict`.
- [x] 2.2 Criar testes unitários em `tests/unit/integrations/github/test_client.py` utilizando `respx` para mock HTTP das rotas do GitHub, cobrindo parsing de arquivos, truncamento de diff e `RateLimitError`. Validar executando `pytest tests/unit/integrations/github/test_client.py`.

## 3. Implementação do Worker de Processamento de PR

- [x] 3.1 Criar `src/queue/consumer.py` com o leitor de grupo de consumo do Redis Stream. Validar com `mypy src/queue --strict`.
- [x] 3.2 Criar `src/queue/worker.py` (`PRAnalysisWorker`) responsável por consumir o evento de PR do Redis Stream, buscar o diff via `GitHubClient`, gravar o diff no Redis com TTL de 300 segundos e executar até 3 tentativas com backoff exponencial. Validar com `mypy src/queue --strict`.
- [x] 3.3 Criar testes unitários do worker em `tests/unit/queue/test_worker.py` cobrindo o fluxo de consumo, escrita efêmera no Redis com TTL e lógica de retentativas. Validar executando `pytest tests/unit/queue/test_worker.py`.

## 4. Testes de Integração e Verificação de Qualidade

- [x] 4.1 Criar teste de integração em `tests/integration/test_worker_to_github.py` integrando worker e chamada mockada do GitHub Client com escrita no Redis. Validar executando `pytest tests/integration/test_worker_to_github.py`.
- [x] 4.2 Executar checagem de qualidade completa em todo o projeto. Validar rodando `ruff check src tests`, `ruff format --check src tests` e `mypy src --strict`.
