# Architectural Decision Records (ADR) — Agent Code Review

> **Produto:** Agent Code Review — Revisão Inteligente e Interativa de Código com IA  
> **Versão:** 1.0.0-MVP  
> **Data:** 2026-09-21  
> **Autor:** Braulley (Arquiteto de Software)  
> **Status:** Aprovado  
> **Referências:** [`docs/architecture.md`](./architecture.md), [`docs/spec.md`](./spec.md), [`docs/prd.md`](./prd.md), [`docs/relatorio-disciplina-ia-generativa.md`](./relatorio-disciplina-ia-generativa.md)

---

## Índice de Decisões

| ID | Título | Status | Data | Impacto Principal |
|---|---|---|---|---|
| [ADR-01](#adr-01--server-sent-events-sse-em-vez-de-websocket-para-streaming-de-alertas) | Server-Sent Events (SSE) em vez de WebSocket para Streaming de Alertas | Aprovado | 2026-09-19 | Latência, Complexidade de Protocolo, Resiliência |
| [ADR-02](#adr-02--arquitetura-100-stateless-sem-sgbd-no-mvp) | Arquitetura 100% Stateless sem SGBD no MVP | Aprovado | 2026-09-19 | Privacidade de Código, Segurança, Simplicidade Operacional |
| [ADR-03](#adr-03--valida%C3%A7%C3%A3o-independente-com-pydantic-v2-defense-in-depth) | Validação Independente com Pydantic v2 (Defense-in-Depth) | Aprovado | 2026-09-19 | Integridade de Schema, Robustez contra Alucinação |
| [ADR-04](#adr-04--monaco-editor-como-editor-principal-e-aplica%C3%A7%C3%A3o-at%C3%B4mica-de-corre%C3%A7%C3%B5es) | Monaco Editor como Editor Principal e Aplicação Atômica de Correções | Aprovado | 2026-09-19 | Experiência do Desenvolvedor (DX), Undo/Redo Nativo |
| [ADR-05](#adr-05--sele%C3%A7%C3%A3o-do-modelo-gemini-flash-e-truncamento-r%C3%ADgido-em-500-linhas) | Seleção do Modelo Gemini Flash e Truncamento Rígido em 500 Linhas | Aprovado | 2026-09-19 | Custo, Latência (TTFA ≤ 1,5s), Mitigação de Injeção de Prompt |
| [ADR-06](#adr-06--padr%C3%A3o-backend-for-frontend-bff-para-isolamento-estrito-de-segredos) | Padrão Backend-for-Frontend (BFF) para Isolamento Estrito de Segredos | Aprovado | 2026-09-19 | Segurança de Credenciais (RNF03), Governança de API |

---

## ADR-01 — Server-Sent Events (SSE) em vez de WebSocket para Streaming de Alertas

### Status
Aprovado

### Contexto
O produto necessita realizar análises de código em tempo real utilizando um Large Language Model (LLM). Como a análise de segurança e performance inspeciona múltiplos blocos e gera múltiplos alertas, aguardar a finalização completa da inferência geraria um atraso perceptível inaceitável para o usuário (*Time-to-First-Alert* elevado). O sistema precisa entregar alertas progressivamente para alimentar o painel e os marcadores visuais do editor à medida que são identificados e validados.

### Opções Consideradas
1. **WebSockets (RFC 6455):** Comunicação bidirecional full-duplex sobre uma única conexão TCP persistente.
2. **HTTP Polling / Short & Long Polling:** Requisições HTTP periódicas repetidas consultando o status da análise.
3. **Server-Sent Events — SSE (W3C / WHATWG):** Streaming unidirecional servidor-para-cliente sobre HTTP padrão (`text/event-stream`).

### Proposta Inicial da IA vs. Revisão Crítica Humana
* **Proposta Inicial da IA:** A IA propôs a adoção de **WebSockets**, justificando modernidade de stack, suporte a eventos bidirecionais futuros e menor latência teórica de transporte.
* **Revisão Crítica do Arquiteto (Decisão Contrária):**
  * *Unidirecionalidade Real:* O fluxo de dados durante a execução da análise é estritamente unidirecional (o servidor envia eventos de alerta, atualização de score e finalização para o browser). O cliente não envia comandos intercalados enquanto a análise ocorre.
  * *Sobrecarga de Protocolo e Infraestrutura:* WebSockets exigem protocolo de *upgrade* de conexão, manutenção de estado de conexão no servidor, controle manual de *heartbeats/ping-pong* e configurações adicionais para atravessar firewalls corporativos, proxies reversos e API Gateways.
  * *Compatibilidade com POST:* O `EventSource` nativo do navegador suporta apenas requisições `GET`, o que impediria o envio do código-fonte (que pode ter vários kilobytes) na URL sem violar limites de URI. A solução adotada foi consumir o endpoint SSE via `fetch` utilizando a API `ReadableStream` no cliente (`frontend/hooks/useSSE.ts`).

### Decisão
Adotar **Server-Sent Events (SSE)** via biblioteca `sse-starlette` no FastAPI, consumido no frontend Next.js através de `fetch` + `ReadableStream` no endpoint `POST /api/analyze`. Os eventos transmitidos seguem o padrão:
- `event: alert` com payload JSON contendo o alerta validado;
- `event: score` com payload JSON contendo a pontuação consolidada;
- `event: done` sinalizando o término normal da análise.

### Consequências
* **Positivas:**
  * Implementação simples, limpa e padronizada sobre HTTP/HTTPS regular.
  * Facilidade de roteamento e balanceamento por proxies reversos sem suporte especial a WebSocket upgrade.
  * Cumprimento do requisito RNF02 com *Time-to-First-Alert* (TTFA) ≤ 1.500ms no p95.
* **Negativas / Trade-offs:**
  * Impossibilidade do `EventSource` padrão do navegador lidar diretamente com payloads `POST` com body JSON, exigindo parser customizado de *chunks* SSE sobre `ReadableStream` no hook `useSSE`.
  * Ausência de canal reverso na mesma conexão (ações como "Aplicar Correção" ou novos filtros são processadas em requisições REST independentes ou localmente no cliente).

### Rastreabilidade
- **Requisitos:** RF02 (Streaming de Alertas), RNF02 (Latência e TTFA).
- **Testes:** CT04 (Timeout e Streaming), testes de integração em `backend/tests/integration/test_analyze_sse.py`.

---

## ADR-02 — Arquitetura 100% Stateless sem SGBD no MVP

### Status
Aprovado

### Contexto
O MVP do Agent Code Review deve fornecer feedback imediato para desenvolvedores em fluxos de pré-commit e pré-merge. Código-fonte submetido para análise frequentemente contém propriedade intelectual restrita, lógicas de negócio confidenciais e potenciais segredos ainda não auditados. A introdução de persistência em banco de dados impõe obrigações legais (LGPD/GDPR), riscos de vazamento de dados e custos operacionais adicionais de infraestrutura.

### Opções Consideradas
1. **SGBD Relacional (PostgreSQL via SQLAlchemy):** Persistir usuários, sessões de análise, código submetido e alertas gerados.
2. **SGBD Embarcado (SQLite):** Persistência local no contêiner backend com menor sobrecarga operacional.
3. **Arquitetura 100% Stateless (Sem Banco de Dados):** O backend atua puramente como orquestrador efêmero em memória; o estado de sessão reside exclusivamente no cliente (React state/hooks).

### Proposta Inicial da IA vs. Revisão Crítica Humana
* **Proposta Inicial da IA:** A IA sugeriu estruturar um esquema relacional com tabelas `users`, `analyses`, `alerts` e `repositories`, com migrações via Alembic.
* **Revisão Crítica do Arquiteto (Decisão Contrária):**
  * *Privacidade e Segurança em Primeiro Lugar (RNF03):* O requisito RNF03 estabelece que o código submetido não deve ser persistido em disco ou banco sem autorização explícita. Não reter dados elimina o risco de vazamento de código de clientes em caso de comprometimento do servidor.
  * *Simplicidade de Operação e Deploy:* Sem banco de dados, o deploy do MVP requer apenas dois contêineres Docker independentes (`frontend` e `backend`). Não há necessidade de volumes persistentes, rotinas de backup ou migrações de schema.
  * *Alinhamento com o Caso de Uso:* A proposta do produto é atuar como ferramenta de apoio interativa imediata no browser ("colar → analisar → corrigir → copiar/desfazer").

### Decisão
Manter o **backend 100% stateless**. Nenhum SGBD relacional, NoSQL ou chave-valor (como Redis) é incluído no MVP. O estado de navegação, lista de alertas, filtros por severidade e histórico de correções aplicadas residem exclusivamente na memória do navegador do usuário (`frontend/hooks/useAlerts.ts`). Os logs do backend em stdout JSON registram apenas metadados técnicos (`tokens_used`, `analysis_duration_ms`, severidade), nunca o código-fonte ou trechos do diff.

### Consequências
* **Positivas:**
  * Risco de vazamento de dados confidenciais reduzido a zero (nenhum código é armazenado em repouso).
  * Escalabilidade horizontal imediata do backend: qualquer contêiner FastAPI pode responder a qualquer requisição sem afinidade de sessão ou sincronização de cache.
  * Menor pegada de memória e inicialização instantânea dos serviços.
* **Negativas / Trade-offs:**
  * Não há persistência de histórico entre sessões: recarregar a página (F5) descarta os alertas da sessão corrente.
  * Ausência de painel analítico histórico multiusuário no MVP.

### Rastreabilidade
- **Requisitos:** RNF03 (Segurança e Privacidade — zero data retention), Seção 2.3 de `docs/spec.md`.
- **Regras de Governança:** `AGENTS.md` (Princípio 1 e seção Banco de Dados).

---

## ADR-03 — Validação Independente com Pydantic v2 (Defense-in-Depth)

### Status
Aprovado

### Contexto
O Google Gemini oferece o recurso de *Structured Outputs* através do parâmetro `response_schema`, que instrui o modelo a gerar respostas em conformidade com uma especificação JSON Schema. Contudo, em sistemas de produção que utilizam LLMs, modelos estocásticos podem apresentar desvios, truncamentos por limite de tokens de saída, formatos inesperados em campos aninhados ou violações sutis de tipos.

### Opções Consideradas
1. **Confiança Exclusiva no `response_schema` da LLM:** Assumir que o payload retornado pela API do provedor é 100% confiável e transmiti-lo diretamente ao frontend.
2. **Sanitização Manual com Expressões Regulares / Dicionários Python:** Realizar checagens pontuais de chaves obrigatórias.
3. **Camada de Validação Independente com Pydantic v2:** Forçar a deserialização e validação rigorosa de cada alerta recebido em modelos Pydantic v2 antes de qualquer retransmissão no stream SSE.

### Proposta Inicial da IA vs. Revisão Crítica Humana
* **Proposta Inicial da IA:** Confiar unicamente na validação nativa da API Gemini e enviar o JSON diretamente ao cliente.
* **Revisão Crítica do Arquiteto (Decisão Contrária):**
  * *Princípio de Defesa em Profundidade (Defense-in-Depth):* A API externa é uma fronteira não confiável. O frontend espera um contrato estrito para renderizar o editor Monaco e calcular o Code Health Score. Um único campo ausente (ex.: `line_start`) ou com tipo trocado causaria falhas de execução no cliente.
  * *Atribuição Confiável de Identificadores:* Delegar à LLM a geração de UUIDs resulta frequentemente em colisões ou strings arbitrárias. O backend deve atribuir identificadores determinísticos ou UUIDs v4 próprios.

### Decisão
Implementar uma camada de validação independente com **Pydantic v2** (`src/core/validator/alert_schema.py`). Cada alerta gerado pelo Gemini:
1. É submetido ao modelo `AlertItem` para validação de tipos, limites de tamanho de string e pertinência aos *enums* de `Severity` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) e `Category` (`SECURITY`, `PERFORMANCE`, `QUALITY`, `MAINTAINABILITY`).
2. Passa pela validação de integridade de intervalo (`line_end >= line_start >= 1`).
3. Tem seu UUID v4 gerado no backend, não aceitando identificadores inventados pelo modelo.
4. Caso ocorra falha de validação em um alerta individual, o erro é registrado em log JSON estruturado e o alerta corrompido é descartado sem interromper o streaming dos demais alertas íntegros.

### Consequências
* **Positivas:**
  * Taxa de erro de schema em produção inferior a 0,1% (cumprindo o RNF01).
  * Desacoplamento do contrato interno da aplicação em relação a eventuais mudanças na formatação da API do provedor de LLM.
  * O frontend recebe 100% de dados tipados, consistentes e com identificadores válidos.
* **Negativas / Trade-offs:**
  * Sobrecarga computacional mínima de validação em CPU (desprezível, na ordem de microssegundos por alerta com Pydantic v2 compilado em Rust).

### Rastreabilidade
- **Requisitos:** RF02 (Schema do Alerta), RNF01 (Confiabilidade de Schemas), RNF05 (Resiliência).
- **Testes:** CT08 (JSON inválido da LLM), testes unitários em `backend/tests/unit/test_alert_schema.py`.

---

## ADR-04 — Monaco Editor como Editor Principal e Aplicação Atômica de Correções

### Status
Aprovado

### Contexto
O diferencial central do Agent Code Review é permitir que o desenvolvedor não apenas visualize vulnerabilidades, mas as resolva instantaneamente. A interface exige:
1. Exibição de código com destaque de sintaxe para múltiplas linguagens.
2. Destaque visual (decorações de linha e ícones de gutter) para trechos com alertas de diferentes severidades.
3. Capacidade de substituir o código vulnerável pela sugestão segura com **um clique** de forma atômica.
4. Histórico completo de edição com suporte imediato ao atalho de desfazer (`Ctrl+Z`).

### Opções Consideradas
1. **Textarea HTML nativa com Overlay:** Extremamente leve, porém sem suporte a syntax highlighting multilinguagem, sem gutter customizável e com manipulação frágil de cursor e seleções.
2. **CodeMirror 6:** Editor moderno, modular e com bundle relativamente pequeno (~300–500 KB).
3. **Monaco Editor (`@monaco-editor/react`):** Engine oficial do Visual Studio Code empacotada para aplicações web.

### Decisão
Utilizar o **Monaco Editor** via biblioteca `@monaco-editor/react` 4.x como componente central de edição de código e visualização de diffs.

### Justificativa
* **Familiaridade Imediata:** Desenvolvedores utilizam o ecossistema do VS Code diariamente. Atalhos, rolagem, minimapa e comportamento de seleção são idênticos ao ambiente de trabalho do usuário.
* **Mecanismo Atômico `executeEdits`:** A API interna `editor.executeEdits(source, edits)` do Monaco substitui precisamente o intervalo `[line_start, line_end]` com a sugestão proposta sem reformatar o restante do arquivo, e registra a operação na pilha de desfazer nativa do editor.
* **Desfazer com `Ctrl+Z` (CT07):** Pressionar `Ctrl+Z` restaura o código anterior de forma fluida e o hook do editor sincroniza o status do alerta de volta para `OPEN`.
* **Visualizador de Diff Nativo:** Monaco possui suporte nativo de alto desempenho para renderização de diff unificado e lado a lado.

### Consequências
* **Positivas:**
  * Atendimento integral a RF01, RF03, RF05 e CT07 com comportamento idêntico a uma IDE moderna.
  * Manipulação precisa de marcadores de severidade via Monaco Decorators (`deltaDecorations`).
* **Negativas / Trade-offs:**
  * Aumento no tamanho do bundle JavaScript do frontend (~2 MB comprimido), exigindo carregamento assíncrono via `next/dynamic` para não prejudicar o tempo de carregamento da casca inicial da página.
  * Consumo de memória superior a soluções mínimas em páginas com arquivos gigantescos (mitigado pelo limite de 500 linhas imposto na aplicação).

### Rastreabilidade
- **Requisitos:** RF01 (Editor Monaco), RF03 (Navegação Bidirecional), RF05 (Aplicação de Correções e Undo), RNF04 (Responsividade da UI).
- **Testes:** CT07 (Aplicação de Correção e Desfazer), testes unitários e de componente em `frontend/__tests__/components/Editor/`.

---

## ADR-05 — Seleção do Modelo Gemini Flash e Truncamento Rígido em 500 Linhas

### Status
Aprovado

### Contexto
O motor de análise exige alta disponibilidade, baixa latência de resposta, suporte a saída estruturada (*Structured Outputs*) e custo sustentável para uso frequente em auditorias de desenvolvimento contínuo.

### Opções Consideradas
1. **Modelos Frontier / "Pro" (ex: GPT-4o, Claude 3.5 Sonnet, Gemini Pro):** Excelente capacidade de raciocínio profundo, porém com latência mais elevada (3–8 segundos para primeiro token), custo 5x a 15x superior e frequente tendência a explicações excessivamente verbosas.
2. **Modelos Open-Weight Locais (ex: Llama-3-8B, Qwen-Coder via Ollama):** Custo de inferência nulo por token, porém exigem infraestrutura dedicada com GPUs de alto custo, apresentam degradação em conformidade estrita de JSON schema e possuem desempenho heterogêneo no hardware de desenvolvedores.
3. **Google Gemini Flash (`gemini-3.6-flash` com fallbacks para `3.5-flash` e `2.0-flash`):** Família de modelos ultra-rápidos otimizados para tarefas analíticas estruturadas com suporte nativo a `response_schema`.

### Decisão
1. **Modelo Principal:** Adotar **Google Gemini `gemini-3.6-flash`** (operado via Google GenAI SDK no backend). Em caso de indisponibilidade ou depreciação de versão, o cliente de integração possui fallback automático para `gemini-3.5-flash` e `gemini-2.0-flash`.
2. **Configuração de Inferência:** Utilizar temperatura baixa (0.2) para maximizar determinismo, combinada a `thinking_level=minimal` / `thinking_budget=0` para assegurar que o modelo não despenda tempo com cadeias longas de raciocínio interno, garantindo retorno antes do timeout de 30s.
3. **Truncamento Rígido de Contexto em 500 Linhas:** Embora o modelo suporte milhões de tokens, o backend corta o código submetido em no máximo **500 linhas** (`MAX_CODE_LINES = 500` em `src/core/analyzer/code_limits.py`).

### Justificativa do Truncamento em 500 Linhas
* **Previsibilidade Orçamentária e de Desempenho:** Arquivos acidentais (ex: minificados, dumps de banco, bundles gerados) gerariam picos desnecessários de latência e consumo de cota.
* **Mitigação de Injeção Indireta de Prompt:** Reduz a área de contato para ataques em que instruções maliciosas são disfarçadas dentro de grandes volumes de dados.
* **Foco em Boas Práticas de Engenharia:** Em metodologias ágeis e revisões de código eficazes, Pull Requests recomendados raramente ultrapassam 400 linhas. Para diffs superiores a 500 linhas, o sistema emite um alerta explícito informando o usuário sobre a limitação.

### Consequências
* **Positivas:**
  * Custo por análise na faixa de centavos de dólar.
  * Atingimento da meta de latência RNF02 (TTFA ≤ 1.500ms p95).
  * Proteção do backend contra esgotamento de memória e estouro de timeouts.
* **Negativas / Trade-offs:**
  * Não é possível analisar módulos gigantescos ou monorepos inteiros em uma única execução (necessidade de submeter arquivo por arquivo ou diffs atômicos).

### Rastreabilidade
- **Requisitos:** RF06 (Cálculo de Score), RNF02 (Latência e TTFA), CT01 a CT04.
- **Implementação:** `backend/src/integrations/llm/gemini_client.py` e `backend/src/core/analyzer/code_limits.py`.

---

## ADR-06 — Padrão Backend-for-Frontend (BFF) para Isolamento Estrito de Segredos

### Status
Aprovado

### Contexto
O sistema consome APIs externas sensíveis que requerem credenciais de autenticação:
- Google Gemini API (`GEMINI_API_KEY`)
- GitHub REST API v3 (`GITHUB_TOKEN` opcional para limites de taxa em PRs públicos)
- GitLab API v4 (`GITLAB_TOKEN` opcional)

Em aplicações modernas com Next.js, é comum a tentação de invocar SDKs diretamente do navegador ou misturar camadas lógicas no client-side.

### Opções Consideradas
1. **Chamadas Diretas do Browser para as APIs:** O cliente React faz requisições diretas ao Google Gemini e ao GitHub.
2. **Full-Stack Next.js sem Backend Dedicado:** Utilizar exclusivamente rotas do Next.js API Routes (Node.js) para tudo.
3. **Backend-for-Frontend (BFF) em Python FastAPI:** Manter um backend dedicado em FastAPI especializado em computação científica, validação Pydantic e streaming SSE assíncrono, isolando totalmente as chaves de API do navegador.

### Decisão
Adotar a arquitetura com **Backend FastAPI dedicado atuando como BFF de orquestração**. As chaves de API (`GEMINI_API_KEY`, `GITHUB_TOKEN`, `GITLAB_TOKEN`) residem **exclusivamente como variáveis de ambiente no contêiner do servidor backend**.
O frontend comunica-se apenas com a API local (`/api/analyze`, `/api/diff/ingest`, `/api/health`).

### Justificativa
* **Blindagem Absoluta contra Vazamento de Chaves (RNF03):** Credenciais nunca são compiladas no bundle JavaScript do Next.js nem trafegam para o navegador do usuário. A inspeção de rede via DevTools não revela nenhum token de provedor.
* **Especialização de Runtime:** Python é o ecossistema padrão e mais maduro para orquestração de IA generativa, bibliotecas de tipagem de dados (Pydantic v2) e processamento assíncrono com Uvicorn.
* **Governança de Acesso:** O backend centraliza a validação de URLs públicas do GitHub/GitLab, impedindo SSRF (*Server-Side Request Forgery*) contra redes corporativas internas.

### Consequências
* **Positivas:**
  * Conformidade estrita com o requisito de segurança RNF03.
  * Facilidade de testes de integração e mocks no backend sem interferência do ciclo de compilação do Next.js.
  * Separação clara de responsabilidades entre apresentação (Next.js) e orquestração de IA (FastAPI).
* **Negativas / Trade-offs:**
  * Necessidade de orquestrar dois serviços de execução no Docker Compose (`frontend` na porta 3000 e `backend` na porta 8000).

### Rastreabilidade
- **Requisitos:** RF04 (Ingestão de Diff), RNF03 (Segurança e Privacidade de Chaves).
- **Configuração:** `docker-compose.yml`, `backend/src/config/settings.py` e `frontend/next.config.ts`.
