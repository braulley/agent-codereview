# CH-03 — GitHub API Client: Leitura do Diff do Pull Request

**Tipo:** MVP | **Tamanho:** Médio | **Complexidade:** Média | **Risco:** Médio

---

## Descrição

Implementa o cliente da GitHub REST API responsável por obter o diff completo de um Pull Request (arquivos alterados, linhas adicionadas e removidas) e os metadados do PR. Também implementa o worker de consumo da fila Redis que despacha os eventos recebidos para o pipeline de análise. Esta mudança cobre RF-02 e a infraestrutura de processamento assíncrono.

## Escopo Funcional

- Implementar `integrations/github/client.py` (`GitHubClient`):
  - `get_pull_request_files(owner, repo, pull_number) -> list[PRFile]`: chama `GET /repos/{owner}/{repo}/pulls/{pull_number}/files`.
  - `get_pull_request_metadata(owner, repo, pull_number) -> PRMetadata`: chama `GET /repos/{owner}/{repo}/pulls/{pull_number}`.
  - Autenticação via `Authorization: Bearer {GITHUB_TOKEN}`.
  - Respeita rate limiting (cabeçalho `X-RateLimit-Remaining`); lança `RateLimitError` se esgotado.
- Implementar `integrations/github/models.py`: `PRFile`, `PRMetadata`, `PRDiff` (agregado).
- Implementar `queue/worker.py` (`PRAnalysisWorker`):
  - Consome mensagens do Redis Stream em loop assíncrono.
  - Para cada evento: chama `GitHubClient` para obter o diff.
  - Armazena diff em Redis com TTL de 300s (nunca persistido — RNF-07).
  - Repassa para o `Analyzer` (stub no MVP) com retry (máx 3x, backoff exponencial — RNF-06).
- Implementar `queue/consumer.py`: configuração de grupo de consumo Redis Streams.

## Requisitos Referenciados

- **RF-02:** Leitura do diff completo do PR via GitHub API.
- **RNF-06:** Retry de mensagens com backoff exponencial (máx 3x).
- **RNF-07:** Código-fonte não armazenado permanentemente (Redis com TTL).
- **RNF-13:** GitHub Client isolado em `integrations/github/` (troca sem impacto no core).

## Non-goals

- Não implementa análise LLM do diff.
- Não posta comentários no PR.
- Não suporta diffs acima de 500 linhas no MVP (trunca e registra aviso em log).
- Não suporta GitLab ou Bitbucket (pós-MVP).

## Dependências

- **CH-01** (settings, Redis) concluída.
- **CH-02** (webhook receiver, publisher) concluída — o worker precisa da fila para consumir.

## Riscos

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Rate limiting da GitHub API em testes reais | Alta | Todos os testes unitários/integração usam mock HTTP (respx) — nenhuma chamada real |
| Vazamento do `GITHUB_TOKEN` em logs | Média | Nunca logar headers de Authorization; checar no review |
| Diff > 500 linhas não tratado | Média | Implementar truncamento explícito com aviso em log e metadado `diff_truncated: true` |

## Execução de Linter

```bash
ruff check opencode/src/integrations/github opencode/src/queue opencode/tests
ruff format --check opencode/src/integrations/github opencode/src/queue opencode/tests
mypy opencode/src/integrations/github opencode/src/queue --strict
```

## Testes Unitários Necessários

- `tests/unit/integrations/github/test_client.py`:
  - `test_get_pr_files_returns_pr_file_list` — mock HTTP (respx), verifica parsing correto.
  - `test_get_pr_metadata_returns_metadata` — mock HTTP, verifica campos: número, título, autor, branch base/head.
  - `test_rate_limit_exhausted_raises_error` — header `X-RateLimit-Remaining: 0`, espera `RateLimitError`.
  - `test_diff_truncated_when_over_500_lines` — simular PR com 600 linhas, verificar truncamento e flag.
- `tests/unit/queue/test_worker.py`:
  - `test_worker_consumes_event_and_calls_github_client` — mock Redis + mock GitHubClient.
  - `test_worker_retries_on_github_client_error` — verifica até 3 tentativas com backoff.
  - `test_worker_stores_diff_in_redis_with_ttl` — verifica TTL ≤ 300s no mock Redis.
  - `test_diff_not_persisted_after_ttl` — verifica que TTL é sempre configurado (nunca `persist()`).

## Testes de Integração Necessários

- `tests/integration/test_worker_to_github.py`:
  - `test_worker_fetches_diff_and_stores_in_redis` — mock GitHub API via respx + Redis real.

## Testes E2E Necessários

- Nenhum nesta mudança.

## Critério de Conclusão

- Todos os testes passam.
- `ruff check` e `mypy --strict` sem erros.
- `GITHUB_TOKEN` nunca aparece em logs (verificação manual).
- Redis com TTL confirmado: `TTL codereview:diff:{pr_id}` retorna valor ≤ 300.
