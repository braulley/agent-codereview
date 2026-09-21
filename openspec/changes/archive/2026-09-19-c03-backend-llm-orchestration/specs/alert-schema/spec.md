## Purpose

Define o contrato do alerta de revisão e a validação independente que impede payload malformado de chegar ao consumidor (C05/frontend). Cobre RF02 e RNF01.

## ADDED Requirements

### Requirement: Contrato de alerta estruturado (RF02)
O sistema SHALL produzir, para cada apontamento, um objeto JSON com todos os campos obrigatórios abaixo. Prioridade: P0. Ator: motor de análise.

Campos MUST:

| Campo | Tipo | Restrição |
|---|---|---|
| `id` | string UUID v4 | identificador único do alerta |
| `file` | string | nome do arquivo afetado |
| `line_start` | integer | ≥ 1, 1-indexed |
| `line_end` | integer | ≥ 1 e ≥ `line_start` |
| `severity` | enum | `CRITICAL` \| `HIGH` \| `MEDIUM` \| `LOW` |
| `title` | string | comprimento máximo 120 |
| `description` | string | justificativa técnica; OWASP quando aplicável |
| `suggestion` | string | substituição drop-in das linhas `line_start`–`line_end` |
| `category` | enum | `SECURITY` \| `PERFORMANCE` \| `QUALITY` \| `MAINTAINABILITY` |

Payload de exemplo (CA-RF02-03 / CT01):

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

#### Scenario: Alerta válido é aceito
- **WHEN** um objeto contém todos os campos obrigatórios com tipos, enums e intervalos corretos
- **THEN** o sistema MUST aceitar o alerta e disponibilizá-lo ao consumidor sem alteração semântica dos campos de conteúdo

#### Scenario: Identificador é UUID v4
- **WHEN** um alerta é aceito
- **THEN** o campo `id` MUST ser um UUID v4 válido (RFC 4122)

### Requirement: Rejeição de alerta inválido (RNF01, CA-RF02-01)
O sistema MUST validar 100% dos alertas candidatos contra o contrato acima **antes** de retransmitir. Um alerta MUST ser rejeitado quando: falta campo obrigatório; `severity` ou `category` está fora do enum; `line_start` ou `line_end` < 1; `line_end` < `line_start`; `title` excede 120 caracteres; `id` não é UUID v4.

#### Scenario: Severidade inválida é rejeitada
- **WHEN** um candidato traz `severity` diferente de `CRITICAL`, `HIGH`, `MEDIUM` ou `LOW`
- **THEN** o sistema MUST rejeitar esse alerta e MUST NOT entregá-lo ao consumidor

#### Scenario: Campo obrigatório ausente é rejeitado
- **WHEN** um candidato omite qualquer campo obrigatório do contrato RF02
- **THEN** o sistema MUST rejeitar esse alerta

#### Scenario: Intervalo de linhas inválido é rejeitado
- **WHEN** `line_start` < 1, `line_end` < 1, ou `line_end` < `line_start`
- **THEN** o sistema MUST rejeitar esse alerta
