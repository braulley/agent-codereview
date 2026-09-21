## Purpose

Define o layout do repositório e o contrato de ambiente local para que frontend e backend do MVP sejam desenvolvidos no mesmo repo, sem persistência e sem chaves no cliente.

## ADDED Requirements

### Requirement: Estrutura do monorepo
O repositório MUST conter as árvores `frontend/` e `backend/` alinhadas a `docs/spec.md` §2.3 (Prioridade P0; ator: desenvolvedor). `frontend/` MUST incluir `app/`, `components/` (Editor, AlertPanel, DiffViewer, HealthDashboard, ui), `hooks/`, `lib/` e `types/`. `backend/` MUST incluir `src/api/routes`, `src/core/{analyzer,validator,scorer}`, `src/integrations/{llm,github,gitlab}`, `src/config` e `tests/{unit,integration}`. Pacotes sem lógica nesta mudança MUST existir como diretórios vazios válidos. CTs: nenhum (CT01–CT08 não aplicáveis).

#### Scenario: Árvore de referência presente
- **WHEN** um desenvolvedor clona o repositório após esta mudança
- **THEN** os diretórios listados em `docs/spec.md` §2.3 para `frontend/` e `backend/` existem no workspace

#### Scenario: Sem datastore no layout
- **WHEN** a estrutura do repositório é inspecionada
- **THEN** não há serviço ou diretório de SGBD, fila ou cache obrigatório para subir o MVP (ADR-02)

### Requirement: Template de variáveis de ambiente do produto
O arquivo `.env.example` MUST documentar exatamente as variáveis de produto: `GEMINI_API_KEY` (obrigatória), `GITHUB_TOKEN` (opcional) e `GITLAB_TOKEN` (opcional). MUST NOT documentar prefixo de URL `/api/v1` nem chaves de ferramentas de autoria (RNF03). O arquivo `.env` MUST estar ignorado pelo Git.

#### Scenario: Template alinhado à spec
- **WHEN** um desenvolvedor abre `.env.example`
- **THEN** o arquivo lista `GEMINI_API_KEY`, `GITHUB_TOKEN` e `GITLAB_TOKEN` e não lista `GLOBAL_PREFIX`, `CONTEXT7_API_KEY` nem `STITCH_API_KEY`

#### Scenario: Segredo local fora do Git
- **WHEN** um desenvolvedor cria `.env` a partir do template
- **THEN** o Git ignora `.env` e o arquivo não pode ser adicionado por engano via padrões do `.gitignore`

### Requirement: Aplicações locais sobem sem lógica de negócio
O backend MUST expor um processo HTTP em `127.0.0.1:8000` e o frontend MUST expor um processo HTTP em `127.0.0.1:3000` sem implementar `POST /api/analyze` nem `POST /api/diff/ingest`. A documentação de setup MUST permitir o fluxo `cp .env.example .env` seguido dos comandos de `AGENTS.md` (DoD `docs/spec.md` §8).

#### Scenario: Portas de desenvolvimento
- **WHEN** frontend e backend são iniciados em modo local (sem Compose)
- **THEN** `http://127.0.0.1:3000` responde HTTP 200 e `http://127.0.0.1:8000` aceita requisições HTTP

#### Scenario: Rotas de negócio ausentes
- **WHEN** um cliente chama `POST /api/analyze` ou `POST /api/diff/ingest`
- **THEN** o backend não trata esses caminhos como funcionalidade de produto (404 ou equivalente de rota inexistente)
