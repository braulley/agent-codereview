# alert-panel Specification

## Purpose

Mostra na sessão do browser cada alerta RF02 validado, com ingestão no formato SSE `alert|score|done`, estado vazio positivo e falha de schema sem destruir o editor.

## Requirements

### Requirement: Cards de alerta conforme schema RF02
O painel lateral SHALL renderizar um card por alerta da sessão cujo payload contém os campos obrigatórios de `docs/spec.md` RF02. Prioridade P0. Ator: Desenvolvedor Solicitante.

Campos visíveis MUST incluir: `severity`, `title`, `file`, intervalo `line_start`–`line_end`, `category` (uppercase), `description` e `suggestion` (código, tipografia monoespaçada). Enums MUST ser exatamente `CRITICAL|HIGH|MEDIUM|LOW` e `SECURITY|PERFORMANCE|QUALITY|MAINTAINABILITY`. Identidade MUST ser `id` UUID v4.

Payload de exemplo (CT01 / CA-RF02-03):

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

O card MUST usar radius 0px, superfície L1 `#111827`, borda esquerda 3px na cor da severidade (`docs/design.md`). MUST NOT persistir o payload (ADR-02, RNF03). CTs: **CT01/CT02** (exibição com fixture); LLM real fora de escopo.

#### Scenario: Card CRITICAL SECURITY a partir de fixture CT01
- **WHEN** a sessão recebe o payload de exemplo SQL Injection acima
- **THEN** um card visível MUST mostrar severity CRITICAL, category SECURITY, title do payload e referência de linha L12

#### Scenario: Card de segredo hardcoded CT02
- **WHEN** a sessão recebe um alerta com `severity` CRITICAL, `category` SECURITY e título indicando segredo hardcoded
- **THEN** o painel MUST exibir esse card sem omitir `suggestion`

### Requirement: Ingestão de eventos alert, score e done em memória
O frontend SHALL aceitar eventos no contrato `docs/spec.md` §5.1 sem chamar Gemini e sem `POST /api/analyze` nesta mudança. Prioridade P0. Ator: Sistema (Frontend). Transport HTTP/SSE real pertence a C11.

Eventos MUST:

```
event: alert
data: { ...AlertItem RF02 completo... }

event: score
data: {"code_health_score": 25, "alert_count": {"CRITICAL": 1, "HIGH": 2, "MEDIUM": 5, "LOW": 3}}

event: done
data: {"status": "completed", "analysis_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "duration_ms": 2340}
```

Cada `alert` válido MUST ser acrescentado à lista da sessão. `score` MUST ser armazenado como leitura informativa; o valor exibido no gauge MUST continuar derivado dos alertas OPEN (RF06). `done` MUST marcar a análise da sessão como concluída sem apagar alertas. Estado MUST existir só em memória (reload zera).

#### Scenario: Sequência alert então score então done
- **WHEN** a sessão recebe um `alert` válido, depois `score`, depois `done` com `status` completed
- **THEN** o painel MUST conter o alerta, MUST NÃO esvaziar a lista no `done`, e MUST NÃO emitir requisição de rede nesta mudança

#### Scenario: Reload descarta a sessão
- **WHEN** o usuário recarrega a página após ingestão de alertas
- **THEN** a lista MUST estar vazia (nenhuma persistência)

### Requirement: Payload inválido não quebra a sessão (CA-RF02-02)
Objeto `alert` que falhe o schema RF02 (campo obrigatório ausente, enum inválido, `line_end` < `line_start`, `id` não UUID) MUST ser rejeitado. O sistema MUST exibir toast de erro amigável. O conteúdo do editor e os alertas já aceitos MUST permanecer. MUST NOT logar código, `suggestion` ou chaves de API no cliente. CTs: variação de parsing de **CT04**; retry/timeout de rede = C11.

#### Scenario: Alerta sem severity é rejeitado
- **WHEN** um evento `alert` chega sem o campo `severity`
- **THEN** nenhum card novo é criado, um toast de erro é visível, e o texto do editor MUST permanecer inalterado

#### Scenario: Enum inválido não substitui a lista
- **WHEN** um evento `alert` chega com `"severity": "URGENT"` e já existem cards válidos
- **THEN** os cards existentes MUST permanecer e o toast MUST ser exibido

### Requirement: Estado vazio positivo (CT03, CA-RF02-05)
Quando a lista de alertas da sessão está vazia (incluindo após `done` sem nenhum `alert`), o painel MUST mostrar a mensagem **"Nenhum problema encontrado"** (ou equivalente acessível) e MUST NOT mostrar cards de achado. CTs: **CT03**. Score 100 é exigido em `health-dashboard`.

#### Scenario: Análise concluída sem alertas
- **WHEN** a sessão recebe `done` sem nenhum `alert` prévio
- **THEN** o painel MUST exibir o estado positivo e zero cards de alerta

### Requirement: Stub de correção e estado RESOLVED visual
Cada card OPEN MUST exibir o botão **Aplicar Correção** visível e **não funcional** nesta mudança (C10 liga `executeEdits`). Quando o alerta da sessão está `RESOLVED`, o card MUST mostrar indicador de resolvido (check + opacidade reduzida) e MUST NÃO aplicar o suggestion. Clique no card MUST poder marcar seleção `active` (borda destacada) para C09; MUST NOT rolar o Monaco aqui.

#### Scenario: Botão presente e inerte
- **WHEN** o usuário clica em Aplicar Correção num card OPEN
- **THEN** o texto do editor MUST permanecer igual e o card MUST permanecer OPEN

#### Scenario: Card RESOLVED distinto
- **WHEN** um alerta da sessão está marcado RESOLVED
- **THEN** o card MUST exibir estado visual de resolvido distinto do OPEN
