# Arquitetura de Software — Agent Code Review

> **Produto:** Agent Code Review — Revisão Inteligente e Interativa de Código com IA
> **Versão:** 1.0.0-MVP
> **Data:** 2026-09-19
> **Autor:** Braulley (Arquiteto de Software)
> **Status:** Em Revisão
> **Referência Spec:** `docs/spec.md`
> **Referência PRD:** `docs/prd.md`

---

## Contexto Arquitetural

### Objetivo

Este documento define a arquitetura de software do produto **Agent Code Review**, estabelecendo diretrizes técnicas, restrições arquiteturais e requisitos não funcionais para implementação por equipes humanas e agentes de inteligência artificial.

O sistema combina um editor de código visual (Monaco Editor) com um motor de análise baseado em LLM (Gemini `gemini-3.6-flash`) para detectar, categorizar e sugerir correções para problemas de segurança (OWASP Top 10), performance e qualidade de código. O sistema opera integralmente no navegador sem recarregamentos de página, com streaming de resultados via SSE e aplicação atômica de correções com um clique.

### Escopo

A arquitetura contempla:

* **Frontend** — Aplicação Next.js 15 com Monaco Editor, painel de alertas e Code Health Dashboard
* **Backend** — API FastAPI com streaming SSE, orquestração de LLM e ingestão de diffs
* **Banco de Dados** — MVP stateless (sem persistência); sessão gerenciada in-memory no frontend
* **Infraestrutura** — Containerização Docker + Docker Compose para dev/deploy
* **Segurança** — Chaves de API isoladas no servidor; sem exposição client-side
* **Observabilidade** — Logs estruturados no backend; health check endpoint
* **Integrações Externas** — Google Gemini API, GitHub REST API v3, GitLab API v4

### Arquitetura de Referência

* **Estilo arquitetural:** Client-Server com camada de orquestração de LLM (Backend-for-Frontend - BFF)
* **Comunicação:** REST + Server-Sent Events (SSE) sobre HTTPS/TLS 1.2+; JSON como formato de payload
* **Infraestrutura:** Container-based (Docker + Docker Compose); deploy em qualquer ambiente compatível com containers OCI
* **Observabilidade:** Logs estruturados (stdout JSON) no backend FastAPI; endpoint `/api/health` para readiness/liveness
* **Segurança:** API Keys gerenciadas exclusivamente por variáveis de ambiente no servidor; nunca expostas no bundle client-side

### Stack Tecnológica

#### Frontend

* **Linguagem:** TypeScript 5.x
* **Framework:** Next.js 15 (App Router)
* **Roteamento:** File-based routing do App Router (Next.js)
* **Estilização:** Tailwind CSS v4.x
* **Bibliotecas adicionais:**
  * `@monaco-editor/react` 4.x — Editor de código com suporte a diff e multilinguagem
  * `react-diff-viewer-continued` 4.x — Visualizador side-by-side e unified diff
  * Hooks customizados: `useSSE`, `useAlerts`, `useEditor`, `useEditorHighlight`

#### Backend

* **Linguagem:** Python 3.12+
* **Runtime:** CPython (ASGI via Uvicorn)
* **Framework:** FastAPI 0.115.x
* **Validação de Schema:** Pydantic v2.x (sem ORM/ODM — MVP stateless)
* **Streaming:** `sse-starlette` (SSE proxy para o cliente)

#### Banco de Dados

* **SGBD:** Não aplicável no MVP — arquitetura stateless
* **Versão mínima:** N/A
* **Nota:** O estado de sessão (alertas, análise em curso) é mantido in-memory no frontend. Nenhum dado é persistido no backend.

#### Observabilidade

* **Plataforma:** Logs estruturados via `logging` Python (stdout JSON) + endpoint `/api/health`
* **Métricas rastreadas:** `tokens_used`, `analysis_duration_ms`, erros de schema (Pydantic), erros de API (Gemini/GitHub/GitLab)

#### Identidade

* **Provedor:** Não aplicável no MVP (single-tenant, sem autenticação de usuário)
* **API Keys:** Gerenciadas via variáveis de ambiente (`GEMINI_API_KEY`, `GITHUB_TOKEN`, `GITLAB_TOKEN`)

#### Desenvolvimento

* **Ferramentas:** Docker Desktop, VS Code / Cursor, Node.js 20+, Python 3.12+, `uv` ou `pip` para dependências Python

#### DevOps

* **CI/CD:** GitHub Actions (pipelines de lint, test e build automáticos)
* **Infraestrutura como código:** Docker Compose 2.x (desenvolvimento e staging)

### Estrutura do Repositório

```text
agent-codereview/
├── frontend/                    # Aplicação Next.js 15
│   ├── app/                     # App Router (páginas e layouts)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   ├── components/
│   │   ├── Editor/
│   │   ├── AlertPanel/
│   │   ├── DiffViewer/
│   │   ├── HealthDashboard/
│   │   └── ui/
│   ├── hooks/
│   │   ├── useSSE.ts
│   │   ├── useAlerts.ts
│   │   ├── useEditor.ts
│   │   └── useEditorHighlight.ts
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── health-score.ts
│   │   └── pr-url-validator.ts
│   └── types/
│       ├── alert.ts
│       └── analysis.ts
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   └── dependencies.py
│   │   ├── core/
│   │   │   ├── analyzer/
│   │   │   ├── validator/
│   │   │   └── scorer/
│   │   ├── integrations/
│   │   │   ├── llm/
│   │   │   ├── github/
│   │   │   └── gitlab/
│   │   └── config/
│   └── tests/
│       ├── unit/
│       └── integration/
├── docs/
├── openspec/
├── docker-compose.yml
├── .github/workflows/
└── README.md
```

---

## Adequação Funcional

### Fonte Única de Verdade

* **Regras de negócio** (detecção de problemas, validação de schema, cálculo de Code Health Score no backend) residem **exclusivamente no backend FastAPI**.
* **Estado de sessão** (lista de alertas ativos, filtros aplicados, alertas resolvidos) é mantido **exclusivamente no frontend** (React state / hooks), sem round-trip à API para operações puramente client-side.
* O **schema de alerta** (JSON Schema + Pydantic model) é a fonte de verdade para o contrato de dados entre LLM, backend e frontend.

### Política de Comunicação entre Camadas

Todas as operações de negócio que envolvem IA ou plataformas externas devem ocorrer através de:

* **API REST + SSE** entre Frontend e Backend (`/api/analyze`, `/api/diff/ingest`)
* **HTTPS** para comunicação Backend → Gemini API e Backend → GitHub/GitLab APIs

É proibido:

* Chamar a Gemini API diretamente do frontend (exporia a `GEMINI_API_KEY` no bundle client-side — violação do RNF03)
* Acessar diretamente os tokens GitHub/GitLab do client-side
* Persistir código submetido, diffs ou credenciais em banco de dados ou logs sem autorização explícita

### APIs e Versionamento

Base URL (backend):

```text
http://localhost:8000/api   (desenvolvimento)
https://<domínio>/api       (staging / produção)
```

Estratégia de versionamento:

```text
MVP: sem versionamento explícito na URL (caminho direto /api/*)
Evolução futura: /api/v2/* quando houver breaking changes no contrato
```

### Endpoints Públicos

* `GET /api/health` — Health check; retorna status, versão e conectividade com Gemini API

### Endpoints Operacionais (requerem API Key no servidor)

* `POST /api/analyze` — Inicia análise de código via LLM; retorna streaming SSE com eventos `alert`, `score` e `done`
* `POST /api/diff/ingest` — Ingere diff de PR/MR via URL pública do GitHub ou GitLab

### Contrato de API

* APIs devem possuir documentação OpenAPI automática (FastAPI `/docs` e `/redoc`)
* Payloads utilizam formato **JSON** (application/json)
* Respostas de análise utilizam **SSE** (text/event-stream) para streaming progressivo
* Erros retornam JSON com campos `error` (código de máquina), `message` (texto amigável) e `detail` (opcional)
* O backend é fonte única de verdade para validação de schema — o frontend não deve inferir ou corrigir dados inválidos da API
* Regras de negócio (ex: truncamento de diffs > 500 linhas) residem exclusivamente no backend

### Estratégia de Tenancy

#### MVP

* **Single-tenant, stateless:** Cada requisição é independente. Não há conceito de usuário, sessão persistida ou organização. Ideal para uso individual / equipes pequenas.

#### Evolução Futura

* **Multi-tenant com RBAC por organização:** Introdução de autenticação (OAuth2/OIDC), identificação de workspace por organização e controle de acesso por papel (revisor, leitura, admin). Fora do escopo do MVP (OS05).

---

## Eficiência de Desempenho

### Comunicação entre Componentes

* **Protocolo:** HTTPS/TLS 1.2+ para todas as comunicações frontend→backend e backend→APIs externas
* **Formato:** JSON para payloads REST; SSE (text/event-stream) para streaming de alertas
* **Requisitos de segurança:** Toda comunicação em produção obrigatoriamente sobre TLS; sem fallback para HTTP

### Targets de Latência (RNF02)

| Métrica | Target | Condição |
|---|---|---|
| Skeleton loader visível | ≤ 200ms | Após clique em "Analisar" |
| Início do streaming SSE no backend | ≤ 500ms | Após receber requisição |
| Time-to-first-alert (TTFA) | ≤ 1.500ms (p95) | Rede 50 Mbps |
| Ingestão de diff via URL de PR | < 5s (p95) | PRs públicos |
| Aplicação de correção (client-side) | < 100ms | Puramente client-side |
| Filtros de severidade (client-side) | < 100ms | Sem round-trip à API |
| Navegação bidirecional editor-painel | < 300ms | Latência perceptível |

### Rate Limiting

* **Usuário anônimo:** Limitado pela cota da Gemini API (`GEMINI_API_KEY`); sem rate limiting adicional no MVP
* **Recomendação futura:** Implementar rate limiting por IP (ex: 10 análises/hora) via middleware FastAPI antes da produção pública

### Transações e Persistência

* **MVP:** Sem transações de banco de dados. Estado transiente mantido in-memory no processo FastAPI durante o streaming SSE.
* **Truncamento:** Diffs > 500 linhas são truncados no backend antes do envio à LLM, com aviso retornado ao frontend.

### Estratégias Futuras de Escalabilidade

* **Horizontal scaling do backend:** Múltiplas réplicas do contêiner FastAPI atrás de um load balancer (stateless por design)
* **Caching de resultados:** Cache de análises por hash do código-fonte (Redis/Memcached) para reduzir chamadas à Gemini API
* **Queue-based processing:** Fila assíncrona (ex: Celery + Redis) para análises longas, desacoplando o request HTTP do processamento da LLM

---

## Compatibilidade

### Integração

| Sistema | Finalidade | Protocolo | Autenticação | Variável de Ambiente |
|---|---|---|---|---|
| **Google Gemini API** | Motor de análise LLM (Structured Output + streaming) | HTTPS / REST | API Key | `GEMINI_API_KEY` |
| **GitHub REST API v3** | Ingestão de diff de Pull Requests públicos | HTTPS / REST | Token pessoal (opcional) | `GITHUB_TOKEN` |
| **GitLab API v4** | Ingestão de diff de Merge Requests públicos | HTTPS / REST | Token pessoal (opcional) | `GITLAB_TOKEN` |

### Contrato de Dados com a LLM

O backend MUST chamar a Gemini API com `response_schema` ativado (Structured Outputs) em 100% das requisições. O schema JSON imposto é:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "file", "line_start", "line_end", "severity", "title", "description", "suggestion", "category"],
  "properties": {
    "id":          { "type": "string", "format": "uuid" },
    "file":        { "type": "string" },
    "line_start":  { "type": "integer", "minimum": 1 },
    "line_end":    { "type": "integer", "minimum": 1 },
    "severity":    { "type": "string", "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
    "title":       { "type": "string", "maxLength": 120 },
    "description": { "type": "string" },
    "suggestion":  { "type": "string" },
    "category":    { "type": "string", "enum": ["SECURITY", "PERFORMANCE", "QUALITY", "MAINTAINABILITY"] }
  }
}
```

Toda resposta recebida da LLM MUST ser validada independentemente via **Pydantic v2** antes de ser retransmitida ao frontend.

### Compatibilidade de Browsers

* **Suportados (MVP):** Chrome 120+, Firefox 121+, Edge 120+, Safari 17+
* **Requisito:** Consumo de SSE via `fetch` + `ReadableStream` (POST `/api/analyze`; `EventSource` nativo não envia body POST)
* **Não suportado:** IE11, navegadores sem suporte a ES2020+

### Extensões de Arquivo Suportadas (Upload)

`.py`, `.js`, `.ts`, `.jsx`, `.tsx`, `.java`, `.go`, `.php`, `.rb`

---

## Diagrama de Componentes

```
+-----------------------------------------------------------------+
|                        BROWSER (Client)                         |
|                                                                 |
|  +----------------------+     +------------------------------+  |
|  |   Monaco Editor      |<--->|   Alert Panel (React)        |  |
|  |   (Code / Diff View) |     |   Cards CRITICAL/HIGH/MED/LOW|  |
|  +----------+-----------+     +----------+-------------------+  |
|             |                            |                      |
|  +----------v----------------------------v-------------------+  |
|  |     Code Health Dashboard + Severity Filters              |  |
|  |     useAlerts | useSSE | useEditor | useEditorHighlight   |  |
|  +-----------------------------------+-----------------------+  |
|                                     | SSE (text/event-stream)  |
|                                     | REST (JSON)              |
+-------------------------------------+---------------------------+
                                      |
+-------------------------------------v---------------------------+
|                      BACKEND (Python / FastAPI)                 |
|                                                                 |
|  +--------------------+   +--------------------------------+   |
|  |  API Gateway       |   |  Diff Ingestion Service        |   |
|  |  FastAPI + SSE     |   |  GitHub / GitLab REST API      |   |
|  +--------+-----------+   +--------------------------------+   |
|           |                                                     |
|  +--------v--------------------------------------------------+  |
|  |  LLM Orchestration Service                                |  |
|  |  - System Instructions determinísticas                    |  |
|  |  - JSON Schema Enforcement (response_schema Gemini)       |  |
|  |  - Pydantic v2 Validation Layer                           |  |
|  |  - SSE Streaming Proxy (sse-starlette)                    |  |
|  +------------------------------------------+---------------+  |
+---------------------------------------------+-----------------+
                                              | HTTPS/TLS 1.2+
+---------------------------------------------v-----------------+
|                    GEMINI API (Google AI)                       |
|           Model: gemini-3.6-flash (Structured Output)          |
+-----------------------------------------------------------------+
```

---

## Decisões Arquiteturais (ADRs)

> Para o detalhamento formal com histórico de propostas de IA vs. revisão crítica do arquiteto, opções consideradas e rastreabilidade com testes, consulte o documento consolidado: **[`docs/adr.md`](./adr.md)**.

### ADR-01 — SSE em vez de WebSocket para Streaming

**Contexto:** O sistema precisa entregar alertas progressivamente da LLM para o frontend.

**Decisão:** Utilizar Server-Sent Events (SSE) via `sse-starlette`.

**Justificativa:** SSE é unidirecional (servidor → cliente), mais simples de implementar e depurar, sem overhead de handshake bidirecional. O caso de uso (streaming de resultados) é intrinsecamente unidirecional. O cliente consome o stream com `fetch` + `ReadableStream` porque a análise é iniciada por POST com body JSON (`EventSource` nativo só faz GET).

**Consequência:** Comunicação cliente → servidor continua via REST (POST). Não há canal bidirecional em tempo real. O protocolo no fio permanece SSE (`event:` / `data:`).

---

### ADR-02 — MVP Stateless (sem banco de dados)

**Contexto:** O MVP precisa ser entregue rapidamente e o código submetido não deve ser persistido sem autorização.

**Decisão:** Arquitetura 100% stateless no backend. Nenhum banco de dados no MVP.

**Justificativa:** Reduz a superfície de ataque (nenhum dado sensível armazenado), simplifica o deploy (apenas dois containers: frontend + backend) e cumpre o requisito de privacidade do RNF03.

**Consequência:** Não há histórico de análises entre sessões. O usuário perde o estado ao recarregar a página. Evolução futura pode adicionar persistência opcional.

---

### ADR-03 — Pydantic v2 como camada de validação independente

**Contexto:** A LLM pode retornar JSON malformado mesmo com `response_schema` ativado.

**Decisão:** Validar 100% das respostas da LLM com Pydantic v2 antes de qualquer processamento ou retransmissão.

**Justificativa:** Defense in depth — `response_schema` do Gemini reduz (mas não elimina) o risco de respostas inválidas. Pydantic v2 garante tipagem estrita e mensagens de erro padronizadas. Erros de validação são logados e retornam mensagem amigável ao usuário sem quebrar a sessão.

**Consequência:** Pequeno overhead de validação (~ms) em cada alerta processado. Aceitável dado o contexto.

---

### ADR-04 — Monaco Editor como editor principal

**Contexto:** O sistema precisa de um editor de código com suporte a highlight, gutter icons e diff view.

**Decisão:** Utilizar Monaco Editor via `@monaco-editor/react`.

**Justificativa:** Monaco é a engine do VS Code, com suporte nativo a diff view, gutter icons, `executeEdits` (para aplicação atômica de correções) e undo stack nativo. Elimina a necessidade de implementar essas funcionalidades do zero.

**Consequência:** Bundle size aumentado (~2MB gzipped). Aceitável para o perfil de usuário (desenvolvedores em desktops).

---

### ADR-05 — Seleção do Modelo Gemini Flash e Truncamento Rígido em 500 Linhas

**Contexto:** O sistema necessita de latência ultra-baixa (TTFA ≤ 1,5s), custos operacionais baixos e proteção contra sobrecarga.

**Decisão:** Adotar `gemini-3.6-flash` (com fallbacks) e impor truncamento estrito de 500 linhas no backend (`MAX_CODE_LINES`).

**Justificativa:** Excelente relação custo/latência para tarefas de estruturação JSON, reduz superfície de ataque de prompt injection indireto e incentiva PRs atômicos.

**Consequência:** Arquivos que excedem 500 linhas são analisados parcialmente, emitindo aviso ao usuário.

---

### ADR-06 — Padrão Backend-for-Frontend (BFF) para Isolamento Estrito de Segredos

**Contexto:** O produto consome APIs externas com credenciais privilegiadas (`GEMINI_API_KEY`, `GITHUB_TOKEN`, `GITLAB_TOKEN`).

**Decisão:** O cliente Next.js nunca chama APIs externas diretamente. Toda orquestração ocorre via backend FastAPI.

**Justificativa:** Cumprimento rigoroso do RNF03 (chaves 100% no servidor, zero exposição no bundle client-side) e prevenção contra ataques SSRF.

**Consequência:** Necessidade de coordenação de dois serviços (`frontend` e `backend`) em desenvolvimento e produção via Docker Compose.

---

## Requisitos Não Funcionais — Resumo

| ID | Requisito | Target | Prioridade |
|---|---|---|---|
| RNF01 | Confiabilidade de schemas (Pydantic v2 + response_schema) | < 0,1% erros de schema em produção | P0 |
| RNF02 | Latência e streaming (TTFA ≤ 1.500ms p95) | Medido em rede 50 Mbps | P0 |
| RNF03 | Segurança e privacidade (sem API Key no bundle client-side) | 100% das chaves em variáveis de ambiente | P0 |
| RNF04 | Responsividade da UI (Monaco ≥ 30 FPS com 2.000 linhas) | Hardware médio (4 núcleos, 8 GB RAM) | P1 |
| RNF05 | Tratamento de erros e resiliência (sem perda de estado de sessão) | 100% dos erros de parsing não quebram a sessão | P1 |

---

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
|---|---|---|---|
| 1.0.0 | 2026-09-19 | Braulley (Arquiteto de Software) | Criação inicial da arquitetura do MVP |
