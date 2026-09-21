## Purpose

Exibe o Code Health Score e o breakdown por severidade no Left Telemetry Rail, com faixas visuais canônicas e recálculo local a partir dos alertas OPEN.

## ADDED Requirements

### Requirement: Exibição do score a partir de alertas OPEN (RF06)
O sistema SHALL mostrar em destaque no topo do rail um inteiro 0–100 derivado **somente** dos alertas OPEN da sessão, com a fórmula de `docs/spec.md` RF06 / C06 `client-health-score`:

```
code_health_score = max(0, 100 - (CRITICAL × 25 + HIGH × 10 + MEDIUM × 3 + LOW × 1))
```

Prioridade P1. Ator: Sistema (Frontend). MUST NOT chamar Gemini nem `/api/*` para obter o número mostrado. Um evento SSE `score` pode ser guardado; após qualquer mudança local (ingest, resolve) o valor visível MUST ser o recálculo local (CA-RF06-04, < 100 ms).

Payload de exemplo (1 CRITICAL + 2 HIGH + 5 MEDIUM + 3 LOW → 25):

```json
{
  "code_health_score": 25,
  "alert_count": {
    "CRITICAL": 1,
    "HIGH": 2,
    "MEDIUM": 5,
    "LOW": 3
  },
  "band": "ATTENTION"
}
```

CTs: **CT03** (lista vazia → 100). Fórmula unitária já coberta em C06; esta capacidade cobre a UI.

#### Scenario: Sem alertas o gauge mostra 100 (CT03, CA-RF06-03)
- **WHEN** a sessão não tem alertas OPEN
- **THEN** o score visível MUST ser 100 e cada contagem do breakdown MUST ser 0

#### Scenario: Um CRITICAL mostra 75
- **WHEN** há exatamente um alerta OPEN CRITICAL e nenhum outro OPEN
- **THEN** o score visível MUST ser 75

#### Scenario: Recálculo após RESOLVED (CA-RF06-04)
- **WHEN** o único OPEN CRITICAL passa a RESOLVED
- **THEN** o score visível MUST ser 100 em menos de 100 ms sem round-trip

### Requirement: Faixas visuais e breakdown (CA-RF06-05)
O gauge MUST classificar e colorir conforme `docs/design.md` (chaves em inglês; equivalentes PT de `docs/spec.md` RF06 não são o `band` da UI):

| Score | band | Cor do número |
|---|---|---|
| 91–100 | EXCELLENT | `#10B981` |
| 71–90 | GOOD | `#EAB308` |
| 41–70 | ATTENTION | `#F97316` |
| 0–40 | CRITICAL | `#EF4444` |

O meter MUST ser card 0-radius com número em tipografia display e barra segmentada. O breakdown MUST listar as quatro contagens OPEN. Filtros de chip MUST NÃO alterar o score (score ignora visibilidade, só OPEN vs RESOLVED).

#### Scenario: Score 100 é EXCELLENT
- **WHEN** `code_health_score` visível é 100
- **THEN** o label MUST ser EXCELLENT e a cor do número MUST ser `#10B981`

#### Scenario: Score 25 é ATTENTION
- **WHEN** o recálculo local produz 25
- **THEN** o label MUST ser ATTENTION e a cor MUST ser `#F97316`

#### Scenario: Score 0 é CRITICAL
- **WHEN** há quatro ou mais CRITICAL OPEN
- **THEN** o score visível MUST ser 0 e o band MUST ser CRITICAL com cor `#EF4444`

#### Scenario: Filtro não muda o score
- **WHEN** o usuário oculta todos os chips mas restam alertas OPEN
- **THEN** o score visível MUST permanecer o da fórmula sobre todos os OPEN
