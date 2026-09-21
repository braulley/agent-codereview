# sse-client Specification

## Purpose

Consome o stream SSE de `POST /api/analyze` no browser e entrega eventos tipados `alert`, `score`, `done` e `error` à sessão de análise, sem chaves de API no cliente.

## Requirements

### Requirement: Cliente abre análise via POST SSE (RF02 §5.1, RNF03)
O frontend SHALL iniciar a análise com `POST /api/analyze` e `Content-Type: application/json`, usando o caminho relativo `ANALYZE` (`/api/analyze`). Prioridade P0. Ator: Desenvolvedor Solicitante.

Corpo MUST:

```json
{
  "code": "query = \"SELECT * FROM users WHERE id = \" + user_input\n",
  "language": "python",
  "filename": "users.py"
}
```

- `code` MUST ser o conteúdo atual do editor (não vazio após trim).
- `language` MUST ser um do enum §5.1 (`python` | `javascript` | `typescript` | `java` | `go` | `php` | `ruby` | `auto`).
- `filename` MAY ser omitido.

O transporte MUST usar `fetch` + leitura incremental do corpo (`ReadableStream` / decoder de linhas SSE). MUST NOT usar `EventSource` (não suporta POST). MUST NOT enviar `GEMINI_API_KEY`, `GITHUB_TOKEN` ou `GITLAB_TOKEN` em headers, query ou body (RNF03). MUST NOT persistir `code` ou eventos em `localStorage` / IndexedDB (ADR-02).

#### Scenario: Pedido válido abre stream text/event-stream
- **WHEN** o usuário dispara Analisar com código não vazio e `language` válida
- **THEN** o cliente MUST emitir `POST /api/analyze` com o JSON acima e MUST consumir a resposta como stream SSE (`text/event-stream` ou equivalente parseável linha a linha)

#### Scenario: Bundle client sem chaves de API
- **WHEN** o build de produção do frontend é auditado
- **THEN** as strings `GEMINI_API_KEY`, `GITHUB_TOKEN` e `GITLAB_TOKEN` MUST NOT aparecer no bundle gerado por esta capacidade

### Requirement: Entrega incremental de alert, score e done
Enquanto o stream estiver aberto, o cliente MUST parsear frames SSE e entregar à sessão:

```
event: alert
data: { ...AlertItem RF02 completo... }

event: score
data: {"code_health_score": 25, "alert_count": {"CRITICAL": 1, "HIGH": 2, "MEDIUM": 5, "LOW": 3}}

event: done
data: {"status": "completed", "analysis_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "duration_ms": 2340}
```

Cada `alert` válido MUST ser repassado à ingestão de sessão (painel / highlights) assim que chegar — sem esperar `done`. `score` MUST ser repassado. `done` com `status` `completed` MUST marcar a análise como concluída e encerrar o loading. Comentários SSE (`: ...`) MUST ser ignorados sem erro. CTs: **CT01**, **CT02**, **CT03**.

#### Scenario: Alertas aparecem antes de done (RNF02)
- **WHEN** o stream emite um `event: alert` válido e depois `score` e `done`
- **THEN** a sessão MUST receber o alerta antes de `done`, e o loading MUST permanecer ativo até `done` ou falha

#### Scenario: Código limpo sem alert (CT03)
- **WHEN** o stream emite apenas `score` com `code_health_score` 100 e `done` completed, sem nenhum `alert`
- **THEN** a sessão MUST concluir sem cards de achado e MUST refletir score 100 no gauge da sessão

### Requirement: event error e HTTP pré-stream são terminais
O cliente MUST tratar como falha terminal:

1. Frame SSE `event: error` com payload:

```json
{
  "error": "LLM_TIMEOUT",
  "message": "A análise excedeu o tempo limite de 30 segundos.",
  "analysis_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

`error` MUST ser um de: `LLM_TIMEOUT` | `LLM_UNAVAILABLE` | `LLM_SCHEMA` | `RATE_LIMITED`.

2. Resposta HTTP não-SSE antes do stream (ex.: 422, 429, 500, 503) com envelope `{error, message, detail?}`.

3. Abort/timeout de cliente após 30s sem `done` nem `error` (CT04).

4. Chunk JSON ilegível ou `data` que falhe o schema esperado do evento.

Nesses casos o cliente MUST encerrar o loading, MUST NOT marcar a análise como `completed`, MUST preservar o texto do editor e os alertas já aceitos, e MUST sinalizar a falha à capacidade de resiliência (toast / retry). CTs: **CT04**; CA-RF02-02 / CA-RF10-01 / CA-RF10-02.

#### Scenario: Timeout LLM via event error (CT04)
- **WHEN** o stream emite `event: error` com `error` `LLM_TIMEOUT`
- **THEN** o loading MUST terminar, a análise MUST NOT ficar `completed`, e a falha MUST ser sinalizada à UI de erro com possibilidade de retry

#### Scenario: 422 sem abrir stream
- **WHEN** o servidor responde HTTP 422 com `{ "error": "INVALID_ANALYZE_REQUEST", "message": "...", "detail": "..." }`
- **THEN** o cliente MUST NOT tentar parsear SSE e MUST sinalizar a falha à UI sem limpar o editor

#### Scenario: data alert malformada não quebra a sessão
- **WHEN** um frame `event: alert` chega com JSON inválido ou sem campo obrigatório RF02
- **THEN** nenhum card novo MUST ser criado a partir desse frame, o editor MUST permanecer intacto, e a falha MUST ser sinalizada à UI

### Requirement: Cancelamento e uma análise ativa por vez
O cliente MUST permitir no máximo uma análise em voo. Nova Analisar com stream ativo MUST abortar o anterior (`AbortController`) antes de iniciar o novo. Desmontar a página / sair da sessão MUST abortar o fetch em andamento. MUST NOT deixar listeners órfãos após `done`, `error` ou abort.

#### Scenario: Segunda Analisar cancela a primeira
- **WHEN** uma análise está em streaming e o usuário dispara Analisar de novo
- **THEN** o fetch anterior MUST ser abortado e apenas o novo stream MUST alimentar a sessão
