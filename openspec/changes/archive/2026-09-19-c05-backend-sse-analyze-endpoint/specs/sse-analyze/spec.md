## Purpose

Expõe `POST /api/analyze` como stream SSE unidirecional: valida o código submetido, retransmite alertas e o score já validados e sinaliza conclusão ou falha recuperável sem persistir o fonte.

## ADDED Requirements

### Requirement: Validação do pedido de análise (RF02, §5.1)

O sistema SHALL aceitar `POST /api/analyze` com `Content-Type: application/json` e o corpo:

```json
{
  "code": "query = \"SELECT * FROM users WHERE id = \" + user_input\n",
  "language": "python",
  "filename": "users.py"
}
```

- `code` MUST ser string não vazia (após trim).
- `language` MUST ser um de: `python`, `javascript`, `typescript`, `java`, `go`, `php`, `ruby`, `auto`.
- `filename` MAY ser omitido; quando presente MUST ser string.

Pedido inválido MUST responder HTTP **422** com envelope JSON `{error, message, detail?}` e MUST NOT abrir stream SSE nem chamar a LLM. Prefixo MUST ser `/api` sem `/v1`. Prioridade: P0. Ator: cliente HTTP (frontend C11).

```json
{
  "error": "INVALID_ANALYZE_REQUEST",
  "message": "Payload de análise inválido.",
  "detail": "O campo code não pode ser vazio."
}
```

#### Scenario: code vazio retorna 422 sem stream

- **WHEN** o cliente envia `POST /api/analyze` com `"code": ""` e `language` válida
- **THEN** a resposta MUST ser HTTP 422 com `error` igual a `INVALID_ANALYZE_REQUEST` e MUST NOT ser `text/event-stream`

#### Scenario: language inválida retorna 422

- **WHEN** o cliente envia `"language": "cobol"` com `code` não vazio
- **THEN** a resposta MUST ser HTTP 422 com `error` igual a `INVALID_ANALYZE_REQUEST`

#### Scenario: pedido válido inicia SSE 200

- **WHEN** o cliente envia `code` não vazio e `language` do enum
- **THEN** a resposta MUST ser HTTP 200 com `Content-Type` `text/event-stream`

### Requirement: Sequência SSE alert, score e done (RF02, RF06, §5.1)

Com pedido válido, o sistema MUST emitir eventos SSE nomeados nesta ordem, cada um com `data` JSON:

1. zero ou mais `event: alert` — objeto completo do contrato RF02 (`id`, `file`, `line_start`, `line_end`, `severity`, `title`, `description`, `suggestion`, `category`)
2. exatamente um `event: score` — `code_health_score` (0–100) e `alert_count` com as quatro chaves `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`
3. exatamente um `event: done` — `status` `completed`, `analysis_id` UUID v4 e `duration_ms` inteiro ≥ 0

Exemplo de alerta (CT01 / CA-RF02-03):

```json
{
  "id": "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0c",
  "file": "users.py",
  "line_start": 12,
  "line_end": 12,
  "severity": "CRITICAL",
  "title": "SQL Injection via concatenação direta de input",
  "description": "A query SQL é construída por concatenação direta de input não sanitizado. Referência: OWASP Top 10 — A03:2021 Injection.",
  "suggestion": "cursor.execute('SELECT * FROM users WHERE id = ?', (user_input,))",
  "category": "SECURITY"
}
```

Exemplo de score e done:

```json
{"code_health_score": 75, "alert_count": {"CRITICAL": 1, "HIGH": 0, "MEDIUM": 0, "LOW": 0}}
```

```json
{"status": "completed", "analysis_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "duration_ms": 2340}
```

O sistema MUST NÃO retransmitir alerta que falhou na validação independente (RNF01, CA-RF02-01). `event: done` com `status` `completed` MUST ocorrer só após `score` em análise bem-sucedida.

#### Scenario: SQL Injection emite alerta CRITICAL SECURITY (CT01)

- **WHEN** o cliente analisa o snippet de concatenação SQL do CT01 e o motor devolve o diagnóstico calibrado
- **THEN** o stream MUST conter um `event: alert` com `severity` `CRITICAL` e `category` `SECURITY`, depois `score`, depois `done` com `status` `completed`

#### Scenario: Segredo hardcoded emite alerta CRITICAL SECURITY (CT02)

- **WHEN** o cliente analisa o snippet `API_KEY = "sk-1234567890abcdef"` e o motor devolve o diagnóstico calibrado
- **THEN** o stream MUST conter um `event: alert` com `severity` `CRITICAL` e `category` `SECURITY`

#### Scenario: Código limpo não emite alert e score é 100 (CT03)

- **WHEN** o cliente analisa código sem problemas e o motor devolve lista vazia
- **THEN** o stream MUST NÃO emitir `event: alert`, MUST emitir `score` com `code_health_score` 100 e `alert_count` zerado, e MUST emitir `done` com `status` `completed`

### Requirement: Abertura do stream em ≤ 500ms (RNF02)

O backend MUST iniciar o streaming SSE (headers `200` + `text/event-stream` comprometidos) em ≤ 500ms após receber um pedido válido, mesmo que o primeiro `alert` ainda não exista. O Time-to-first-alert de UI (≤ 1.500ms p95) permanece limitado pelo tempo até o primeiro JSON de alerta válido.

#### Scenario: Headers SSE chegam antes do timeout da LLM

- **WHEN** um pedido válido é aceito e a LLM ainda não concluiu
- **THEN** o cliente MUST receber headers de `text/event-stream` em ≤ 500ms sem esperar o fim da análise

### Requirement: Falhas da LLM após o stream aberto (RF10, RNF05, CT04)

Depois de abrir o SSE, timeout da LLM (> 30s), indisponibilidade do provedor, 429 do provedor ou envelope ilegível MUST ser sinalizados com um `event: error` terminal e o stream MUST fechar. O sistema MUST NÃO emitir `done` com `status` `completed` nesses casos e MUST NÃO emitir `alert` parciais de um envelope ilegível.

Payload:

```json
{
  "error": "LLM_TIMEOUT",
  "message": "A análise excedeu o tempo limite de 30 segundos.",
  "analysis_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

`error` MUST ser um de: `LLM_TIMEOUT`, `LLM_UNAVAILABLE`, `LLM_SCHEMA`, `RATE_LIMITED`. Toast e botão "Tentar Novamente" são responsabilidade do cliente (C11 / CA-RF10-01). HTTP 500/503/429 de §5.1 aplicam-se apenas a falhas **antes** de o stream ser comprometido (ex.: exceção não tratada → 500 com envelope `{error, message, detail?}`).

#### Scenario: Timeout emite error e não completed (CT04)

- **WHEN** a LLM não conclui em 30 segundos após um pedido válido
- **THEN** o stream MUST emitir `event: error` com `error` igual a `LLM_TIMEOUT` e MUST NÃO emitir `done` com `status` `completed`

#### Scenario: Envelope ilegível não vaza alerta (CA-RF02-02)

- **WHEN** o motor recusa a resposta da LLM por schema inválido
- **THEN** o stream MUST emitir `event: error` com `error` igual a `LLM_SCHEMA`, MUST NÃO emitir `event: alert`, e o log MUST NÃO conter o código submetido

#### Scenario: Provedor indisponível após o stream aberto

- **WHEN** o motor sinaliza falha de disponibilidade da LLM
- **THEN** o stream MUST emitir `event: error` com `error` igual a `LLM_UNAVAILABLE`

### Requirement: Privacidade, cancelamento e ausência de persistência (RNF03, ADR-02)

O sistema MUST NÃO persistir `code`, diff, `suggestion` ou credenciais em banco, arquivo ou log. Logs estruturados de sucesso MUST incluir `analysis_id`, `tokens_used` e `analysis_duration_ms` e MUST NÃO incluir `GEMINI_API_KEY`, `GITHUB_TOKEN`, `GITLAB_TOKEN` nem o corpo do código. Se o cliente desconectar no meio do stream, o processo MUST encerrar a análise daquela requisição sem gravar o fonte.

#### Scenario: Log de sucesso omite fonte e chaves

- **WHEN** uma análise completa com `done` `completed`
- **THEN** o log JSON MUST conter `analysis_id` e `analysis_duration_ms` e MUST NÃO conter o valor de `code` nem `GEMINI_API_KEY`

#### Scenario: Disconnect não persiste o código

- **WHEN** o cliente fecha a conexão SSE antes de `done` ou `error`
- **THEN** o processo MUST NÃO gravar o `code` em banco nem em arquivo de persistência
