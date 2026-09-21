## Purpose

Recalcula no cliente o Code Health Score e a faixa visual a partir dos alertas da sessão, com a mesma fórmula do backend (RF06), sem round-trip.

## ADDED Requirements

### Requirement: Fórmula ponderada no cliente (RF06)
O frontend SHALL calcular o score somente em memória, a partir da lista de alertas da sessão (campos `severity` no enum `CRITICAL` \| `HIGH` \| `MEDIUM` \| `LOW`). Prioridade P1. Ator: Sistema (Frontend).

```
code_health_score = max(0, 100 - (CRITICAL × 25 + HIGH × 10 + MEDIUM × 3 + LOW × 1))
```

O resultado MUST ser um inteiro 0–100. O cálculo MUST também produzir `alert_count` com as quatro chaves. A fórmula MUST ser idêntica à do backend (C03 `health-score`). MUST NOT chamar `/api/*` para obter o score local.

Payload de exemplo (CA-RF06-01):

```json
{
  "code_health_score": 49,
  "alert_count": {
    "CRITICAL": 1,
    "HIGH": 2,
    "MEDIUM": 1,
    "LOW": 3
  },
  "band": "ATTENTION"
}
```

CTs: **CT03** (lista vazia → 100). CT01/CT02/CT06–CT08 não se aplicam a esta função pura.

#### Scenario: Sem alertas o score é 100 (CT03, CA-RF06-03)
- **WHEN** a lista de alertas da sessão está vazia
- **THEN** `code_health_score` MUST ser 100 e cada chave de `alert_count` MUST ser 0

#### Scenario: Um CRITICAL reduz 25 pontos (CA-RF06-01)
- **WHEN** há exatamente um alerta `CRITICAL` e nenhum outro
- **THEN** `code_health_score` MUST ser 75 e `alert_count.CRITICAL` MUST ser 1

#### Scenario: Combinação mista aplica todos os pesos (CA-RF06-01)
- **WHEN** há 1 CRITICAL, 2 HIGH, 1 MEDIUM e 3 LOW
- **THEN** `code_health_score` MUST ser 49 e as contagens MUST ser 1/2/1/3

### Requirement: Score nunca negativo (CA-RF06-02)
O score MUST ser limitado em 0 quando a soma ponderada exceder 100.

#### Scenario: Quatro CRITICAL saturam em zero
- **WHEN** há quatro ou mais alertas `CRITICAL` e nenhum outro
- **THEN** `code_health_score` MUST ser 0 (nunca negativo)

### Requirement: Faixa visual canônica (CA-RF06-05)
Dado um score 0–100, o frontend MUST classificar a faixa com chave em inglês (alinhada a `docs/design.md`) e cores:

| Score | `band` | Cor |
|---|---|---|
| 91–100 | `EXCELLENT` | `#10B981` |
| 71–90 | `GOOD` | `#EAB308` |
| 41–70 | `ATTENTION` | `#F97316` |
| 0–40 | `CRITICAL` | `#EF4444` |

A renderização do gauge (componente HealthDashboard) permanece em C08. Nesta mudança só a função de classificação é obrigatória.

#### Scenario: Score 100 é EXCELLENT
- **WHEN** `code_health_score` é 100
- **THEN** `band` MUST ser `EXCELLENT` e a cor associada MUST ser `#10B981`

#### Scenario: Score 47 é ATTENTION
- **WHEN** `code_health_score` é 47
- **THEN** `band` MUST ser `ATTENTION` e a cor associada MUST ser `#F97316`

#### Scenario: Score 0 é CRITICAL
- **WHEN** `code_health_score` é 0
- **THEN** `band` MUST ser `CRITICAL` e a cor associada MUST ser `#EF4444`
