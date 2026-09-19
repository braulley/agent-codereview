# Technical Design — CH-01 Fundação do Projeto

## Context

Esta mudança estabelece a infraestrutura inicial e arquitetura base da aplicação Python FastAPI para o CodeReview Agent. Para motivação e escopo detalhados, consulte [`proposal.md`](proposal.md).

Componentes diretamente afetados:
- `opencode/src/config/` (Settings via Pydantic)
- `opencode/src/api/` (Entrypoint e health check)
- `opencode/src/core/`, `opencode/src/integrations/`, `opencode/src/queue/` (Estrutura de diretórios para futuras mudanças)
- `opencode/tests/` (Suíte de testes unitários, integração e E2E)

## Goals / Non-Goals

**Goals:**
- Definir a estrutura modular de diretórios alinhada aos princípios da arquitetura hexagonal/Clean Architecture (gateways isolados em `integrations/`, regras em `core/`).
- Centralizar o gerenciamento de configurações via Pydantic Settings com validação rigorosa no startup da aplicação.
- Fornecer um endpoint de health check rápido (`GET /health`) para monitoramento e validação de subida do container/servidor.
- Prover ambiente local containerizado via `docker-compose.yml` para Redis e RabbitMQ.
- Estabelecer os linters (`ruff`, `mypy --strict`) e testes (`pytest`) para garantir qualidade desde o primeiro commit.

**Non-Goals:**
- Implementar conexão ativa ou reativação automática com Redis ou RabbitMQ nesta fase (serão implementadas nas mudanças ch-02 e ch-03).
- Implementar lógica de handlers HTTP para Webhooks do GitHub.

## Decisions

### Decisão 1: Uso de `pydantic-settings` para Gerenciamento de Configurações
- **Opção Escolhida:** `pydantic-settings.BaseSettings` lendo de variáveis de ambiente e arquivo `.env`.
- **Justificativa:** Fornece tipagem estática rigorosa, suporte nativo a FastAPI e Mypy, e falha imediatamente (fail-fast) na inicialização se secrets obrigatórias (`GITHUB_TOKEN`, `GEMINI_API_KEY`) não estiverem configuradas.
- **Alternativas Consideradas:** `os.getenv` simples (sem validação de tipos) ou `python-dotenv` isolado (requer parsing manual).

### Decisão 2: Layout de Pacotes em `opencode/src/` com `__init__.py`
- **Opção Escolhida:** Estrutura explicita de pacotes Python em `opencode/src/` com subpacotes `api`, `config`, `core/{analyzer,classifier,reporter}`, `integrations/{github,llm}`, e `queue`.
- **Justificativa:** Atende ao RNF-13 (isolamento de gateways em `integrations/`), permitindo a substituição do provedor LLM ou APIs externas sem acoplar a lógica de negócio em `core/`.
- **Alternativas Consideradas:** Estrutura plana em nível raiz (torna importações confusas à medida que o projeto cresce).

### Decisão 3: Servidores Auxiliares de Desenvolvinento via `docker-compose.yml`
- **Opção Escolhida:** Utilizar imagens oficiais do Docker Hub (`redis:7-alpine` e `rabbitmq:3-management-alpine`).
- **Justificativa:** Garante paridade entre os ambientes dos desenvolvedores sem requerer instalação nativa de serviços no host.
- **Alternativas Consideradas:** Mock em memória no Python para Redis/RabbitMQ (pode mascarar comportamentos assíncronos reais em desenvolvimento).

## Risks / Trade-offs

- **[Variáveis Obrigatórias no Startup]** → *Risco:* Se a aplicação subir sem `.env` ou variáveis exportadas, a inicialização falhará. *Mitigação:* Fornecer um `.env.example` completo e documentado; capturar `ValidationError` com mensagens descritivas no startup em dev.
- **[Divergência de Caminho de Importação Python]** → *Risco:* Execução de `pytest` ou `uvicorn` a partir do diretório raiz vs subdiretório `opencode`. *Mitigação:* Configurar `PYTHONPATH=.` ou registrar o pacote em `pyproject.toml` (`[build-system]`).
