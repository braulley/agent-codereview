# Product Requirements Document (PRD)

> **Produto:** Agent Code Review — Revisão Inteligente e Interativa de Código com IA
> **Versão:** 1.0.0-MVP
> **Data:** 2026-09-19
> **Autores:** Product Management (Braulley)
> **Status:** Em Revisão

---

## 1. Visão Geral e Alinhamento Estratégico

### 1.1 Resumo Executivo

O **Agent Code Review** é uma aplicação web com interface gráfica que permite a análise interativa de código-fonte e diffs diretamente no navegador, com suporte à visualização lado a lado (side-by-side) de Pull Requests. Utilizando modelos de linguagem de grande escala (LLMs) — especificamente a API Gemini — o produto detecta, categoriza e sugere correções para problemas de segurança (OWASP Top 10), performance e padrões de qualidade, devolvendo resultados em JSON estruturado com garantia de schema.

O diferencial central é a **aplicação atômica de correções com um clique**: o desenvolvedor ou revisor pode aceitar uma sugestão gerada pela IA e o trecho problemático é substituído instantaneamente no editor, eliminando o ciclo manual de copiar/colar.

O produto endereça diretamente o problema de gargalo no processo de Code Review documentado em [`docs/problem.md`](./problem.md): ciclos de revisão lentos (4–48h de latência), vazamento de vulnerabilidades críticas para produção e sobrecarga cognitiva de Tech Leads e Revisores Seniores.

---

### 1.2 Objetivos de Negócio e Metas

| # | Objetivo | Métrica-Chave | Meta MVP (6 meses) |
|---|----------|---------------|---------------------|
| OB01 | Reduzir o cycle time de Code Review | Tempo médio de 1º feedback em PRs | De 4–24h para **< 5 minutos** |
| OB02 | Diminuir o ciclo médio de revisão de Pull Requests | Tempo total de revisão por PR | Redução de **≥ 40%** vs. baseline |
| OB03 | Conter vulnerabilidades OWASP triviais antes do merge | Taxa de detecção antes da branch principal | **< 1%** chegam ao `main` |
| OB04 | Aumentar adoção de correções sugeridas pela IA | Taxa de aceitação direta (1-clique) | **> 60%** das sugestões aceitas |
| OB05 | Liberar foco de revisores seniores | Volume de PRs revisados por humano | Redução de **30%** em tarefas triviais |

---

### 1.3 Personas e Casos de Uso Primários

#### Persona 1 — Desenvolvedor(a) Solicitante (Autor de PR)

| Atributo | Descrição |
|----------|-----------|
| **Perfil** | Engenheiro(a) de software pleno ou sênior, 2–8 anos de experiência |
| **Objetivo** | Entregar PRs de alta qualidade com menos retrabalho e feedback mais rápido |
| **Principal Dor** | Espera horas por revisão; não sabe se há problemas de segurança até o review humano |
| **Caso de Uso Primário** | Cola ou carrega um diff/PR no playground visual **antes do commit**, executa a análise, visualiza os alertas destacados no editor, aceita as correções relevantes com um clique e só então abre o PR — chegando ao revisor com um código já pré-auditado |

#### Persona 2 — Tech Lead / Revisor Sênior

| Atributo | Descrição |
|----------|-----------|
| **Perfil** | Engenheiro(a) sênior ou Staff, responsável pela qualidade técnica e arquitetura |
| **Objetivo** | Focar revisões em decisões arquiteturais e de domínio, não em falhas mecânicas |
| **Principal Dor** | Sobrecarregado com volume de PRs triviais; perde tempo caçando SQL Injection e credenciais expostas manualmente |
| **Caso de Uso Primário** | Acessa a interface com a URL do PR aberto, visualiza os alertas **pré-categorizados por severidade** (CRITICAL → HIGH → MEDIUM → LOW) e filtra para focar apenas nas questões que exigem julgamento humano |

---

## 2. Escopo do Produto

### 2.1 Funcionalidades no Escopo (In-Scope — MVP)

| # | Funcionalidade | Descrição Resumida |
|---|----------------|--------------------|
| F01 | **Editor Visual de Código** | Editor Monaco (VS Code engine) com syntax highlighting para as principais linguagens (Python, JS/TS, Java, Go, PHP) |
| F02 | **Visualizador de Diffs** | Modo side-by-side (antes/depois) e unified diff, com navegação por hunks |
| F03 | **Destaque Visual (Highlighting)** | Marcação inline nas linhas exatas afetadas por cada alerta, com gutter icon por severidade |
| F04 | **Painel Lateral de Alertas** | Cards de apontamentos organizados por taxonomia: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, com título, justificativa e trecho sugerido |
| F05 | **Aplicar Correção (1 clique)** | Substituição atômica inline do trecho problemático, com atualização imediata do estado visual do alerta |
| F06 | **Integração LLM via API** | Chamadas à API Gemini (`gemini-3.6-flash`) com system instructions determinísticas e Structured Outputs (JSON Schema estrito) |
| F07 | **Code Health Score** | Índice de saúde calculado com base em volume e severidade dos alertas, exibido em dashboard resumido no topo |
| F08 | **Filtros de Severidade** | Toggle por nível de severidade para ocultar/exibir alertas (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) |
| F09 | **Carregamento via URL de PR** | Entrada de URL de Pull Request do GitHub ou GitLab para ingestão automática do diff |
| F10 | **Retry em Falha de API** | Mensagem de erro informativa com botão de reenvio manual em caso de falha de rede ou timeout |

---

### 2.2 Fora de Escopo (Out-of-Scope — MVP)

| # | Item | Justificativa |
|---|------|---------------|
| OS01 | Execução dinâmica de código em sandbox | Análise estritamente estática; execução dinâmica eleva drasticamente custo de infraestrutura e superfície de ataque |
| OS02 | Auto-commit direto para branches protegidas sem aprovação | Mudanças em branches remotas exigem pipeline de autorização próprio; fora do ciclo de valor do MVP |
| OS03 | Substituição de linters de formatação pura (Prettier, Black, ESLint estilístico) | O produto foca em semântica e segurança, não em estilo — deve ser complementar, não concorrente |
| OS04 | Revisão de IaC (Terraform, Bicep, CloudFormation) | Domínio especializado com taxonomia própria; escopo de iteração futura |
| OS05 | Suporte multi-tenant com controle de acesso por organização | Identidade e RBAC são funcionalidades pós-MVP |

---

## 3. Requisitos Funcionais (RF)

### RF01 — Entrada de Código

> **Prioridade:** P0 (Bloqueador de MVP)

O sistema deve aceitar as seguintes modalidades de entrada:

- **Inserção manual:** Cole diretamente código ou um diff no editor visual (plain text ou formato unified diff).
- **Upload de arquivo:** Carregue um arquivo de código-fonte local (`.py`, `.js`, `.ts`, `.java`, `.go`, `.php`, `.rb`, entre outros).
- **URL de PR:** Forneça a URL de um Pull Request público (GitHub ou GitLab) e o sistema fará a ingestão do diff automaticamente via API REST.

**Critério de aceite:** As três modalidades devem estar disponíveis e funcionais no fluxo do MVP sem recarregamento de página.

---

### RF02 — Diagnóstico Estruturado

> **Prioridade:** P0 (Bloqueador de MVP)

O motor de análise (LLM + parser) deve produzir, para cada apontamento identificado, um objeto JSON com os seguintes campos obrigatórios:

```json
{
  "id": "string (UUID v4)",
  "file": "string (nome do arquivo afetado)",
  "line_start": "integer (linha inicial do problema)",
  "line_end": "integer (linha final do problema)",
  "severity": "CRITICAL | HIGH | MEDIUM | LOW",
  "title": "string (título curto do problema)",
  "description": "string (justificativa técnica completa)",
  "suggestion": "string (código de substituição sugerido)",
  "category": "SECURITY | PERFORMANCE | QUALITY | MAINTAINABILITY"
}
```

**Critério de aceite:** O parser do backend deve rejeitar e logar qualquer resposta da LLM que não seja conforme ao JSON Schema acima, exibindo uma mensagem de erro amigável na interface sem quebrar a sessão.

---

### RF03 — Navegação Bidirecional

> **Prioridade:** P0 (Bloqueador de MVP)

Ao clicar em um card de alerta no painel lateral:

1. O editor deve rolar suavemente (smooth scroll) até a linha afetada.
2. A linha deve ser focada e destacada visualmente (highlight temporário de 2–3 segundos).
3. O card no painel deve receber estado `active` com indicação visual de seleção.

A ação inversa também deve funcionar: ao clicar em um gutter icon no editor, o painel lateral deve rolar e destacar o card correspondente.

**Critério de aceite:** Ciclo bidirecional editor ↔ painel deve operar em menos de 300ms de latência perceptível.

---

### RF04 — Aplicação Atômica de Correções

> **Prioridade:** P0 (Bloqueador de MVP)

Ao clicar em "Aplicar Correção" em um card de alerta:

1. O trecho de código entre `line_start` e `line_end` deve ser substituído pelo campo `suggestion` do apontamento.
2. O card no painel deve mudar para estado `RESOLVED` (indicador visual distinto).
3. O gutter icon correspondente no editor deve ser removido ou marcado como resolvido.
4. O **Code Health Score** deve ser recalculado e atualizado na tela imediatamente.
5. A ação deve ser reversível via `Ctrl+Z` / `Cmd+Z` (undo nativo do Monaco Editor).

**Critério de aceite:** Nenhuma das etapas acima deve provocar recarregamento de página ou perda de estado dos demais alertas.

---

### RF05 — Filtros de Severidade

> **Prioridade:** P1

O painel lateral deve oferecer filtros por severidade que atuem em tempo real (sem chamada adicional à API):

- Chips/toggles para cada nível: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
- Estado padrão: todos os níveis visíveis.
- Ao desativar um nível, os cards correspondentes e seus gutter icons no editor são ocultados.
- Contador de alertas por nível deve ser exibido em cada chip (ex: `HIGH (7)`).

**Critério de aceite:** Filtros devem atuar em menos de 100ms (puramente client-side, sem round-trip).

---

### RF06 — Exibição de Code Health Score

> **Prioridade:** P1

O sistema deve calcular e exibir um índice de saúde do código baseado na seguinte fórmula ponderada:

```
Score = 100 - (CRITICAL × 25 + HIGH × 10 + MEDIUM × 3 + LOW × 1)
Score_min = 0, Score_max = 100
```

- O score deve ser exibido em destaque no topo da interface, com indicação visual de faixa:
  - `CRÍTICO (0–40)` — vermelho
  - `ATENÇÃO (41–70)` — laranja
  - `BOM (71–90)` — amarelo
  - `EXCELENTE (91–100)` — verde
- Deve ser atualizado dinamicamente conforme correções são aplicadas.

---

## 4. Requisitos Não Funcionais (RNF)

### RNF01 — Confiabilidade de Schemas

> **Prioridade:** P0

- Toda comunicação com a API de IA deve impor o JSON Schema definido em RF02 via o mecanismo de **Structured Outputs** do provedor (Gemini `response_schema`).
- O backend deve implementar uma camada de validação independente (ex: `pydantic` no FastAPI) que capture e logue respostas malformadas.
- Falhas de parsing **não devem** quebrar a interface; o sistema deve exibir uma mensagem de erro contextual com opção de Retry.

---

### RNF02 — Latência e Streaming

> **Prioridade:** P0

- O backend deve iniciar o streaming da resposta da LLM via **Server-Sent Events (SSE)** assim que o primeiro token estruturado estiver disponível.
- A interface deve começar a renderizar os primeiros alertas no painel lateral em **≤ 1,5 segundos** após o disparo da análise.
- O indicador de progresso (skeleton loader ou spinner) deve ser exibido imediatamente ao disparar a análise, sem delay perceptível.

---

### RNF03 — Segurança e Privacidade

> **Prioridade:** P0

- **Nenhum** trecho de código submetido, diff ou credencial deve ser persistido em armazenamento de longo prazo sem autorização explícita do usuário.
- Chaves de API (Gemini, GitHub, GitLab) devem ser configuradas exclusivamente via variáveis de ambiente no servidor; **jamais** expostas ao client-side.
- O backend deve sanitizar e truncar diffs excessivamente longos antes do envio à LLM, prevenindo prompt injection e custos excessivos de tokens.
- Toda comunicação entre frontend e backend deve ocorrer sobre HTTPS (TLS 1.2+).

---

### RNF04 — Responsividade da UI

> **Prioridade:** P1

- O Monaco Editor deve manter **taxa de renderização estável (≥ 30 FPS)** ao manipular arquivos com até 2.000 linhas de código.
- Operações de highlight e scroll bidirecional devem ser executadas de forma **não-bloqueante** (Web Workers ou `requestAnimationFrame` onde aplicável).
- O painel lateral com até 50 cards de alerta deve ser renderizado sem jank perceptível em hardware de especificação média (4 núcleos, 8 GB RAM).

---

### RNF05 — Tratamento de Erros e Resiliência

> **Prioridade:** P1

| Cenário de Falha | Comportamento Esperado |
|------------------|------------------------|
| Timeout na API da LLM (> 30s) | Exibir toast de erro com botão "Tentar Novamente" |
| Falha de parsing do JSON da LLM | Logar no backend, exibir alerta na UI sem perder estado do editor |
| URL de PR inválida ou privada | Validação client-side antes do envio + mensagem descritiva de erro |
| Perda de conectividade de rede | Detectar via `navigator.onLine` e exibir banner informativo |
| Resposta vazia (sem alertas) | Exibir estado positivo "Nenhum problema encontrado" com Code Health Score = 100 |

---

## 5. Arquitetura e Dependências Técnicas

### 5.1 Diagrama de Componentes (Alto Nível)

```
+-----------------------------------------------------------------+
|                        BROWSER (Client)                         |
|                                                                 |
|  +----------------------+     +------------------------------+  |
|  |   Monaco Editor      |<--->|   Alert Panel (React)        |  |
|  |   (Code / Diff View) |     |   Cards CRITICAL/HIGH/MED/LOW|  |
|  +----------------------+     +------------------------------+  |
|              |                              |                   |
|  +-----------v------------------------------v-----------------+  |
|  |         Code Health Dashboard + Filters                   |  |
|  +-----------------------------------+-----------------------+  |
|                                      | SSE / REST               |
+--------------------------------------+---------------------------+
                                       |
+--------------------------------------v---------------------------+
|                      BACKEND (Server)                           |
|                                                                 |
|  +--------------------+   +--------------------------------+    |
|  |  API Gateway       |   |  Diff Ingestion Service        |    |
|  |  (FastAPI)         |   |  (GitHub / GitLab REST API)    |    |
|  +--------+-----------+   +--------------------------------+    |
|           |                                                      |
|  +--------v---------------------------------------------------+  |
|  |  LLM Orchestration Service                                 |  |
|  |  - System Instructions (deterministicas)                   |  |
|  |  - JSON Schema Enforcement (response_schema)               |  |
|  |  - Pydantic Validation Layer                               |  |
|  |  - SSE Streaming Proxy                                     |  |
|  +------------------------------------+-----------------------+  |
+--------------------------------------+---------------------------+
                                       | HTTPS
+--------------------------------------v---------------------------+
|                    GEMINI API (Google AI)                        |
|           Model: gemini-3.6-flash (Structured Output)           |
+-----------------------------------------------------------------+
```

---

### 5.2 Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| **Frontend Framework** | Next.js 15 (App Router) | SSR/SSE nativo, file-based routing, otimizado para streaming |
| **Linguagem Frontend** | TypeScript | Tipagem estrita para o contrato de dados da LLM |
| **Estilização** | Tailwind CSS v4 | Utilitários de design system para componentes de análise |
| **Editor de Código** | Monaco Editor (`@monaco-editor/react`) | Engine do VS Code; suporte nativo a diff e multilinguagem |
| **Visualizador de Diff** | `react-diff-viewer-continued` | Componente React para side-by-side e unified diff |
| **Backend Framework** | FastAPI (Python 3.12+) | Async-first, tipagem com Pydantic, SSE com `sse-starlette` |
| **Validação de Schema** | Pydantic v2 | Validação declarativa do JSON retornado pela LLM |
| **Provedor de IA** | Google Gemini API | `gemini-3.6-flash` com `response_schema` (Structured Outputs) |
| **Streaming** | Server-Sent Events (SSE) | Unidirecional servidor -> cliente, sem overhead de WebSocket |
| **Containerização** | Docker + Docker Compose | Ambiente reproduzível para dev e deploy |
| **CI/CD** | GitHub Actions | Pipelines de lint, test e build automáticos |

---

### 5.3 Integrações Externas

| Integração | Finalidade | Autenticação |
|------------|------------|--------------|
| **Google Gemini API** | Motor de análise de código (LLM) | API Key via variável de ambiente `GEMINI_API_KEY` |
| **GitHub REST API v3** | Ingestão de diff de Pull Requests públicos | Token pessoal opcional via `GITHUB_TOKEN` |
| **GitLab API v4** | Ingestão de diff de Merge Requests | Token pessoal opcional via `GITLAB_TOKEN` |

---

## 6. Critérios de Aceite e Validação

### 6.1 Fluxo Ponta a Ponta (Happy Path)

O fluxo a seguir deve operar completamente **sem recarregamento de página**:

```
[1] Usuário cola código com falha (ex: SQL Injection hardcoded)
      |
      v
[2] Clica em "Analisar Código"
      |
      v
[3] Backend inicia streaming SSE -> primeiros alertas aparecem em <= 1,5s
      |
      v
[4] Editor destaca a linha afetada com gutter icon CRITICAL (vermelho)
      |
      v
[5] Painel lateral exibe card com título, justificativa e código sugerido
      |
      v
[6] Usuário clica em "Aplicar Correção"
      |
      v
[7] Editor substitui o trecho instantaneamente
      |
      v
[8] Card muda para estado RESOLVED; Code Health Score é recalculado
```

**Todos os 8 passos devem ser executáveis em uma única sessão de página sem refresh.**

---

### 6.2 Casos de Teste Obrigatórios

| # | Cenário | Entrada | Resultado Esperado |
|---|---------|---------|-------------------|
| CT01 | SQL Injection direto | `query = "SELECT * FROM users WHERE id = " + user_input` | Marcado como `CRITICAL`, categoria `SECURITY` |
| CT02 | Segredo hardcoded | `API_KEY = "sk-1234567890abcdef"` | Marcado como `CRITICAL`, categoria `SECURITY` |
| CT03 | Código limpo (sem falhas) | Função Python simples e segura | Painel vazio, Code Health Score = 100, mensagem positiva |
| CT04 | Falha de API | Simular timeout no backend | Toast de erro exibido; botão "Tentar Novamente" funcional |
| CT05 | URL de PR inválida | `https://github.com/user/repo/pull/abc` | Mensagem de validação antes do envio |
| CT06 | Filtro de severidade | Desativar `LOW` e `MEDIUM` | Apenas cards `CRITICAL` e `HIGH` visíveis; editor oculta gutter icons correspondentes |
| CT07 | Aplicar correção + Undo | Aplicar correção -> pressionar `Ctrl+Z` | Editor reverte para o código original; card volta ao estado anterior |
| CT08 | Arquivo grande (2.000+ linhas) | Colar arquivo com 2.000 linhas | Editor permanece responsivo (sem freeze); scroll suave funciona |

---

### 6.3 Critérios de Prontidão para Lançamento (Definition of Done — DoD)

- [ ] Todos os RF P0 implementados e cobertos por testes de integração.
- [ ] Todos os 8 casos de teste obrigatórios (CT01–CT08) passando em ambiente de staging.
- [ ] Auditoria de segurança confirmando: nenhuma API Key exposta no bundle client-side.
- [ ] Métricas de performance validadas: editor estável com arquivo de 2.000 linhas.
- [ ] Documentação de API do backend (FastAPI `/docs`) atualizada e acessível.
- [ ] README com instrução de setup local em menos de 5 comandos.

---

## 7. Roadmap de Iterações Futuras (Pós-MVP)

| Versão | Funcionalidade | Valor Esperado |
|--------|----------------|----------------|
| v1.1 | Suporte a autenticação (GitHub OAuth) e PRs privados | Uso em projetos corporativos reais |
| v1.2 | Histórico de análises por repositório e métricas agregadas | Visibilidade gerencial de qualidade ao longo do tempo |
| v1.3 | Chat contextual com a IA sobre um alerta específico | Experiência educativa e de mentoria para desenvolvedores |
| v2.0 | Extensão para VS Code e JetBrains IDEs | Análise no momento da escrita, antes mesmo do commit |
| v2.1 | Suporte a IaC: Terraform, Bicep, CloudFormation | Expansão para times de Plataforma e DevOps |
| v3.0 | Multi-tenant com RBAC, SSO e dashboards por organização | Produto SaaS para equipes de engenharia enterprise |

---

## 8. Referências

- [`docs/problem.md`](./problem.md) — Definição do Problema e Hipótese de Solução
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Google Gemini API — Structured Output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Monaco Editor Documentation](https://microsoft.github.io/monaco-editor/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js 15 — App Router](https://nextjs.org/docs/app)
- [GitHub REST API — Pull Requests](https://docs.github.com/en/rest/pulls/pulls)
- [SPACE Framework — Developer Productivity](https://queue.acm.org/detail.cfm?id=3454124)
- [LinearB — Engineering Metrics Report](https://linearb.io/)
