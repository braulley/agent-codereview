# CH-02 — Webhook Receiver: Recebimento e Validação de Eventos GitHub

**Tipo:** MVP | **Tamanho:** Médio | **Complexidade:** Média | **Risco:** Médio

---

## Descrição

Implementa o endpoint `POST /webhooks/github` que recebe eventos `pull_request` do GitHub, valida a assinatura HMAC-SHA256 obrigatória e retorna `HTTP 202 Accepted` em até 3 segundos. O evento validado é publicado na fila de mensagens para processamento assíncrono pelo worker. Implementa também o endpoint de listagem de eventos recebidos (necessário para o Dashboard da interface).

Esta mudança corresponde ao RF-01 da spec e é o ponto de entrada de todo o sistema.

## Escopo Funcional

- Implementar `api/webhooks/github.py` com `POST /webhooks/github`:
  - Receber payload JSON do GitHub.
  - Validar header `X-Hub-Signature-256` via HMAC-SHA256 (retorna `HTTP 401` se inválido).
  - Filtrar apenas eventos `action: opened` e `action: synchronize` (retorna `HTTP 400` para outros).
  - Deserializar para Pydantic model `GitHubPullRequestEvent`.
  - Publicar na fila (`queue/publisher.py`) e retornar `HTTP 202`.
- Implementar `queue/publisher.py`: publicação de mensagem no Redis (usando Redis Streams como fila simples no MVP).
- Implementar `api/models.py` com Pydantic models: `GitHubPullRequestEvent`, `WebhookAckResponse`.
- Registrar router no `main.py`.

## Requisitos Referenciados

- **RF-01:** Recebimento de Webhook — validação HMAC-SHA256, resposta em < 3s, `HTTP 202`.
- **RNF-09:** Autenticação de webhooks obrigatória.
- **RNF-02:** Tempo de resposta do webhook < 3s.

## Non-goals

- Não implementa o worker de consumo da fila.
- Não integra com a GitHub API para buscar o diff.
- Não realiza análise de código.
- Não implementa re-tentativas (retry) — essa lógica fica no worker (CH-03).

## Dependências

- **CH-01** (estrutura base, settings, Redis configurado) deve estar concluída.

## Riscos

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Geração de payload de teste GitHub incorreto nos testes | Média | Usar fixture com payload real (capturado da documentação GitHub) |
| Redis indisponível em testes unitários | Baixa | Mockar `queue/publisher.py` em todos os testes unitários |
| Vulnerabilidade de timing attack na comparação HMAC | Baixa | Usar `hmac.compare_digest()` (não `==`) |

## Execução de Linter

```bash
ruff check opencode/src/api opencode/src/queue opencode/tests
ruff format --check opencode/src/api opencode/src/queue opencode/tests
mypy opencode/src/api opencode/src/queue --strict
```

## Testes Unitários Necessários

- `tests/unit/api/test_webhook_receiver.py`:
  - `test_valid_webhook_returns_202` — payload e assinatura válidos.
  - `test_invalid_signature_returns_401` — assinatura incorreta.
  - `test_missing_signature_returns_401` — header ausente.
  - `test_unsupported_action_returns_400` — action `closed` ou `merged`.
  - `test_valid_synchronize_event_accepted` — action `synchronize`.
  - `test_publisher_called_once_on_valid_event` — mock do publisher, verificar que é chamado exatamente 1x.
- `tests/unit/queue/test_publisher.py`:
  - `test_publish_enqueues_message_to_redis_stream` — mockar Redis client, verificar payload publicado.

## Testes de Integração Necessários

- `tests/integration/test_webhook_to_queue.py`:
  - `test_end_to_end_webhook_enqueues_event` — usando Redis real (via `docker-compose`), enviar request HTTP ao endpoint e verificar que a mensagem foi adicionada ao stream Redis.

## Testes E2E Necessários

- Nenhum nesta mudança (E2E completo cobre o pipeline inteiro, definido em CH-05).

## Critério de Conclusão

- Todos os testes unitários e de integração passam.
- `ruff check` e `mypy --strict` sem erros.
- Teste manual: `curl -X POST http://localhost:8000/webhooks/github` com payload e assinatura válidos retorna `202 Accepted`.
- Log de segurança registrado para tentativas com assinatura inválida (sem expor o secret).
