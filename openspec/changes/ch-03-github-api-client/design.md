## Context

A arquitetura do **CodeReview Agent** adota o padrão Event-Driven Assíncrono. O webhook receiver (implementado em CH-02) recebe os eventos do GitHub, valida o HMAC e publica uma mensagem no Redis Stream. 

Esta mudança (CH-03) especifica o lado consumidor da infraestrutura assíncrona (`PRAnalysisWorker`) e o cliente de comunicação com a API do GitHub (`GitHubClient`). O objetivo é buscar os metadados do PR e o diff dos arquivos alterados, armazenar o diff temporariamente no Redis com TTL curto e preparar os dados para o motor de análise.

Para motivações e escopo detalhado, veja [proposal.md](file:///d:/bkp%20do%20meu%20pc/Pos%20Lato%20Sensu%20-%20Engenharia%20de%20software/Fundamentos%20de%20IA%20Generativa%20e%20Princ%C3%ADpios%20de%20Produtividade/agent-codereview/opencode/openspec/changes/ch-03-github-api-client/proposal.md).

## Goals / Non-Goals

**Goals:**
- Implementar `src/integrations/github/client.py` (`GitHubClient`) assíncrono para as rotas `GET /repos/{owner}/{repo}/pulls/{pull_number}` e `GET /repos/{owner}/{repo}/pulls/{pull_number}/files`.
- Implementar os modelos de dados tipados `PRFile`, `PRMetadata` e `PRDiff` em `src/integrations/github/models.py`.
- Suportar truncamento de diffs que excedem 500 linhas acumuladas com flag `diff_truncated: true` e log estruturado.
- Tratar rate limit da GitHub API via exceção customizada `RateLimitError`.
- Implementar `src/queue/worker.py` (`PRAnalysisWorker`) para consumo em loop assíncrono do Redis Stream com retry de até 3 vezes e backoff exponencial (RNF-06).
- Garantir retenção efêmera do diff no Redis com TTL de 300 segundos (RNF-07).
- Manter tipagem estrita via `mypy --strict` e cobertura de testes unitários/integração com mocks (`respx`).

**Non-Goals:**
- Não implementa o motor de análise LLM (o worker repassa para um stub de `Analyzer`).
- Não envia comentários ou reviews de volta para a API do GitHub.
- Não suporta múltiplos provedores de Git (ex.: GitLab, Bitbucket) nesta etapa.

## Decisions

### 1. Módulos e Componentes Afetados
- **`src/integrations/github/`**:
  - `models.py`: Dataclasses / Pydantic models para `PRFile`, `PRMetadata`, `PRDiff`.
  - `client.py`: `GitHubClient` desacoplado utilizando `httpx.AsyncClient`.
  - `exceptions.py`: Exceções customizadas `GitHubClientError` e `RateLimitError`.
- **`src/queue/`**:
  - `consumer.py`: Configuração do grupo de consumo do Redis Stream (`xreadgroup`).
  - `worker.py`: Loop do `PRAnalysisWorker` que orquestra a leitura do diff, escrita efêmera no Redis e despacho para análise.

### 2. Cliente HTTP Assíncrono (`httpx.AsyncClient`) e Isolação (RNF-13)
- **Decisão**: Utilizar `httpx.AsyncClient` encapsulado dentro da classe `GitHubClient`.
- **Justificativa**: `httpx` oferece suporte completo a `async/await`, excelente performance e facilidade de teste isolado com a biblioteca `respx`. Encapsular todas as chamadas HTTP dentro da camada `integrations/github/` atende estritamente à RNF-13, permitindo alterar o cliente ou provedor sem impactar o `core`.
- **Alternativa Considerada**: Bibliotecas como `PyGithub` ou `githubkit`. Foram descartadas por adicionar dependências pesadas e ocultar o controle fino de rate limiting e truncamento customizado de diffs.

### 3. Truncamento de Diff em 500 Linhas
- **Decisão**: Ao processar a lista de `PRFile`, o cliente acumula o número de linhas adicionadas/removidas. Se o total ultrapassar 500 linhas, os patches subsequentes são truncados, a string final do patch recebe um marcador de corte e a flag `diff_truncated=True` é definida no `PRDiff`.
- **Justificativa**: Evita estourar a janela de contexto de modelos LLM e custos desnecessários no MVP.

### 4. Impacto nos Requisitos Não-Funcionais RNF-01 e RNF-03
- **RNF-01 (Webhook Response < 3s)**: O endpoint HTTP de webhook apenas recebe a notificação do GitHub e insere a mensagem na fila do Redis Stream, respondendo 202 Accepted em milissegundos. A busca de arquivos na API do GitHub via `GitHubClient` é executada de forma 100% assíncrona pelo `PRAnalysisWorker`, garantindo que oscilações de latência do GitHub não afetem a resposta ao webhook.
- **RNF-03 (Resiliência e Desacoplamento)**: A arquitetura desacoplada via Redis Stream isola a ingestão de eventos da execução das chamadas à API do GitHub, permitindo reprocessamento e retentativas em caso de falha sem perda de mensagens.

### 5. Armazenamento Efêmero com TTL no Redis (RNF-07)
- **Decisão**: O worker grava o diff serializado em JSON na chave Redis `codereview:diff:{pr_id}` utilizando `SET` com argumento `ex=300` (TTL de 5 minutos).
- **Justificativa**: Atende diretamente à RNF-07 (código-fonte nunca persistido permanentemente) e às normas de privacidade (LGPD/GDPR). Após 300 segundos, o Redis expira e apaga a chave automaticamente.

### 6. Estratégia de Retry com Backoff Exponencial (RNF-06)
- **Decisão**: O `PRAnalysisWorker` captura exceções transitórias de rede (`httpx.HTTPError`, `httpx.TimeoutException`) e re-executa a tentativa até 3 vezes, com intervalos de 1s, 2s e 4s.
- **Justificativa**: Garante resiliência sem travar indefinidamente a fila do worker. Se as 3 tentativas falharem, a mensagem é enviada para um log de erro / Dead Letter Queue (DLQ).

## Risks / Trade-offs

| Risco | Mitigação |
|-------|-----------|
| Esgotamento do Rate Limit da GitHub API durante picos de uso | Monitorar os cabeçalhos `X-RateLimit-Remaining` e `X-RateLimit-Reset`. Caso zere, lançar `RateLimitError` detalhado e pausar reprocessamento até o reset. |
| Vazamento acidental de tokens `GITHUB_TOKEN` em logs de exceção | Sanitizar objetos de exceção e instâncias de cliente. Nunca incluir o cabeçalho `Authorization` nas mensagens de log. |
| Perda de mensagens na fila Redis em quedas do container | Utilizar grupos de consumo Redis Stream (`XREADGROUP`) com confirmação explícita (`XACK`) apenas após a conclusão com sucesso da etapa do worker. |

## Migration Plan

1. Nenhuma migração de banco de dados é necessária.
2. Garantir que a variável `GITHUB_TOKEN` esteja configurada no arquivo `.env` local ou nos segredos de ambiente do container.
