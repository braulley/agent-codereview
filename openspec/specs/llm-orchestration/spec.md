# llm-orchestration Specification

## Purpose

Orquestra uma análise de código stateless contra a LLM, impondo schema, validando cada alerta e emitindo eventos `alert`, `score` e `done` sem persistir o fonte. Cobre RF02, RF10, RNF01, RNF02, RNF03 e RNF05.

## Requirements

### Requirement: Schema imposto em toda chamada à LLM (RNF01)
Toda chamada ao provedor Gemini (`gemini-3.6-flash`) MUST ativar Structured Outputs (JSON Schema / `response_schema`) e MIME `application/json`. Chamadas sem schema imposto são proibidas.

O envelope da resposta LLM MUST ser um objeto com lista `alerts` de candidatos ao contrato RF02. O backend MUST validar independentemente cada item **antes** de emitir um evento `alert` (ADR-03).

#### Scenario: Chamada sempre usa structured output
- **WHEN** o orquestrador solicita uma análise
- **THEN** a requisição à LLM MUST incluir schema JSON e `application/json` (verificável no cliente / logs de chamada, sem expor o código)

### Requirement: Sequência de eventos da análise (RF02, RF06, RNF02)
O orquestrador SHALL ser consumível de forma assíncrona (generator) para o C05 abrir o stream SSE em ≤ 500ms. Após obter e validar a resposta, MUST emitir, nesta ordem:

1. zero ou mais eventos `alert` (apenas itens válidos)
2. exatamente um evento `score` com `code_health_score` (0–100) e `alert_count` por severidade
3. exatamente um evento `done` com `status`, `analysis_id` (UUID v4) e `duration_ms`

Payloads de exemplo:

```json
{"event": "alert", "data": {"id": "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0c", "file": "users.py", "line_start": 12, "line_end": 12, "severity": "CRITICAL", "title": "SQL Injection via concatenação direta de input", "description": "...", "suggestion": "cursor.execute('SELECT * FROM users WHERE id = ?', (user_input,))", "category": "SECURITY"}}
```

```json
{"event": "score", "data": {"code_health_score": 75, "alert_count": {"CRITICAL": 1, "HIGH": 0, "MEDIUM": 0, "LOW": 0}}}
```

```json
{"event": "done", "data": {"status": "completed", "analysis_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "duration_ms": 2340}}
```

#### Scenario: Análise com alertas válidos completa a sequência
- **WHEN** a LLM devolve pelo menos um alerta válido
- **THEN** o consumidor MUST receber os eventos `alert` correspondentes, depois `score`, depois `done` com `status` `completed`

#### Scenario: Código limpo não emite alertas (CT03, CA-RF02-05)
- **WHEN** a análise de código sem problemas conclui com lista de alertas vazia
- **THEN** o sistema MUST NÃO emitir eventos `alert`, MUST emitir `score` com `code_health_score` 100 e `alert_count` zerado, e MUST emitir `done` com `status` `completed`

### Requirement: Detecção dos casos obrigatórios de segurança (RF02)
Dado o fonte de entrada (com LLM mockada nos testes), o motor MUST classificar:

- concatenação SQL insegura (`query = "SELECT * FROM users WHERE id = " + user_input`) → `severity: CRITICAL`, `category: SECURITY` (CT01, CA-RF02-03)
- segredo hardcoded (`API_KEY = "sk-1234567890abcdef"`) → `severity: CRITICAL`, `category: SECURITY` (CT02, CA-RF02-04)

#### Scenario: SQL Injection é CRITICAL SECURITY (CT01)
- **WHEN** o orquestrador analisa o snippet de concatenação SQL do CT01 e a LLM devolve o diagnóstico calibrado
- **THEN** exatamente um evento `alert` MUST ter `severity` `CRITICAL` e `category` `SECURITY`

#### Scenario: Segredo hardcoded é CRITICAL SECURITY (CT02)
- **WHEN** o orquestrador analisa o snippet de API key hardcoded do CT02 e a LLM devolve o diagnóstico calibrado
- **THEN** exatamente um evento `alert` MUST ter `severity` `CRITICAL` e `category` `SECURITY`

### Requirement: Falha de schema não propaga payload inválido (CA-RF02-02, RF10, RNF05)
Resposta JSON ilegível ou envelope inválido MUST ser recusada por completo: o orquestrador MUST registrar erro estruturado (`analysis_id`, tipo de erro) e MUST sinalizar erro de schema ao consumidor **sem** emitir eventos `alert` parciais daquela resposta.

Itens individuais inválidos dentro de uma lista parcialmente válida MUST ser descartados (não emitidos). Os válidos MUST seguir. O log MUST NÃO incluir código-fonte, diff, `description`, `suggestion` nem `GEMINI_API_KEY`.

#### Scenario: JSON malformado não vaza alerta inválido
- **WHEN** a LLM devolve texto que não é JSON do envelope esperado
- **THEN** o sistema MUST logar o erro de schema sem o conteúdo do fonte, MUST NÃO emitir `alert`, e MUST falhar com erro de schema tipado para o C05

#### Scenario: Item inválido é pulado e os válidos seguem
- **WHEN** a lista `alerts` contém um item válido e um item com `severity` inválida
- **THEN** o sistema MUST emitir somente o alerta válido, MUST logar o descarte do inválido, e MUST calcular `score` apenas com os aceitos

### Requirement: Timeout e falha da API LLM (RF10, CT04, RNF05)
Se a LLM não concluir em 30 segundos, o orquestrador MUST abortar e sinalizar erro de timeout tipado (o toast "Tentar Novamente" é C05/C11). Falha de disponibilidade da API MUST ser erro de API tipado. Em ambos os casos MUST NÃO persistir o fonte e MUST NÃO emitir `done` com `status` `completed`.

#### Scenario: Timeout de 30s (CT04)
- **WHEN** a chamada à LLM excede 30 segundos
- **THEN** o orquestrador MUST interromper a espera e MUST elevar erro de timeout tipado, sem evento `done` completed

#### Scenario: API indisponível
- **WHEN** o provedor LLM retorna falha de transporte ou HTTP de serviço indisponível
- **THEN** o orquestrador MUST elevar erro de API tipado, sem persistir o código submetido

### Requirement: Truncamento antes da LLM e privacidade (RNF03)
Código ou diff com mais de 500 linhas MUST ser truncado **antes** do envio à LLM. O orquestrador MUST permanecer stateless: nenhum handler persiste fonte, diff ou credencial em banco ou log (ADR-02). A chave `GEMINI_API_KEY` MUST permanecer apenas em configuração de servidor.

Ao concluir com sucesso, o sistema MUST logar JSON em stdout com `analysis_id`, `tokens_used` e `analysis_duration_ms`.

#### Scenario: Mais de 500 linhas são truncadas antes da LLM
- **WHEN** o payload de análise tem 501 ou mais linhas
- **THEN** a chamada à LLM MUST receber no máximo 500 linhas, e o log MUST NÃO conter o corpo do código

#### Scenario: Conclusão registra metadados sem segredo
- **WHEN** uma análise completa com sucesso
- **THEN** o log MUST incluir `tokens_used` e `analysis_duration_ms` e MUST NÃO incluir `GEMINI_API_KEY`, código, diff ou `suggestion`
