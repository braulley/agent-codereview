## Purpose

Prover a integração com a GitHub REST API para obtenção de diffs e metadados de Pull Requests, e gerenciar o consumo assíncrono de eventos via Redis Stream com cache efêmero do diff.

## ADDED Requirements

### Requirement: GitHub REST API Diff and Metadata Fetching
O cliente da API do GitHub SHALL realizar requisições autenticadas para recuperar os metadados e a lista de arquivos com o diff completo de um Pull Request, truncando diffs maiores que 500 linhas e gerenciando erros de limite de taxa (Rate Limit).

#### Scenario: Successful retrieval of PR files and metadata
- **WHEN** o cliente solicita os metadados ou arquivos alterados de um PR com um token de autenticação válido e saldo de chamadas disponível
- **THEN** o cliente retorna as estruturas tipadas correspondentes contendo os arquivos alterados, linhas adicionadas/removidas, diffs por arquivo e metadados da branch sem expor o token nos logs

#### Scenario: PR Diff truncation when exceeding line threshold
- **WHEN** o diff acumulado de um PR excede o limite máximo permitido de 500 linhas no MVP
- **THEN** o cliente trunca o diff excedente, sinaliza o atributo de truncamento (`diff_truncated: true`) e registra um aviso estruturado em log

#### Scenario: Rate limit exhaustion error handling
- **WHEN** a resposta da GitHub API indica esgotamento da cota de requisições (ex.: cabeçalho `X-RateLimit-Remaining: 0`)
- **THEN** o cliente lança uma exceção customizada `RateLimitError` contendo as informações de reset do limite e interrompe novas chamadas

### Requirement: Async PR Analysis Worker and Redis Storage
O worker assíncrono SHALL consumir mensagens de eventos de PR do Redis Stream, obter o diff correspondente através do cliente GitHub e armazenar temporariamente o diff no Redis com tempo de vida útil (TTL) configurado.

#### Scenario: Consumption and ephemeral diff storage in Redis
- **WHEN** o worker consome um evento válido de análise de PR da fila do Redis Stream
- **THEN** o worker recupera o diff via `GitHubClient` e o armazena no Redis com chave identificadora do PR e TTL máximo de 300 segundos, sem persistir o código de forma permanente

#### Scenario: Exponential backoff retry on transient errors
- **WHEN** o cliente do GitHub falha devido a erros transitórios de rede ou indisponibilidade temporária durante o processamento pelo worker
- **THEN** o worker reexecuta a tentativa de chamada por no máximo 3 vezes aplicando tempo de espera exponencial entre as tentativas

#### Scenario: Expiration of source code after TTL expiry
- **WHEN** o tempo limite de 300 segundos (TTL) expira após o processamento
- **THEN** o Redis remove automaticamente a chave do diff, garantindo a política de não-retenção permanente do código-fonte
