# apply-fix-undo Specification

## Purpose

Permite aplicar a sugestão de um alerta OPEN com um clique, marcar o card como RESOLVED, recalcular o score só com OPEN e desfazer texto + estado via undo nativo do editor (RF04, CT07).

## Requirements

### Requirement: Aplicação atômica via botão Aplicar Correção (RF04)
O sistema SHALL permitir, com um único clique em **Aplicar Correção** de um card OPEN, substituir o trecho do editor entre `line_start` e `line_end` (inclusive) pelo campo `suggestion` do alerta, sem recarregar a página. Prioridade P0. Ator: Desenvolvedor Solicitante.

A substituição MUST ser uma edição única registrada no undo stack do Monaco (equivalente a `executeEdits`). MUST NOT chamar Gemini nem `POST /api/analyze`. MUST NOT persistir o código (ADR-02, RNF03). CTs: **CT07**, CA-RF04-01.

Payload de alerta (mesmo contrato RF02 / C08):

```json
{
  "id": "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0c",
  "file": "users.py",
  "line_start": 12,
  "line_end": 12,
  "severity": "CRITICAL",
  "title": "SQL Injection via concatenação direta de input",
  "description": "A query SQL é construída por concatenação direta de input não sanitizado.",
  "suggestion": "cursor.execute('SELECT * FROM users WHERE id = ?', (user_input,))",
  "category": "SECURITY"
}
```

#### Scenario: Clique substitui o trecho sem reload (CA-RF04-01, CT07)
- **WHEN** o usuário clica em Aplicar Correção num card OPEN com o payload acima e o editor contém a linha problemática
- **THEN** o conteúdo do editor MUST refletir `suggestion` no intervalo L12–L12, a URL da página MUST permanecer a mesma, e MUST NÃO haver nova requisição de análise

#### Scenario: Botão desabilitado em card RESOLVED
- **WHEN** o alerta da sessão já está `RESOLVED`
- **THEN** Aplicar Correção MUST estar indisponível (disabled ou oculto) e um novo clique MUST NÃO alterar o editor

### Requirement: Isolamento entre alertas (CA-RF04-02)
Aplicar a correção de um alerta MUST NÃO alterar o `status`, o payload nem a seleção dos demais alertas da sessão.

#### Scenario: Um fix não resolve os outros
- **WHEN** a sessão tem dois alertas OPEN distintos e o usuário aplica correção só no primeiro
- **THEN** o segundo MUST permanecer OPEN com o mesmo `id` e campos, e o primeiro MUST estar RESOLVED

### Requirement: Card RESOLVED imediato (CA-RF04-03)
Imediatamente após apply bem-sucedido, o alerta MUST passar a `RESOLVED`. O card MUST exibir indicador visual de resolvido (check + opacidade reduzida, alinhado a `docs/design.md` / C08).

#### Scenario: Visual RESOLVED após apply
- **WHEN** apply conclui com sucesso
- **THEN** o card correspondente MUST mostrar estado RESOLVED distinto de OPEN sem esperar novo evento SSE

### Requirement: Undo restaura código e card (CA-RF04-04, CT07)
`Ctrl+Z` e `Cmd+Z` MUST reverter a edição de apply via undo stack nativo do Monaco. Após o undo que desfaz aquele apply, o alerta MUST voltar a OPEN e o card MUST perder o estado RESOLVED.

#### Scenario: Ctrl+Z reabre o alerta (CT07)
- **WHEN** o usuário aplica uma correção e em seguida pressiona Ctrl+Z (ou Cmd+Z) de forma a desfazer essa edição
- **THEN** o texto do editor MUST voltar ao conteúdo pré-apply e o card MUST voltar a OPEN

#### Scenario: Undo de edição manual não resolve alertas alheios
- **WHEN** o usuário edita o editor manualmente (sem apply) e pressiona Ctrl+Z
- **THEN** nenhum alerta OPEN MUST mudar para RESOLVED apenas por causa desse undo

### Requirement: Score OPEN em menos de 100 ms (CA-RF04-05)
Após apply ou undo que altere o conjunto de alertas OPEN, o Code Health Score exibido MUST ser recalculado client-side com a fórmula RF06 apenas sobre alertas OPEN, em **menos de 100 ms**, sem round-trip à API. MUST reutilizar a mesma fórmula de `client-health-score` / C06.

#### Scenario: Score sobe ao resolver o único CRITICAL
- **WHEN** a sessão tem exatamente um alerta CRITICAL OPEN (score 75) e o usuário aplica a correção
- **THEN** o gauge MUST mostrar 100 (EXCELLENT) sem chamar `/api/*`

#### Scenario: Score volta após undo
- **WHEN** após o scenario anterior o usuário desfaz o apply com Ctrl+Z
- **THEN** o gauge MUST voltar a 75

### Requirement: Decorações do alerta removidas ao resolver (CA-RF08-03)
Ao marcar um alerta como RESOLVED por apply, o sistema MUST remover (ou substituir por estado resolvido) o gutter icon e o highlight associados a esse `id`. Demais decorações de alertas OPEN MUST permanecer.

#### Scenario: Gutter some após Aplicar Correção
- **WHEN** um alerta OPEN com gutter/highlight visíveis é resolvido via Aplicar Correção
- **THEN** as decorações daquele alerta MUST deixar de indicar achado ativo e as de outros OPEN MUST permanecer

#### Scenario: Undo restaura decorações
- **WHEN** o usuário desfaz o apply e o alerta volta a OPEN
- **THEN** gutter/highlight daquele alerta MUST voltar a ser exibidos conforme RF08 / C09

### Requirement: Privacidade do apply (RNF03)
Apply e undo MUST ocorrer só em memória no browser. MUST NOT enviar `suggestion` ou fonte a um endpoint novo. MUST NOT colocar `GEMINI_API_KEY`, `GITHUB_TOKEN` ou `GITLAB_TOKEN` no bundle. Toasts/logs de falha MUST NÃO interpolar o código do editor.

#### Scenario: Apply sem rede de análise
- **WHEN** o usuário aplica uma correção com o backend indisponível
- **THEN** a substituição local MUST ainda funcionar e MUST NÃO tentar `POST /api/analyze` só por causa do apply
