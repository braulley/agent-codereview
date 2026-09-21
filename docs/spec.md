# Especificação Técnica do Produto — Agent Code Review

> **Produto:** Agent Code Review — Revisão Inteligente e Interativa de Código com IA
> **Versão:** 1.0.0-MVP
> **Data:** 2026-09-19
> **Autores:** Braulley (Product Management)
> **Status:** Em Revisão
> **Referência PRD:** [`docs/prd.md`](./prd.md)
> **Referência Problema:** [`docs/problem.md`](./problem.md)

---

## 1. Introdução

### 1.1 Propósito

Este documento define a **Especificação Técnica do Produto** do Agent Code Review MVP v1.0.0. Destina-se a orientar equipes de engenharia (humanas e agentes de IA) na implementação, validação e integração do sistema, servindo como fonte única de verdade para os contratos funcionais, não funcionais e de interface do produto.

### 1.2 Visão do Sistema

O Agent Code Review é uma aplicação web full-stack que combina um editor de código visual (Monaco Editor) com um motor de análise baseado em LLM (Gemini `gemini-3.6-flash`) para detectar, categorizar e sugerir correções para problemas de segurança (OWASP Top 10), performance e qualidade de código. O sistema opera integralmente no navegador sem recarregamentos de página, com streaming de resultados via SSE e aplicação atômica de correções com um clique.

### 1.3 Escopo

**In-Scope (MVP):**

- Editor visual de código e visualizador de diffs (F01, F02)
- Destaque inline e painel lateral de alertas por severidade (F03, F04)
- Aplicação atômica de correções com undo nativo (F05)
- Integração com API Gemini via Structured Outputs + SSE (F06)
- Code Health Score com recálculo dinâmico (F07)
- Filtros de severidade client-side (F08)
- Ingestão de diff via URL de PR GitHub/GitLab (F09)
- Tratamento de erros e retry manual (F10)

**Out-of-Scope (MVP):**

- Execução dinâmica de código em sandbox (OS01)
- Auto-commit direto para branches protegidas (OS02)
- Substituição de linters de formatação pura (OS03)
- Revisão de IaC (Terraform, Bicep, CloudFormation) (OS04)
- Suporte multi-tenant com RBAC por organização (OS05)

### 1.4 Definições e Acrônimos

| Sigla/Termo | Definição |
|---|---|
| LLM | Large Language Model (Modelo de Linguagem de Grande Escala) |
| SSE | Server-Sent Events (streaming unidirecional servidor → cliente) |
| OWASP | Open Web Application Security Project |
| RF | Requisito Funcional |
| RNF | Requisito Não Funcional |
| DoD | Definition of Done (Critérios de Prontidão para Lançamento) |
| Hunk | Bloco contíguo de mudanças em um diff unificado |
| PR | Pull Request |
| MR | Merge Request |

### 1.5 Referências

- [PRD — Agent Code Review v1.0.0](./prd.md)
- [Problem Statement](./problem.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Google Gemini API — Structured Output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Monaco Editor Documentation](https://microsoft.github.io/monaco-editor/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js 15 — App Router](https://nextjs.org/docs/app)
- [GitHub REST API — Pull Requests](https://docs.github.com/en/rest/pulls/pulls)
- [GitLab API v4 — Merge Requests](https://docs.gitlab.com/ee/api/merge_requests.html)

---

## 2. Visão Geral da Arquitetura

### 2.1 Diagrama de Componentes

```
+-----------------------------------------------------------------+
|                        BROWSER (Client)                         |
|                                                                 |
|  +----------------------+     +------------------------------+  |
|  |   Monaco Editor      |<--->|   Alert Panel (React)        |  |
|  |   (Code / Diff View) |     |   Cards CRITICAL/HIGH/MED/LOW|  |
|  +----------+-----------+     +----------+-------------------+  |
|             |                            |                       |
|  +----------v----------------------------v-------------------+  |
|  |     Code Health Dashboard + Severity Filters              |  |
|  +-----------------------------------+-----------------------+  |
|                                      | SSE / REST               |
+--------------------------------------+---------------------------+
                                       |
+--------------------------------------v---------------------------+
|                      BACKEND (Python / FastAPI)                  |
|                                                                  |
|  +--------------------+   +--------------------------------+    |
|  |  API Gateway       |   |  Diff Ingestion Service        |    |
|  |  (FastAPI + SSE)   |   |  (GitHub / GitLab REST API)   |    |
|  +--------+-----------+   +--------------------------------+    |
|           |                                                      |
|  +--------v---------------------------------------------------+  |
|  |  LLM Orchestration Service                                  |  |
|  |  - System Instructions determinísticas                      |  |
|  |  - JSON Schema Enforcement (response_schema Gemini)        |  |
|  |  - Pydantic v2 Validation Layer                            |  |
|  |  - SSE Streaming Proxy (sse-starlette)                     |  |
|  +------------------------------------+-----------------------+  |
+--------------------------------------+---------------------------+
                                       | HTTPS
+--------------------------------------v---------------------------+
|                    GEMINI API (Google AI)                        |
|           Model: gemini-3.6-flash (Structured Output)           |
+-----------------------------------------------------------------+
```

### 2.2 Stack Tecnológica

| Camada | Tecnologia | Versão Mínima | Justificativa |
|---|---|---|---|
| Frontend Framework | Next.js (App Router) | 15.x | SSR/SSE nativo, file-based routing, streaming otimizado |
| Linguagem Frontend | TypeScript | 5.x | Tipagem estrita para contrato de dados da LLM |
| Estilização | Tailwind CSS | v4.x | Utilitários de design system, consistência visual |
| Editor de Código | Monaco Editor (@monaco-editor/react) | 4.x | Engine VS Code; suporte nativo a diff e multilinguagem |
| Visualizador de Diff | react-diff-viewer-continued | 4.x | Side-by-side e unified diff em React |
| Backend Framework | FastAPI | 0.115.x | Async-first, Pydantic integrado, SSE com sse-starlette |
| Linguagem Backend | Python | 3.12+ | Compatibilidade com Pydantic v2 e typing moderno |
| Validação de Schema | Pydantic | v2.x | Validação declarativa do JSON retornado pela LLM |
| Provedor de IA | Google Gemini API | gemini-3.6-flash | response_schema (Structured Outputs), streaming nativo |
| Streaming | Server-Sent Events (SSE) | — | Unidirecional servidor para cliente, sem overhead de WebSocket |
| Containerização | Docker + Docker Compose | 24.x / 2.x | Ambiente reproduzível para dev e deploy |
| CI/CD | GitHub Actions | — | Pipelines de lint, test e build automáticos |

### 2.3 Estrutura de Repositório (Referência)

```
agent-codereview/
├── frontend/                   # Aplicação Next.js 15
│   ├── app/                    # App Router (páginas e layouts)
│   ├── components/             # Monaco Editor, Alert Panel, Dashboard
│   ├── hooks/                  # useSSE, useAlerts, useEditor
│   ├── lib/                    # Cliente HTTP, formatadores
│   └── types/                  # Tipos TypeScript (AlertItem, etc.)
├── backend/                    # Aplicação FastAPI
│   ├── src/
│   │   ├── api/                # Rotas FastAPI (routes, dependencies)
│   │   ├── core/
│   │   │   ├── analyzer/       # LLM Orchestration Service
│   │   │   ├── validator/      # Pydantic schema validation
│   │   │   └── scorer/         # Code Health Score calculator
│   │   ├── integrations/
│   │   │   ├── llm/            # Gemini API client (abstração)
│   │   │   ├── github/         # GitHub REST API client
│   │   │   └── gitlab/         # GitLab API v4 client
│   │   └── config/             # Settings (variáveis de ambiente)
│   └── tests/
│       ├── unit/
│       └── integration/
├── docs/                       # Documentação (prd.md, spec.md, problem.md)
├── openspec/                   # Especificações OpenSpec
├── docker-compose.yml
└── .github/workflows/          # CI/CD pipelines
```

### 2.4 Integrações Externas

| Integração | Finalidade | Autenticação | Env Var |
|---|---|---|---|
| Google Gemini API | Motor de análise LLM | API Key | GEMINI_API_KEY |
| GitHub REST API v3 | Ingestão de diff de PRs públicos | Token pessoal opcional | GITHUB_TOKEN |
| GitLab API v4 | Ingestão de diff de MRs | Token pessoal opcional | GITLAB_TOKEN |

> **Regra de segurança:** Nenhuma das chaves de API acima deve ser exposta no bundle client-side. Toda autenticação ocorre exclusivamente no servidor backend.

---

## 3. Requisitos Funcionais

> **Convenção de prioridade:** P0 = Bloqueador de MVP; P1 = Importante para MVP; P2 = Desejável no MVP

---

### RF01 — Entrada de Código

| Atributo | Valor |
|---|---|
| **ID** | RF01 |
| **Nome** | Entrada de Código |
| **Prioridade** | P0 — Bloqueador de MVP |
| **Ator** | Desenvolvedor Solicitante / Tech Lead |

**Descrição:**
O sistema SHALL aceitar código-fonte e diffs via três modalidades de entrada, todas operando sem recarregamento de página:

1. **Inserção manual:** O usuário cola diretamente código ou diff (plain text ou formato unified diff) no Monaco Editor integrado à interface principal.
2. **Upload de arquivo:** O usuário carrega um arquivo de código-fonte local (extensões suportadas: `.py`, `.js`, `.ts`, `.jsx`, `.tsx`, `.java`, `.go`, `.php`, `.rb`). O conteúdo é lido via FileReader API e injetado no editor.
3. **URL de PR/MR:** O usuário fornece a URL de um Pull Request (GitHub) ou Merge Request (GitLab) público. O backend faz a ingestão do diff via API REST da plataforma e retorna o conteúdo formatado.

**Critérios de Aceite:**

| # | Critério | Método de Verificação |
|---|---|---|
| CA-RF01-01 | As três modalidades estão disponíveis e funcionais sem reload de página | Teste E2E — CT01, CT02, CT05 |
| CA-RF01-02 | Upload aceita extensões listadas e rejeita outros tipos com mensagem descritiva | Teste de integração frontend |
| CA-RF01-03 | URL de PR inválida ou privada exibe validação client-side antes do envio à API | CT05 |
| CA-RF01-04 | URL de PR válida resulta em diff carregado no editor em < 5s (p95) | Teste de performance |
| CA-RF01-05 | Diffs superiores a 500 linhas são truncados pelo backend com aviso ao usuário | Teste de integração backend |

---

### RF02 — Diagnóstico Estruturado

| Atributo | Valor |
|---|---|
| **ID** | RF02 |
| **Nome** | Diagnóstico Estruturado |
| **Prioridade** | P0 — Bloqueador de MVP |
| **Ator** | Sistema (LLM + Parser) |

**Descrição:**
O motor de análise (LLM + camada de validação Pydantic) SHALL produzir, para cada apontamento identificado, um objeto JSON conforme o schema abaixo. A API Gemini MUST ser chamada com `response_schema` ativado (Structured Outputs). O backend MUST validar independentemente via Pydantic v2 antes de retransmitir ao frontend.

**Contrato de Interface — Schema de Alerta:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "file", "line_start", "line_end", "severity", "title", "description", "suggestion", "category"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Identificador único do alerta (UUID v4)"
    },
    "file": {
      "type": "string",
      "description": "Nome do arquivo afetado (ex: 'users.py')"
    },
    "line_start": {
      "type": "integer",
      "minimum": 1,
      "description": "Linha inicial do trecho problemático (1-indexed)"
    },
    "line_end": {
      "type": "integer",
      "minimum": 1,
      "description": "Linha final do trecho problemático (>= line_start)"
    },
    "severity": {
      "type": "string",
      "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
      "description": "Nível de severidade do problema"
    },
    "title": {
      "type": "string",
      "maxLength": 120,
      "description": "Título curto e descritivo do problema"
    },
    "description": {
      "type": "string",
      "description": "Justificativa técnica completa, incluindo referência OWASP quando aplicável"
    },
    "suggestion": {
      "type": "string",
      "description": "Código de substituição sugerido (drop-in replacement para as linhas line_start até line_end)"
    },
    "category": {
      "type": "string",
      "enum": ["SECURITY", "PERFORMANCE", "QUALITY", "MAINTAINABILITY"],
      "description": "Categoria do problema detectado"
    }
  }
}
```

**Payload de Exemplo — Alerta CRITICAL (SQL Injection):**

```json
{
  "id": "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0c",
  "file": "users.py",
  "line_start": 12,
  "line_end": 12,
  "severity": "CRITICAL",
  "title": "SQL Injection via concatenação direta de input",
  "description": "A query SQL é construída por concatenação direta de input não sanitizado, permitindo que um atacante injete comandos SQL arbitrários. Referência: OWASP Top 10 — A03:2021 Injection.",
  "suggestion": "cursor.execute('SELECT * FROM users WHERE id = ?', (user_input,))",
  "category": "SECURITY"
}
```

**Payload de Resposta Completa da API /api/analyze:**

```json
{
  "analysis_id": "uuid-v4",
  "status": "completed",
  "code_health_score": 25,
  "alerts": [
    {
      "id": "a3f8c2e1-...",
      "file": "users.py",
      "line_start": 12,
      "line_end": 12,
      "severity": "CRITICAL",
      "title": "SQL Injection via concatenação direta de input",
      "description": "...",
      "suggestion": "...",
      "category": "SECURITY"
    }
  ],
  "metadata": {
    "model": "gemini-3.6-flash",
    "tokens_used": 1840,
    "analysis_duration_ms": 2340
  }
}
```

**Critérios de Aceite:**

| # | Critério | Método de Verificação |
|---|---|---|
| CA-RF02-01 | Toda resposta da LLM é validada contra o JSON Schema via Pydantic v2 antes de ser retransmitida | Teste unitário do validator — TestAlertSchemaValidation |
| CA-RF02-02 | Resposta malformada é rejeitada, logada no backend e exibe mensagem de erro amigável na UI sem quebrar sessão | CT04 (variação de parsing) |
| CA-RF02-03 | SQL Injection direto é detectado com severity CRITICAL e category SECURITY | CT01 |
| CA-RF02-04 | Segredo hardcoded é detectado com severity CRITICAL e category SECURITY | CT02 |
| CA-RF02-05 | Código limpo retorna lista de alertas vazia e code_health_score 100 | CT03 |

---

### RF03 — Navegação Bidirecional Editor e Painel

| Atributo | Valor |
|---|---|
| **ID** | RF03 |
| **Nome** | Navegação Bidirecional Editor e Painel |
| **Prioridade** | P0 — Bloqueador de MVP |
| **Ator** | Desenvolvedor Solicitante / Tech Lead |

**Descrição:**
O sistema SHALL oferecer navegação bidirecional sincronizada entre o Monaco Editor e o painel lateral de alertas:

**Direção Painel → Editor:**
1. Ao clicar em um card de alerta no painel lateral, o editor MUST realizar smooth scroll até a linha `line_start` do alerta.
2. A linha afetada MUST receber highlight visual temporário de 2 a 3 segundos.
3. O card clicado MUST receber estado visual `active` (borda/background destacado).

**Direção Editor → Painel:**
1. Ao clicar em um gutter icon no editor, o painel lateral MUST realizar scroll e destacar o card correspondente ao alerta daquela linha.

**Critérios de Aceite:**

| # | Critério | Método de Verificação |
|---|---|---|
| CA-RF03-01 | Ciclo bidirecional editor e painel opera em < 300ms de latência perceptível | Teste manual com DevTools Performance |
| CA-RF03-02 | Clicar em card rola o editor suavemente até a linha correta | Teste E2E automatizado |
| CA-RF03-03 | Highlight de linha dura entre 2 e 3 segundos e é removido automaticamente | Teste unitário do hook useEditorHighlight |
| CA-RF03-04 | Clicar em gutter icon rola o painel até o card correspondente | Teste E2E automatizado |
| CA-RF03-05 | Apenas um card/linha é destacado como active por vez | Teste unitário do estado de seleção |

---

### RF04 — Aplicação Atômica de Correções

| Atributo | Valor |
|---|---|
| **ID** | RF04 |
| **Nome** | Aplicação Atômica de Correções |
| **Prioridade** | P0 — Bloqueador de MVP |
| **Ator** | Desenvolvedor Solicitante |

**Descrição:**
O sistema SHALL permitir a aplicação de correções sugeridas pela IA com um único clique no botão "Aplicar Correção" de cada card de alerta. A ação MUST ser atômica e reversível:

1. O trecho entre `line_start` e `line_end` é substituído pelo campo `suggestion` do alerta via API do Monaco Editor (`editor.executeEdits`).
2. O card muda para estado visual `RESOLVED` (ícone de check + opacidade reduzida).
3. O gutter icon da linha é removido ou substituído por ícone de "resolvido".
4. O Code Health Score é recalculado e atualizado imediatamente na UI (puramente client-side).
5. A ação é reversível via `Ctrl+Z` / `Cmd+Z` (undo stack nativo do Monaco Editor).

**Critérios de Aceite:**

| # | Critério | Método de Verificação |
|---|---|---|
| CA-RF04-01 | Substituição do trecho ocorre sem recarregamento de página | CT07, teste E2E |
| CA-RF04-02 | Estado dos demais alertas não é afetado pela aplicação de uma correção | Teste de integração frontend |
| CA-RF04-03 | Card muda para estado RESOLVED imediatamente após a aplicação | CT07, inspeção visual |
| CA-RF04-04 | Ctrl+Z e Cmd+Z reverte a correção e o card volta ao estado anterior | CT07 |
| CA-RF04-05 | Code Health Score é atualizado em < 100ms após aplicação (puramente client-side) | Teste de performance frontend |

---

### RF05 — Filtros de Severidade

| Atributo | Valor |
|---|---|
| **ID** | RF05 |
| **Nome** | Filtros de Severidade |
| **Prioridade** | P1 — Importante para MVP |
| **Ator** | Tech Lead / Revisor Sênior |

**Descrição:**
O painel lateral SHALL oferecer filtros de severidade client-side (sem round-trip à API) que atuem em tempo real:

- Chips/toggles para cada nível: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
- Estado padrão: todos os níveis visíveis.
- Ao desativar um nível, os cards correspondentes são ocultados do painel E os gutter icons daquelas linhas são ocultados no editor.
- Cada chip MUST exibir o contador de alertas ativos naquele nível (ex: `HIGH (7)`).

**Critérios de Aceite:**

| # | Critério | Método de Verificação |
|---|---|---|
| CA-RF05-01 | Filtros atuam em < 100ms (puramente client-side, sem chamada à API) | CT06, medição com performance.now() |
| CA-RF05-02 | Desativar LOW e MEDIUM oculta apenas os cards e gutter icons desses níveis | CT06 |
| CA-RF05-03 | Contador por nível é atualizado corretamente ao aplicar/desfazer correções | Teste de integração frontend |
| CA-RF05-04 | Reativar um filtro restaura a visibilidade dos cards e gutter icons correspondentes | Teste E2E automatizado |

---

### RF06 — Code Health Score

| Atributo | Valor |
|---|---|
| **ID** | RF06 |
| **Nome** | Code Health Score |
| **Prioridade** | P1 — Importante para MVP |
| **Ator** | Sistema (Frontend) |

**Descrição:**
O sistema SHALL calcular e exibir um índice de saúde do código baseado na seguinte fórmula ponderada:

```
Score = max(0, 100 - (CRITICAL × 25 + HIGH × 10 + MEDIUM × 3 + LOW × 1))
```

O score MUST ser exibido em destaque no topo da interface com as seguintes faixas visuais:

| Faixa | Intervalo | Cor |
|---|---|---|
| EXCELENTE | 91–100 | Verde |
| BOM | 71–90 | Amarelo |
| ATENÇÃO | 41–70 | Laranja |
| CRÍTICO | 0–40 | Vermelho |

O score MUST ser recalculado dinamicamente conforme correções são aplicadas ou desfeitas (puramente client-side).

**Critérios de Aceite:**

| # | Critério | Método de Verificação |
|---|---|---|
| CA-RF06-01 | Fórmula aplicada corretamente para combinações variadas de alertas | Teste unitário TestHealthScoreCalculator |
| CA-RF06-02 | Score mínimo é 0 (nunca negativo) | Teste unitário com entradas extremas |
| CA-RF06-03 | Score = 100 quando não há alertas | CT03 |
| CA-RF06-04 | Score é atualizado em < 100ms após aplicação/desfazer correção | Teste de performance frontend |
| CA-RF06-05 | Faixa visual (cor + label) é atualizada corretamente ao mudar de intervalo | Teste visual/snapshot |

---

### RF07 — Visualizador de Diffs

| Atributo | Valor |
|---|---|
| **ID** | RF07 |
| **Nome** | Visualizador de Diffs |
| **Prioridade** | P1 — Importante para MVP |
| **Ator** | Desenvolvedor Solicitante / Tech Lead |

**Descrição:**
O sistema SHALL exibir diffs em dois modos, alternáveis pelo usuário sem reload:

- **Side-by-side:** Versão anterior (esquerda) e versão posterior (direita) exibidas simultaneamente.
- **Unified diff:** Versão unificada com marcações `+` (adicionado) e `-` (removido).

O visualizador MUST suportar navegação por hunks (blocos contíguos de mudança) via atalhos de teclado ou controles na UI.

**Critérios de Aceite:**

| # | Critério | Método de Verificação |
|---|---|---|
| CA-RF07-01 | Ambos os modos (side-by-side e unified) são renderizados corretamente | Teste visual/snapshot |
| CA-RF07-02 | Alternância de modo não perde o estado dos alertas | Teste de integração frontend |
| CA-RF07-03 | Navegação por hunks funciona corretamente em diffs com múltiplos blocos | Teste E2E manual |

---

### RF08 — Destaque Visual (Highlighting)

| Atributo | Valor |
|---|---|
| **ID** | RF08 |
| **Nome** | Destaque Visual Inline |
| **Prioridade** | P0 — Bloqueador de MVP |
| **Ator** | Sistema (Frontend) |

**Descrição:**
O sistema SHALL marcar visualmente no Monaco Editor as linhas afetadas por cada alerta, usando:

- **Gutter icon** por nível de severidade (ícone colorido na margem esquerda do editor).
- **Highlight de fundo** na linha ou trecho `line_start–line_end`, com cor correspondente à severidade.

Mapeamento de cores:

| Severidade | Cor do Gutter Icon | Cor do Highlight |
|---|---|---|
| CRITICAL | Vermelho #EF4444 | rgba(239,68,68,0.15) |
| HIGH | Laranja #F97316 | rgba(249,115,22,0.15) |
| MEDIUM | Amarelo #EAB308 | rgba(234,179,8,0.12) |
| LOW | Azul #3B82F6 | rgba(59,130,246,0.10) |

**Critérios de Aceite:**

| # | Critério | Método de Verificação |
|---|---|---|
| CA-RF08-01 | Gutter icons são exibidos nas linhas corretas para todos os alertas | Teste E2E + inspeção visual |
| CA-RF08-02 | Cores correspondem ao mapeamento de severidade definido | Teste de snapshot visual |
| CA-RF08-03 | Ao resolver um alerta (RF04), gutter icon e highlight são removidos | CT07 |
| CA-RF08-04 | Ao aplicar filtro de severidade (RF05), gutter icons do nível ocultado desaparecem | CT06 |

---

### RF09 — Ingestão via URL de PR

| Atributo | Valor |
|---|---|
| **ID** | RF09 |
| **Nome** | Ingestão via URL de PR/MR |
| **Prioridade** | P1 — Importante para MVP |
| **Ator** | Desenvolvedor Solicitante / Tech Lead |

**Descrição:**
O sistema SHALL aceitar a URL de um Pull Request (GitHub) ou Merge Request (GitLab) público e buscar automaticamente o diff via API REST da plataforma correspondente.

**Endpoint Backend — Ingestão de Diff:**

```
POST /api/diff/ingest
Content-Type: application/json

{
  "url": "https://github.com/owner/repo/pull/123"
}
```

**Resposta de sucesso (200):**

```json
{
  "diff_content": "diff --git a/users.py ...",
  "files_changed": ["users.py", "auth.py"],
  "additions": 42,
  "deletions": 18,
  "platform": "github",
  "pr_number": 123
}
```

**Resposta de erro (422 — URL inválida):**

```json
{
  "error": "INVALID_PR_URL",
  "message": "A URL fornecida não corresponde a um Pull Request GitHub ou Merge Request GitLab válido.",
  "detail": "Formato esperado: https://github.com/{owner}/{repo}/pull/{number}"
}
```

**Critérios de Aceite:**

| # | Critério | Método de Verificação |
|---|---|---|
| CA-RF09-01 | URL válida de PR GitHub resulta em diff carregado no editor | Teste de integração backend |
| CA-RF09-02 | URL válida de MR GitLab resulta em diff carregado no editor | Teste de integração backend |
| CA-RF09-03 | URL inválida exibe validação client-side antes do envio ao backend | CT05 |
| CA-RF09-04 | PR privado sem token retorna erro descritivo (não 500) | Teste de integração backend |
| CA-RF09-05 | Diffs > 500 linhas são truncados com aviso explícito ao usuário | Teste de integração backend |

---

### RF10 — Retry em Falha de API

| Atributo | Valor |
|---|---|
| **ID** | RF10 |
| **Nome** | Retry em Falha de API |
| **Prioridade** | P1 — Importante para MVP |
| **Ator** | Sistema (Frontend + Backend) |

**Descrição:**
O sistema SHALL tratar falhas de comunicação com a API da LLM de forma resiliente, sem perda de estado da sessão:

- Timeout (> 30s): Exibir toast de erro com botão "Tentar Novamente".
- Falha de parsing do JSON da LLM: Logar no backend, exibir alerta na UI sem perder estado do editor.
- Perda de conectividade de rede: Detectar via `navigator.onLine` e exibir banner informativo.

**Critérios de Aceite:**

| # | Critério | Método de Verificação |
|---|---|---|
| CA-RF10-01 | Timeout da API exibe toast de erro com botão "Tentar Novamente" funcional | CT04 |
| CA-RF10-02 | Falha de parsing loga no backend e exibe alerta na UI sem quebrar a sessão | CT04 (variação) |
| CA-RF10-03 | Clicar em "Tentar Novamente" reenvia a requisição sem precisar reinserir o código | Teste E2E manual |
| CA-RF10-04 | Banner de offline é exibido quando navigator.onLine retorna false | Teste unitário frontend |

---

## 4. Requisitos Não Funcionais

---

### RNF01 — Confiabilidade de Schemas

| Atributo | Valor |
|---|---|
| **ID** | RNF01 |
| **Requisito** | Toda comunicação com a LLM deve impor o JSON Schema via Structured Outputs e ser validada independentemente no backend |
| **Prioridade** | P0 |

**Critério de Aceite Mensurável:**
- `response_schema` MUST ser ativado em 100% das chamadas à Gemini API (verificável nos logs de chamada da API).
- Pydantic v2 MUST validar 100% das respostas recebidas da LLM.
- Taxa de erros de schema em produção: < 0,1% das requisições (baseline: ambiente de staging com 1.000 análises simuladas).
- Falhas de parsing NUNCA devem resultar em estado de erro irrecuperável da UI (verificável via teste de caos de parsing).

---

### RNF02 — Latência e Streaming

| Atributo | Valor |
|---|---|
| **ID** | RNF02 |
| **Requisito** | O backend deve iniciar streaming SSE assim que o primeiro token estruturado estiver disponível; a UI deve renderizar os primeiros alertas em até 1,5s |
| **Prioridade** | P0 |

**Critério de Aceite Mensurável:**
- Time-to-first-alert (TTFA): ≤ 1.500ms medido do clique em "Analisar" até o primeiro card aparecer no painel (p95 em rede de 50 Mbps).
- Indicador de progresso (skeleton loader / spinner) MUST ser exibido em ≤ 200ms após o clique.
- Backend MUST iniciar o streaming SSE em ≤ 500ms após receber a requisição de análise.

---

### RNF03 — Segurança e Privacidade

| Atributo | Valor |
|---|---|
| **ID** | RNF03 |
| **Requisito** | Nenhum código submetido, diff ou credencial deve ser persistido sem autorização explícita; chaves de API jamais expostas ao client-side |
| **Prioridade** | P0 |

**Critério de Aceite Mensurável:**
- Auditoria do bundle Next.js (`npm run build`) MUST confirmar ausência de strings `GEMINI_API_KEY`, `GITHUB_TOKEN`, `GITLAB_TOKEN` (verificável com grep no bundle gerado).
- Revisão de código MUST confirmar que nenhum handler do backend persiste o conteúdo do diff em banco de dados ou log.
- Diffs > 500 linhas MUST ser truncados antes do envio à LLM (verificável via teste de integração com mock da LLM).
- Toda comunicação frontend para backend MUST ocorrer sobre HTTPS/TLS 1.2+ em ambiente de staging e produção.

---

### RNF04 — Responsividade da UI

| Atributo | Valor |
|---|---|
| **ID** | RNF04 |
| **Requisito** | O Monaco Editor deve manter renderização estável (mínimo 30 FPS) com arquivos de até 2.000 linhas; operações de highlight e scroll devem ser não-bloqueantes |
| **Prioridade** | P1 |

**Critério de Aceite Mensurável:**
- Taxa de renderização do editor mínimo 30 FPS ao manipular arquivo de 2.000 linhas em hardware de especificação média (4 núcleos, 8 GB RAM) — verificável via Chrome DevTools Performance.
- Painel com até 50 cards de alerta MUST ser renderizado sem jank (frame drops > 50ms) — verificável com PerformanceObserver.
- Operações de highlight e scroll MUST usar requestAnimationFrame ou Web Workers para evitar bloqueio do thread principal.
- CT08 MUST ser executável sem freeze perceptível no editor.

---

### RNF05 — Tratamento de Erros e Resiliência

| Atributo | Valor |
|---|---|
| **ID** | RNF05 |
| **Requisito** | O sistema deve exibir feedback contextual para todos os cenários de falha previstos, sem perda de estado da sessão do usuário |
| **Prioridade** | P1 |

| Cenário de Falha | Comportamento Esperado | Critério Mensurável |
|---|---|---|
| Timeout na API LLM (> 30s) | Toast de erro + botão "Tentar Novamente" | CT04 passando |
| Falha de parsing JSON da LLM | Log no backend + alerta na UI sem perder estado | 100% dos erros de parsing não quebram a sessão |
| URL de PR inválida ou privada | Validação client-side antes do envio + mensagem descritiva | CT05 passando |
| Perda de conectividade (navigator.onLine = false) | Banner informativo exibido | Teste unitário frontend |
| Resposta vazia (sem alertas) | Estado "Nenhum problema encontrado" + Score = 100 | CT03 passando |

---

## 5. Contratos de API (Endpoints Backend)

### 5.1 Endpoint de Análise de Código

```
POST /api/analyze
Content-Type: application/json
```

**Request Body:**

```json
{
  "code": "string (conteúdo do código ou diff)",
  "language": "python | javascript | typescript | java | go | php | ruby | auto",
  "filename": "string (opcional, usado para contexto da LLM)"
}
```

**Response — Streaming SSE:**

Cada evento SSE carrega um objeto JSON parcial ou completo:

```
event: alert
data: {"id": "uuid", "severity": "CRITICAL", "title": "..."}

event: score
data: {"code_health_score": 25, "alert_count": {"CRITICAL": 1, "HIGH": 2, "MEDIUM": 5, "LOW": 3}}

event: done
data: {"status": "completed", "analysis_id": "uuid", "duration_ms": 2340}
```

**Códigos de Status:**

| Código | Situação |
|---|---|
| 200 + SSE stream | Análise iniciada com sucesso |
| 422 | Payload inválido (code vazio, language inválida) |
| 429 | Rate limit atingido |
| 500 | Erro interno (falha de LLM ou parsing não recuperável) |
| 503 | Gemini API indisponível |

---

### 5.2 Endpoint de Ingestão de Diff

```
POST /api/diff/ingest
Content-Type: application/json
```

Ver contrato completo em RF09.

---

### 5.3 Endpoint de Health Check

```
GET /api/health
```

**Response (200):**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "gemini_api": "reachable",
  "timestamp": "2026-09-19T16:00:00Z"
}
```

---

## 6. Fluxo Ponta a Ponta (Happy Path)

O fluxo a seguir MUST operar completamente **sem recarregamento de página**:

```
[1] Usuário cola código com falha (ex: SQL Injection hardcoded)
      |
      v
[2] Clica em "Analisar Código" → Skeleton loader exibido em até 200ms
      |
      v
[3] Backend inicia streaming SSE → primeiros alertas aparecem em até 1,5s (RNF02)
      |
      v
[4] Editor destaca linha afetada com gutter icon CRITICAL (vermelho) + highlight (RF08)
      |
      v
[5] Painel lateral exibe card com título, justificativa e código sugerido (RF04)
      |
      v
[6] Code Health Score calculado e exibido na faixa CRÍTICO (RF06)
      |
      v
[7] Usuário clica em "Aplicar Correção" no card CRITICAL (RF04)
      |
      v
[8] Editor substitui o trecho instantaneamente (Monaco executeEdits)
      |
      v
[9] Card muda para RESOLVED; gutter icon removido; Code Health Score recalculado (RF04, RF06)
      |
      v
[10] Usuário pressiona Ctrl+Z → Editor reverte; card retorna ao estado anterior (RF04 CA-04)
```

---

## 7. Casos de Teste Obrigatórios

| # | ID | Cenário | Entrada | Resultado Esperado | RFs Cobertos |
|---|---|---|---|---|---|
| 1 | CT01 | SQL Injection direto | `query = "SELECT * FROM users WHERE id = " + user_input` | severity: CRITICAL, category: SECURITY | RF02 |
| 2 | CT02 | Segredo hardcoded | `API_KEY = "sk-1234567890abcdef"` | severity: CRITICAL, category: SECURITY | RF02 |
| 3 | CT03 | Código limpo | Função Python simples e segura | Painel vazio, Score = 100, mensagem positiva | RF02, RF06 |
| 4 | CT04 | Falha de API (timeout simulado) | Simular timeout no backend | Toast de erro; botão "Tentar Novamente" funcional | RF10, RNF05 |
| 5 | CT05 | URL de PR inválida | `https://github.com/user/repo/pull/abc` | Validação client-side antes do envio | RF01, RF09 |
| 6 | CT06 | Filtro de severidade | Desativar LOW e MEDIUM | Apenas cards CRITICAL e HIGH visíveis; gutter icons correspondentes ocultos | RF05, RF08 |
| 7 | CT07 | Aplicar correção + Undo | Aplicar correção → pressionar Ctrl+Z | Editor reverte para código original; card volta ao estado anterior | RF04 |
| 8 | CT08 | Arquivo grande (2.000+ linhas) | Colar arquivo com 2.000 linhas | Editor responsivo (sem freeze); scroll suave funcional | RNF04 |

---

## 8. Critérios de Prontidão para Lançamento (Definition of Done)

- [ ] Todos os RF P0 (RF01, RF02, RF03, RF04, RF08) implementados e cobertos por testes de integração.
- [ ] Todos os 8 casos de teste obrigatórios (CT01–CT08) passando em ambiente de staging.
- [ ] Auditoria de segurança confirmando: nenhuma API Key exposta no bundle client-side (RNF03).
- [ ] Métricas de performance validadas: editor estável com arquivo de 2.000 linhas (RNF04 / CT08).
- [ ] TTFA menor ou igual a 1.500ms validado em ambiente de staging com p95 (RNF02).
- [ ] Pydantic v2 validando 100% das respostas da LLM (RNF01).
- [ ] Documentação de API do backend (FastAPI /docs + /redoc) acessível e atualizada.
- [ ] README com instrução de setup local em menos de 5 comandos.
- [ ] Cobertura de testes maior ou igual a 80% nos pacotes core/ do backend.

---

## 9. Histórico de Revisões

| Versão | Data | Autor | Descrição |
|---|---|---|---|
| 1.0.0 | 2026-09-19 | Braulley (PM) | Criação inicial da especificação técnica do MVP |
