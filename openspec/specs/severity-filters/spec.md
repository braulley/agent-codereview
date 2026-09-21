# severity-filters Specification

## Purpose

Filtra a lista de cards por severidade no cliente, em tempo real, com contadores por nível e um contrato de visibilidade para o editor (C09).

## Requirements

### Requirement: Chips de severidade com contador (RF05)
O painel SHALL oferecer quatro chips/toggles: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`. Prioridade P1. Ator: Tech Lead / Revisor Sênior.

Estado padrão: **todos os níveis visíveis**. Cada chip MUST mostrar a contagem de alertas **OPEN** daquele nível, no formato `HIGH (7)` (dígitos monoespaçados). Contagens MUST ignorar alertas `RESOLVED` (CA-RF05-03, preparação para C10). MUST NOT haver filtro por `category` nesta mudança.

Contrato de estado (exemplo):

```json
{
  "visible_severities": ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
  "open_count": {"CRITICAL": 1, "HIGH": 2, "MEDIUM": 5, "LOW": 3}
}
```

CTs: **CT06** (parte cards).

#### Scenario: Default mostra todos os níveis
- **WHEN** a sessão tem alertas nas quatro severidades e o usuário ainda não alterou filtros
- **THEN** os quatro chips estão ativos e todos os cards OPEN correspondentes estão visíveis

#### Scenario: Contador ignora RESOLVED
- **WHEN** há 2 HIGH OPEN e 1 HIGH RESOLVED
- **THEN** o chip MUST exibir `HIGH (2)`

### Requirement: Toggle oculta e restaura cards em menos de 100 ms (CT06)
Desativar um nível MUST ocultar somente os cards daquela severidade. Reativar MUST restaurar a visibilidade desses cards (CA-RF05-04). A operação MUST ser puramente client-side, sem chamada a `/api/*`, e MUST completar em **< 100 ms** (CA-RF05-01).

Gutter icons do Monaco **não** são alterados nesta mudança. O sistema MUST expor o conjunto de severidades visíveis para C09 aplicar CA-RF05-02 / CA-RF08-04.

#### Scenario: Desativar LOW e MEDIUM (CT06)
- **WHEN** o usuário desativa os chips LOW e MEDIUM com a sessão contendo as quatro severidades
- **THEN** apenas cards CRITICAL e HIGH permanecem visíveis e MUST NOT ocorrer requisição de rede

#### Scenario: Reativar MEDIUM restaura cards
- **WHEN** MEDIUM está desativado e o usuário reativa o chip MEDIUM
- **THEN** os cards MEDIUM OPEN voltam a ser visíveis

#### Scenario: Filtro não esconde outras severidades
- **WHEN** somente LOW está desativado
- **THEN** cards CRITICAL, HIGH e MEDIUM OPEN MUST permanecer visíveis

### Requirement: Filtro não apaga a sessão
Ocultar um nível MUST NÃO remover o alerta da memória nem alterar `RESOLVED`. Recarregar a página zera filtros para o default (todos visíveis) porque não há persistência.

#### Scenario: Card oculto ainda existe na sessão
- **WHEN** o usuário oculta CRITICAL e depois reativa CRITICAL
- **THEN** o mesmo `id` de alerta MUST reaparecer sem nova ingestão
