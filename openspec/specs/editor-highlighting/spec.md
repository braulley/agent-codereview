# editor-highlighting Specification

## Purpose

Marca no Monaco Editor as linhas de cada alerta OPEN com gutter por severidade e highlight de fundo, alinhados a RF08 e ao filtro de severidade exposto por C08.

## Requirements

### Requirement: Gutter icons por severidade (RF08)
O sistema SHALL exibir um gutter icon (ou stripe de margem) na linha `line_start` de cada alerta **OPEN** cuja severidade está em `visible_severities`. Prioridade P0. Ator: Sistema (Frontend).

Mapeamento de cor do gutter (CA-RF08-02):

| Severidade | Cor |
|---|---|
| CRITICAL | `#EF4444` |
| HIGH | `#F97316` |
| MEDIUM | `#EAB308` |
| LOW | `#3B82F6` |

Ícones/gutters MUST alinhar-se às linhas corretas (CA-RF08-01). Radius visual MUST ser 0px; superfícies opacas (`docs/design.md`). MUST NOT embutir `GEMINI_API_KEY`, `GITHUB_TOKEN` ou `GITLAB_TOKEN`. Sessão só em memória (ADR-02, RNF03).

CTs: **CT01/CT02** (gutter CRITICAL na linha do fixture); **CT06** (filtro); **CT07** (remoção ao resolver — contrato preparado; apply em C10).

#### Scenario: Gutter CRITICAL na linha do alerta CT01
- **WHEN** a sessão contém um alerta OPEN CRITICAL com `line_start` 12
- **THEN** o editor MUST mostrar gutter na cor `#EF4444` associado à linha 12

#### Scenario: Quatro severidades com cores distintas
- **WHEN** a sessão tem um OPEN de cada severidade em linhas distintas e todos os filtros ativos
- **THEN** cada linha afetada MUST exibir gutter na cor da tabela acima

### Requirement: Highlight de fundo no intervalo line_start–line_end
O sistema SHALL aplicar highlight de fundo no intervalo inclusivo `line_start`–`line_end` para alertas OPEN visíveis. Cores (RF08):

| Severidade | Highlight |
|---|---|
| CRITICAL | `rgba(239,68,68,0.15)` |
| HIGH | `rgba(249,115,22,0.15)` |
| MEDIUM | `rgba(234,179,8,0.12)` |
| LOW | `rgba(59,130,246,0.10)` |

O highlight **persistente** (marcação de achado) é distinto do highlight **temporário** de navegação (2–3 s em `bidirectional-nav`): o temporário MAY reforçar o mesmo intervalo sem substituir a regra de cores.

#### Scenario: Intervalo multilinha
- **WHEN** um alerta OPEN tem `line_start` 10 e `line_end` 12
- **THEN** as linhas 10, 11 e 12 MUST receber o highlight de fundo da severidade do alerta

### Requirement: Remoção ao resolver (CA-RF08-03, CT07)
Quando um alerta passa a `RESOLVED` (C10 / `resolveAlert`), o sistema MUST remover gutter icon e highlight persistente desse `id`. Outros alertas MUST permanecer. Nesta mudança, a API de highlight MUST expor remoção por `id` testável mesmo que o botão Aplicar Correção ainda seja stub.

#### Scenario: clearHighlight remove decorações do alerta
- **WHEN** um alerta OPEN com gutter/highlight visíveis é marcado `RESOLVED` (ou `clearHighlight(id)` é invocado)
- **THEN** gutter e highlight daquele `id` MUST desaparecer e os demais alertas OPEN MUST manter decorações

### Requirement: Filtro de severidade oculta gutters (CA-RF08-04, CT06)
O conjunto `visible_severities` de C08 (`severity-filters`) MUST controlar a visibilidade das decorações. Desativar um nível MUST ocultar gutter e highlight persistente daquele nível em **< 100 ms**, sem chamada a `/api/*`. Reativar MUST restaurá-los (CA-RF05-04 / CA-RF08-04).

#### Scenario: Desativar LOW e MEDIUM oculta gutters (CT06)
- **WHEN** o usuário desativa os chips LOW e MEDIUM
- **THEN** gutters e highlights persistentes LOW/MEDIUM MUST desaparecer e CRITICAL/HIGH MUST permanecer

#### Scenario: Reativar MEDIUM restaura gutters
- **WHEN** MEDIUM estava desativado e o usuário reativa o chip MEDIUM
- **THEN** gutters/highlights dos alertas MEDIUM OPEN MUST voltar a ser visíveis

### Requirement: Performance em arquivo grande (CT08, RNF04)
Com ~2.000 linhas no editor e dezenas de alertas, aplicar/atualizar/remover decorações MUST NÃO congelar a UI de forma perceptível (scroll e clique no card permanecem responsivos). MUST NOT persistir código nem logar conteúdo do editor.

#### Scenario: 2000 linhas com decorações
- **WHEN** o editor contém aproximadamente 2.000 linhas e há múltiplos alertas OPEN com gutters
- **THEN** scroll do editor e clique em card MUST permanecer usáveis sem freeze perceptível
