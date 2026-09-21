## Purpose

Exibe diffs de código em modos side-by-side e unified na Central Stage, com alternância sem reload e sem perda do estado de sessão de alertas — cobrindo RF07 no frontend.

## ADDED Requirements

### Requirement: Modos side-by-side e unified (RF07, CA-RF07-01)
O frontend SHALL renderizar diffs em dois modos alternáveis: **side-by-side** (versão anterior à esquerda, posterior à direita) e **unified** (marcações `+` / `-`). Ambos MUST renderizar corretamente para o mesmo `oldValue`/`newValue` (ou equivalente derivado do diff unificado). Prioridade P1. Ator: Desenvolvedor Solicitante.

Visual MUST seguir o design system (`docs/design.md`): radius 0px, superfícies opacas, tipografia mono no código. MUST NOT persistir o diff (ADR-02).

#### Scenario: Side-by-side mostra dois painéis
- **WHEN** o DiffViewer está em modo side-by-side com um diff não vazio
- **THEN** o UI MUST mostrar o painel antigo e o painel novo simultaneamente

#### Scenario: Unified mostra marcações + e -
- **WHEN** o usuário alterna para modo unified
- **THEN** o UI MUST renderizar o diff unificado com linhas adicionadas e removidas distinguíveis

### Requirement: Alternância sem reload e sem perda de alertas (CA-RF07-02)
Alternar entre side-by-side e unified MUST NÃO recarregar a página e MUST NÃO limpar a lista de alertas da sessão nem o conteúdo do editor. Prioridade P1.

#### Scenario: Troca de modo preserva alertas
- **WHEN** a sessão já contém alertas e o usuário alterna o modo do DiffViewer
- **THEN** os alertas MUST permanecer e a URL da página MUST NÃO mudar

### Requirement: Navegação por hunks (CA-RF07-03)
O DiffViewer MUST permitir navegar entre hunks (blocos contíguos de mudança) via controle de UI e/ou atalho de teclado quando o diff tiver múltiplos hunks. Prioridade P1.

#### Scenario: Diff com múltiplos hunks
- **WHEN** o diff contém dois ou mais hunks e o usuário aciona “próximo hunk”
- **THEN** a viewport MUST focar o hunk seguinte
