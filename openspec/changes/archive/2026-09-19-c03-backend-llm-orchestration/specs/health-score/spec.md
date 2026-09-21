## Purpose

Calcula o Code Health Score e as contagens por severidade a partir dos alertas já validados, com a fórmula canônica do produto (RF06). A faixa visual (cor/label) permanece no frontend.

## ADDED Requirements

### Requirement: Fórmula ponderada do Code Health Score (RF06)
O sistema SHALL calcular:

```
code_health_score = max(0, 100 - (CRITICAL × 25 + HIGH × 10 + MEDIUM × 3 + LOW × 1))
```

usando somente alertas aceitos pelo contrato RF02. O resultado MUST ser um inteiro no intervalo 0–100. O sistema MUST também produzir `alert_count` com chaves `CRITICAL`, `HIGH`, `MEDIUM` e `LOW`.

Faixas visuais (referência RF06; renderização é frontend): EXCELENTE 91–100, BOM 71–90, ATENÇÃO 41–70, CRÍTICO 0–40.

#### Scenario: Sem alertas o score é 100 (CT03, CA-RF06-03)
- **WHEN** a lista de alertas aceitos está vazia
- **THEN** `code_health_score` MUST ser 100 e cada chave de `alert_count` MUST ser 0

#### Scenario: Um CRITICAL reduz 25 pontos (CA-RF06-01)
- **WHEN** há exatamente um alerta `CRITICAL` e nenhum outro
- **THEN** `code_health_score` MUST ser 75 e `alert_count.CRITICAL` MUST ser 1

#### Scenario: Combinação mista aplica todos os pesos (CA-RF06-01)
- **WHEN** há 1 CRITICAL, 2 HIGH, 1 MEDIUM e 3 LOW
- **THEN** `code_health_score` MUST ser `max(0, 100 - (25 + 20 + 3 + 3))` = 49 e as contagens MUST refletir 1/2/1/3

### Requirement: Score nunca negativo (CA-RF06-02)
O score MUST ser limitado em 0 quando a soma ponderada exceder 100.

#### Scenario: Quatro CRITICAL saturam em zero
- **WHEN** há quatro ou mais alertas `CRITICAL` e nenhum outro
- **THEN** `code_health_score` MUST ser 0 (nunca negativo)
