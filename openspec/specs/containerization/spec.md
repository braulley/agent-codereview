# containerization Specification

## Purpose

Define como o MVP sobe em dois containers (frontend e backend), sem datastore, com probe de liveness e chaves injetadas só por ambiente (RNF03, ADR-02).

## Requirements

### Requirement: Compose de dois serviços sem persistência
O sistema MUST publicar o frontend na porta `3000` e o backend na porta `8000` via Docker Compose. MUST NOT incluir Postgres, SQLite, Redis, RabbitMQ ou volume de persistência de código/diff (ADR-02, RNF03). Prioridade P0; ator: desenvolvedor. CTs: nenhum.

#### Scenario: Smoke de Compose
- **WHEN** o desenvolvedor executa `docker compose up --build` com `.env` presente
- **THEN** ambos os serviços ficam alcançáveis em `http://127.0.0.1:3000` e `http://127.0.0.1:8000`

#### Scenario: Sem banco no Compose
- **WHEN** o arquivo Compose é inspecionado ou os containers em execução são listados
- **THEN** não há serviço de banco, fila ou cache além de frontend e backend

### Requirement: Probe de liveness do backend
O backend MUST responder `GET /api/health` com HTTP 200 e JSON contendo `"status": "healthy"`. Este probe NÃO substitui o contrato completo de `docs/spec.md` §5.3 (`version`, `gemini_api`, `timestamp`), que permanece fora desta mudança (C02). Caminho MUST ser `/api/health` (sem `/api/v1`).

Contrato mínimo desta mudança:

```json
{
  "status": "healthy"
}
```

#### Scenario: Probe HTTP 200
- **WHEN** um cliente chama `GET /api/health` com o backend no ar
- **THEN** a resposta é HTTP 200, `Content-Type` JSON, e o corpo inclui `"status": "healthy"`

#### Scenario: Sem versionamento de URL
- **WHEN** um cliente chama `GET /api/v1/health`
- **THEN** essa rota não é o probe oficial do MVP (não é o caminho documentado em `docs/spec.md` §5.3)

### Requirement: Segredos só no ambiente do servidor
Imagens e Compose MUST receber `GEMINI_API_KEY`, `GITHUB_TOKEN` e `GITLAB_TOKEN` apenas por variáveis de ambiente / `env_file`. MUST NOT gravar valores reais dessas chaves em Dockerfile, Compose ou imagem. Tokens GitHub/GitLab MUST ser opcionais para o probe de liveness. Nenhum código submetido pelo usuário é persistido (não há datastore). RNF03.

#### Scenario: Chaves não baked-in
- **WHEN** Dockerfiles e Compose são inspecionados no repositório
- **THEN** não há valor real de `GEMINI_API_KEY`, `GITHUB_TOKEN` ou `GITLAB_TOKEN` commitado

#### Scenario: Probe sem tokens de forge
- **WHEN** o backend sobe sem `GITHUB_TOKEN` e sem `GITLAB_TOKEN`
- **THEN** `GET /api/health` ainda retorna HTTP 200
