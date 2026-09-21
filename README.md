# Agent Code Review 🤖🔍

> **Revisão inteligente e interativa de código com IA** — Detecte vulnerabilidades de segurança, problemas de performance e qualidade de código antes do merge, com feedback em minutos e aplicação de correções com um clique.

[![Status](https://img.shields.io/badge/status-MVP%20em%20desenvolvimento-yellow)](docs/prd.md)
[![Versão](https://img.shields.io/badge/versão-1.0.0--MVP-blue)](docs/spec.md)
[![Python](https://img.shields.io/badge/python-3.12+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.x-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.x-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Gemini](https://img.shields.io/badge/Gemini-2.5--flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/licença-MIT-green)](LICENSE)

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [O Problema](#-o-problema)
- [Funcionalidades](#-funcionalidades)
- [Arquitetura](#-arquitetura)
- [Stack Tecnológica](#-stack-tecnológica)
- [Pré-requisitos](#-pré-requisitos)
- [Configuração e Instalação](#-configuração-e-instalação)
- [Como Usar](#-como-usar)
- [API Reference](#-api-reference)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Testes](#-testes)
- [Roadmap](#-roadmap)
- [Contribuindo](#-contribuindo)
- [Documentação](#-documentação)

---

## 🎯 Sobre o Projeto

O **Agent Code Review** é uma aplicação web full-stack que combina um editor de código visual (**Monaco Editor** — a engine do VS Code) com um motor de análise baseado em LLM (**Google Gemini `gemini-3.6-flash`**) para:

- 🛡️ **Detectar vulnerabilidades de segurança** (OWASP Top 10) automaticamente
- ⚡ **Identificar problemas de performance** e qualidade antes do merge
- ✅ **Aplicar correções com um único clique** — substituição atômica inline do trecho problemático
- 📊 **Calcular um Code Health Score** dinâmico com recálculo em tempo real
- 🔄 **Visualizar diffs** em modo side-by-side ou unified, com navegação bidirecional entre alertas e editor
- 📡 **Fazer streaming de resultados via SSE** — primeiros alertas em ≤ 1,5 segundos

O diferencial central é eliminar o ciclo manual de copiar e colar: o desenvolvedor aceita uma sugestão da IA e o trecho problemático é substituído instantaneamente no editor, **sem recarregamento de página**.

---

## 🚨 O Problema

Equipes de engenharia perdem horas produtivas por ciclo de sprint aguardando revisões manuais de código:

| Métrica | Situação Atual | Meta com o Agent Code Review |
|---------|---------------|------------------------------|
| Tempo médio de 1º feedback em PRs | 4–24 horas | **< 5 minutos** |
| Vulnerabilidades OWASP detectadas antes do merge | < 40% | **> 90%** |
| PRs revisados por Tech Lead/semana | Baseline atual | **-30%** (foco em revisões de alto valor) |
| Context switches por PR | A medir | **-50%** |

> 📄 Leia o [Problem Statement completo](docs/problem.md) para entender o contexto, os impactos e as evidências de mercado.

---

## ✨ Funcionalidades

### MVP (v1.0.0)

| # | Funcionalidade | Descrição |
|---|---------------|-----------|
| F01 | **Editor Visual de Código** | Monaco Editor com syntax highlighting para Python, JS/TS, Java, Go, PHP |
| F02 | **Visualizador de Diffs** | Modo side-by-side e unified diff com navegação por hunks |
| F03 | **Destaque Visual (Highlighting)** | Marcação inline nas linhas afetadas, com gutter icon por severidade |
| F04 | **Painel Lateral de Alertas** | Cards categorizados por CRITICAL, HIGH, MEDIUM, LOW |
| F05 | **Aplicar Correção (1 clique)** | Substituição atômica inline com suporte a Ctrl+Z / Cmd+Z |
| F06 | **Integração LLM via API** | Gemini gemini-3.6-flash com Structured Outputs (JSON Schema estrito) |
| F07 | **Code Health Score** | Índice de saúde ponderado com atualização dinâmica |
| F08 | **Filtros de Severidade** | Toggle client-side por nível (< 100ms, sem round-trip) |
| F09 | **Ingestão via URL de PR** | Carrega diff automaticamente de Pull Requests do GitHub ou GitLab |
| F10 | **Retry em Falha de API** | Toast de erro com botão de reenvio manual |

### Code Health Score

O score é calculado pela seguinte fórmula ponderada:

```
Score = max(0, 100 - (CRITICAL × 25 + HIGH × 10 + MEDIUM × 3 + LOW × 1))
```

| Faixa | Intervalo | Indicador visual |
|-------|-----------|-----------------|
| EXCELENTE | 91–100 | Verde |
| BOM | 71–90 | Amarelo |
| ATENÇÃO | 41–70 | Laranja |
| CRÍTICO | 0–40 | Vermelho |

---

## 🏗️ Arquitetura

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
|  |  - System Instructions deterministicas                      |  |
|  |  - JSON Schema Enforcement (response_schema Gemini)         |  |
|  |  - Pydantic v2 Validation Layer                             |  |
|  |  - SSE Streaming Proxy (sse-starlette)                      |  |
|  +------------------------------------+-----------------------+  |
+--------------------------------------+---------------------------+
                                       | HTTPS
+--------------------------------------v---------------------------+
|                    GEMINI API (Google AI)                        |
|           Model: gemini-3.6-flash (Structured Output)           |
+-----------------------------------------------------------------+
```

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| Frontend Framework | Next.js (App Router) | 15.x |
| Linguagem Frontend | TypeScript | 5.x |
| Estilização | Tailwind CSS | v4.x |
| Editor de Código | Monaco Editor (@monaco-editor/react) | 4.x |
| Visualizador de Diff | react-diff-viewer-continued | 4.x |
| Backend Framework | FastAPI | 0.115.x |
| Linguagem Backend | Python | 3.12+ |
| Validação de Schema | Pydantic | v2.x |
| Provedor de IA | Google Gemini API | gemini-3.6-flash |
| Streaming | Server-Sent Events (SSE) | — |
| Containerização | Docker + Docker Compose | 24.x / 2.x |
| CI/CD | GitHub Actions | — |

---

## ✅ Pré-requisitos

Antes de iniciar, certifique-se de que você tem instalado:

- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) (v24+ / v2+)
- [Node.js](https://nodejs.org/) 20+ e npm (para desenvolvimento frontend)
- [Python](https://www.python.org/) 3.12+ (para desenvolvimento backend)
- Uma chave de API do [Google Gemini](https://aistudio.google.com/apikey) (`GEMINI_API_KEY`)

---

## 🚀 Configuração e Instalação

O caminho recomendado para subir o MVP é **Docker Compose**: frontend (Next.js) e backend (FastAPI) sobem juntos, sem instalar Python/Node no host além do Docker.

### 1. Clone o repositório

```bash
git clone https://github.com/<seu-usuario>/agent-codereview.git
cd agent-codereview
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas chaves:

```env
# Obrigatório — Motor de análise de código (LLM)
GEMINI_API_KEY=sua_chave_gemini_aqui

# Opcional — Para ingestão de diffs de PRs GitHub
GITHUB_TOKEN=seu_token_github_aqui

# Opcional — Para ingestão de diffs de MRs GitLab
GITLAB_TOKEN=seu_token_gitlab_aqui

# Opcional — rewrite server-side Next `/api/*` → FastAPI (não é secret de produto).
# Local default: http://127.0.0.1:8000. Compose sobrescreve para http://backend:8000.
BACKEND_URL=http://127.0.0.1:8000
```

> **Importante:** Nunca exponha `GEMINI_API_KEY`, `GITHUB_TOKEN` ou `GITLAB_TOKEN` no código-fonte ou no bundle client-side. `BACKEND_URL` é só destino do proxy Next (server-side); não use `NEXT_PUBLIC_*` para chaves.

### 3. Docker — subir o ambiente completo

O `docker-compose.yml` define dois serviços:

| Serviço | Imagem / build | Porta no host | Função |
|---------|----------------|---------------|--------|
| `backend` | `backend/Dockerfile` (Python 3.12, Uvicorn) | `8000` | FastAPI, Gemini, ingestão GitHub/GitLab |
| `frontend` | `frontend/Dockerfile` (Node 20, Next.js) | `3000` | UI; rewrite `/api/*` → backend |

O Compose injeta `BACKEND_URL=http://backend:8000` no frontend (build **e** runtime). O default `http://127.0.0.1:8000` do `.env` serve só para desenvolvimento **fora** do Compose: dentro da rede Docker, `127.0.0.1` aponta para o próprio container e quebra o proxy.

**Subir (primeira vez ou após mudança de Dockerfile):**

```bash
docker compose up --build
```

**Subir em segundo plano:**

```bash
docker compose up --build -d
```

**Probe do backend** (quando os containers estiverem healthy/up):

```bash
curl -s http://127.0.0.1:8000/api/health
```

**Logs, parar e limpar:**

```bash
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend

docker compose stop
docker compose down
```

Não há banco, Redis nem fila no MVP (ADR-02): não rode migrations e não espere volumes de dados. O `.env` da raiz é lido pelo serviço `backend` (`env_file`). Recrie o container depois de alterar chaves:

```bash
docker compose up --build -d --force-recreate backend
```

### 4. Acesse a aplicação

| Serviço | URL |
|---------|-----|
| Frontend (Next.js) | http://localhost:3000 |
| Backend API (FastAPI) | http://localhost:8000 |
| Documentação da API (Swagger) | http://localhost:8000/docs |
| Documentação da API (ReDoc) | http://localhost:8000/redoc |

Use a UI em **http://localhost:3000**. O browser não deve chamar Gemini nem colar tokens no client: a análise passa por `POST /api/analyze` (SSE) no backend.

---

### Desenvolvimento Local (sem Docker)

**Backend:**

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\Activate.ps1 | Unix: source .venv/bin/activate
pip install -e ".[dev]"
uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

**Frontend:**

```bash
cd frontend
npm ci
npm run dev
```

---

## 💡 Como Usar

### Fluxo Principal

1. **Cole ou carregue seu código** — use o editor Monaco, faça upload de um arquivo, ou cole a URL de um Pull Request do GitHub/GitLab
2. **Clique em "Analisar Código"** — os primeiros alertas aparecem em streaming em até 1,5 segundos
3. **Revise os alertas** no painel lateral, organizados por severidade (CRITICAL → HIGH → MEDIUM → LOW)
4. **Clique em um card** para navegar até a linha afetada no editor (e vice-versa)
5. **Clique em "Aplicar Correção"** para substituir o trecho problemático com um clique — use Ctrl+Z / Cmd+Z para desfazer
6. **Acompanhe o Code Health Score** ser atualizado dinamicamente conforme você resolve os alertas

### Modalidades de Entrada

| Modalidade | Como usar |
|------------|-----------|
| **Inserção manual** | Cole código ou diff diretamente no editor Monaco |
| **Upload de arquivo** | Arraste ou selecione um arquivo .py, .js, .ts, .java, .go, .php, .rb |
| **URL de PR/MR** | Cole a URL de um Pull Request GitHub ou Merge Request GitLab público |

### Exemplos de Detecção

**SQL Injection (CRITICAL):**

```python
# Detectado como CRITICAL — SQL Injection
query = "SELECT * FROM users WHERE id = " + user_input

# Correcao sugerida pela IA (aplicavel com 1 clique)
cursor.execute("SELECT * FROM users WHERE id = ?", (user_input,))
```

**Segredo Hardcoded (CRITICAL):**

```python
# Detectado como CRITICAL — Credencial exposta
API_KEY = "sk-1234567890abcdef"

# Correcao sugerida pela IA
import os
API_KEY = os.environ.get("API_KEY")
```

---

## 📡 API Reference

### POST /api/analyze

Analisa código-fonte e retorna alertas via streaming SSE.

**Request:**

```json
{
  "code": "string (conteudo do codigo ou diff)",
  "language": "python | javascript | typescript | java | go | php | ruby | auto",
  "filename": "string (opcional)"
}
```

**Response (SSE stream):**

```
event: alert
data: {"id": "uuid", "severity": "CRITICAL", "title": "SQL Injection via concatenacao direta de input", ...}

event: score
data: {"code_health_score": 25, "alert_count": {"CRITICAL": 1, "HIGH": 2, "MEDIUM": 5, "LOW": 3}}

event: done
data: {"status": "completed", "analysis_id": "uuid", "duration_ms": 2340}
```

### POST /api/diff/ingest

Ingere o diff de um Pull Request a partir da URL.

**Request:**

```json
{
  "url": "https://github.com/owner/repo/pull/123"
}
```

**Response:**

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

### GET /api/health

Verifica o status do backend e a conectividade com a Gemini API.

**Response:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "gemini_api": "reachable",
  "timestamp": "2026-09-19T16:00:00Z"
}
```

**Schema de alerta:**

```json
{
  "id": "uuid-v4",
  "file": "users.py",
  "line_start": 12,
  "line_end": 12,
  "severity": "CRITICAL | HIGH | MEDIUM | LOW",
  "title": "Titulo curto do problema",
  "description": "Justificativa tecnica completa com referencia OWASP",
  "suggestion": "Codigo de substituicao sugerido",
  "category": "SECURITY | PERFORMANCE | QUALITY | MAINTAINABILITY"
}
```

> Documentacao interativa completa disponivel em `/docs` (Swagger UI) e `/redoc` ao rodar o backend.

---

## 📁 Estrutura do Projeto

```
agent-codereview/
├── frontend/                   # Aplicacao Next.js 15
│   ├── app/                    # App Router (paginas e layouts)
│   ├── components/             # Monaco Editor, Alert Panel, Dashboard
│   ├── hooks/                  # useSSE, useAlerts, useEditor
│   ├── lib/                    # Cliente HTTP, formatadores
│   └── types/                  # Tipos TypeScript (AlertItem, etc.)
├── backend/                    # Aplicacao FastAPI
│   ├── src/
│   │   ├── api/                # Rotas FastAPI (routes, dependencies)
│   │   ├── core/
│   │   │   ├── analyzer/       # LLM Orchestration Service
│   │   │   ├── validator/      # Pydantic schema validation
│   │   │   └── scorer/         # Code Health Score calculator
│   │   ├── integrations/
│   │   │   ├── llm/            # Gemini API client
│   │   │   ├── github/         # GitHub REST API client
│   │   │   └── gitlab/         # GitLab API v4 client
│   │   └── config/             # Settings (variaveis de ambiente)
│   └── tests/
│       ├── unit/
│       └── integration/
├── docs/                       # Documentacao do produto
│   ├── problem.md              # Problem Statement
│   ├── prd.md                  # Product Requirements Document
│   └── spec.md                 # Especificacao Tecnica
├── openspec/                   # Especificacoes OpenSpec
├── .env.example                # Template de variaveis de ambiente
├── docker-compose.yml          # Orquestracao dos servicos
└── .github/workflows/          # Pipelines CI/CD (GitHub Actions)
```

---

## 🧪 Testes

### Executar todos os testes

```bash
# Backend (gate AGENTS / CI)
cd backend
pytest -q --cov=src/core --cov-fail-under=80

# Frontend (gate AGENTS / CI)
cd frontend
npm run lint && npx tsc --noEmit && npm test && npm run build
```

### Casos de Teste Obrigatórios (MVP)

| # | Cenário | Resultado Esperado |
|---|---------|-------------------|
| CT01 | SQL Injection direto | CRITICAL, categoria SECURITY |
| CT02 | Segredo hardcoded | CRITICAL, categoria SECURITY |
| CT03 | Código limpo (sem falhas) | Painel vazio, Code Health Score = 100 |
| CT04 | Falha de API (timeout simulado) | Toast de erro + botão Tentar Novamente |
| CT05 | URL de PR inválida | Validação client-side antes do envio |
| CT06 | Filtro de severidade | Apenas CRITICAL e HIGH visíveis |
| CT07 | Aplicar correção + Undo | Editor reverte para o código original com Ctrl+Z |
| CT08 | Arquivo com 2.000+ linhas | Editor responsivo sem freeze |

### Critério de Cobertura

- Cobertura mínima de **80%** nos pacotes `core/` do backend
- Todos os CT01–CT08 devem passar em ambiente de staging antes do lançamento

---

## 🗺️ Roadmap

| Versão | Funcionalidade | Valor Esperado |
|--------|----------------|----------------|
| **v1.0.0** | MVP — Análise de código, alertas, correções com 1 clique | Lançamento inicial |
| v1.1 | Autenticação GitHub OAuth + PRs privados | Uso em projetos corporativos |
| v1.2 | Histórico de análises e métricas agregadas | Visibilidade gerencial de qualidade |
| v1.3 | Chat contextual com a IA sobre alertas específicos | Experiência educativa e de mentoria |
| v2.0 | Extensão para VS Code e JetBrains IDEs | Análise no momento da escrita |
| v2.1 | Suporte a IaC: Terraform, Bicep, CloudFormation | Expansão para times de DevOps |
| v3.0 | Multi-tenant com RBAC, SSO e dashboards por organização | Produto SaaS enterprise |

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Faça um **fork** do repositório
2. Crie uma **branch** para sua feature: `git checkout -b feature/minha-feature`
3. Faça o **commit** das suas mudanças: `git commit -m "feat: adiciona minha feature"`
4. Faça o **push** para a branch: `git push origin feature/minha-feature`
5. Abra um **Pull Request**

Por favor, certifique-se de que:
- Os testes CT01–CT08 continuam passando
- A cobertura de testes do backend permanece >= 80%
- Nenhuma chave de API está exposta no código ou bundle client-side

---

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [Problem Statement](docs/problem.md) | Definição do problema, personas, impactos e hipótese de solução |
| [PRD](docs/prd.md) | Product Requirements Document — escopo, requisitos funcionais e não funcionais |
| [Especificação Técnica](docs/spec.md) | Contratos de API, schemas, critérios de aceite e fluxos |
| [Arquitetura de Software](docs/architecture.md) | Componentes, stack, restrições e diretrizes não funcionais |
| [ADRs (Decisões Arquiteturais)](docs/adr.md) | Registros formais de decisões técnicas, trade-offs e revisão crítica |
| [API Swagger UI](http://localhost:8000/docs) | Documentação interativa (requer backend em execução) |

### Referências Externas

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Google Gemini API — Structured Output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Monaco Editor Documentation](https://microsoft.github.io/monaco-editor/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js 15 — App Router](https://nextjs.org/docs/app)
- [GitHub REST API — Pull Requests](https://docs.github.com/en/rest/pulls/pulls)
- [GitLab API v4 — Merge Requests](https://docs.gitlab.com/ee/api/merge_requests.html)

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

Feito com carinho como projeto de estudo em Engenharia de Software — Pós-Graduação Lato Sensu
