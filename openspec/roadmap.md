# Roadmap — CodeReview Agent: Implementação Full Stack Incremental

> Planejamento de mudanças incrementais. Nenhuma mudança com tamanho, complexidade ou risco maior que **Médio**. Nenhuma mudança concluída sem testes.

---

## Visão Geral do Sistema

```
+-----------------------------------------------------------+
|                   CODEREVIEW AGENT                        |
|                                                           |
|  +----------+   +---------+   +-----------+   +-------+  |
|  | Frontend |   | FastAPI |   | Worker /  |   | LLM   |  |
|  | (Vite +  |-->| REST    |   | Queue     |-->| Gate- |  |
|  | React)   |   | API     |   | (Redis    |   | way   |  |
|  +----------+   +---------+   | Streams)  |   +-------+  |
|       ^              |        +-----------+       |       |
|       |         +---------+        |          +-------+   |
|       +---------|Webhook  |        |          |GitHub |   |
|                 |Receiver |        +--------->|API    |   |
|                 +---------+                   |Client |   |
|                      ^                        +-------+   |
|                      |                                    |
|                  GitHub Webhook                           |
+-----------------------------------------------------------+
```

---

## Mapa de Mudancas

```
FASE 1 -- BACKEND MVP
   CH-01 --> CH-02 --> CH-03 --> CH-04 --> CH-05

FASE 2 -- API REST + FRONTEND MVP
   CH-05 --> CH-06 --> CH-07 --> CH-08

FASE 3 -- POS-MVP
   CH-08 --> CH-09 --> CH-10
```

---

## Resumo das Mudancas

| ID | Nome | Tipo | Tamanho | Complexidade | Risco | Depende de |
|----|------|------|---------|--------------|-------|------------|
| CH-01 | Fundação do Projeto: Estrutura, Config e Entrypoint | MVP | Pequeno | Baixa | Baixo | — |
| CH-02 | Webhook Receiver: Recebimento e Validação de Eventos GitHub | MVP | Médio | Média | Médio | CH-01 |
| CH-03 | GitHub API Client: Leitura do Diff do Pull Request | MVP | Médio | Média | Médio | CH-01, CH-02 |
| CH-04 | LLM Gateway e Motor de Análise (Analyzer) | MVP | Médio | Média | Médio | CH-01, CH-03 |
| CH-05 | Classificador de Severidade e Reporter (Inline + Sumário) | MVP | Médio | Média | Médio | CH-03, CH-04 |
| CH-06 | API REST de Resultados e Persistência de Metadados | MVP | Médio | Média | Baixo | CH-01, CH-05 |
| CH-07 | Frontend: Dashboard e Fila de PRs | MVP | Médio | Média | Baixo | CH-06 |
| CH-08 | Frontend: Análise Detalhada do PR | MVP | Médio | Média | Baixo | CH-06, CH-07 |
| CH-09 | Regras de Negócio Customizadas via .codereview.yml | Pós-MVP | Médio | Média | Médio | CH-04, CH-06, CH-07 |
| CH-10 | Dashboard de Métricas e Analytics de Qualidade | Pós-MVP | Médio | Média | Baixo | CH-06, CH-07 |

---

## Requisitos Funcionais Cobertos

| RF | Descrição | Mudança |
|----|-----------|---------|
| RF-01 | Recebimento de Webhook | CH-02 |
| RF-02 | Leitura do Diff via GitHub API | CH-03 |
| RF-03 | Postagem de Comentários Inline | CH-05 |
| RF-04 | Postagem de Sumário Geral | CH-05 |
| RF-05 | Detecção de Falhas de Segurança (OWASP Top 10) | CH-04, CH-05 |
| RF-06 | Detecção de Problemas de Qualidade e Performance | CH-04, CH-05 |
| RF-07 | Priorização por Severidade | CH-05 |
| RF-08 | Regras Customizadas .codereview.yml | CH-09 |
| RF-09 | Score de Risco por PR | CH-10 (parcial) |

## Requisitos Não Funcionais Cobertos

| RNF | Descrição | Mudança |
|-----|-----------|---------|
| RNF-01 | Análise em até 3 minutos | CH-04, CH-05 |
| RNF-02 | Webhook responde em < 3s | CH-02 |
| RNF-05 | Fallback LLM indisponível | CH-04 |
| RNF-06 | Retry com backoff exponencial | CH-03 |
| RNF-07 | Código-fonte não persistido | CH-03, CH-04, CH-06 |
| RNF-09 | Validação HMAC-SHA256 | CH-02 |
| RNF-13 | Arquitetura modular (troca LLM) | CH-01, CH-04 |
| RNF-14 | Rastreabilidade com metadados | CH-04, CH-05, CH-06 |
| RNF-15 | Cobertura >= 80% em core/ | CH-05 |

---

## Protótipos Stitch Referenciados

| Tela | ID Stitch | Mudança |
|------|-----------|---------|
| Dashboard e Fila de PRs | 05a4aa18 | CH-07 |
| Análise Detalhada do PR 42 | 9fa4b0e8 | CH-06, CH-08 |
| Configurações de Regras e Governança | 8ea76ff9 | CH-09 |
| Métricas e Analytics de Qualidade | 0201399c | CH-10 |

Design System: "Obsidian Autonomous Intelligence" - Dark mode, primária #6366f1 (índigo), tipografia Geist + JetBrains Mono.

---

## Estratégia de Testes por Camada

```
CAMADA           FERRAMENTA       MUDANCAS
Unit (backend)   pytest/httpx     CH-01 a CH-10
Unit (frontend)  Vitest/RTL       CH-07, CH-08, CH-09, CH-10
Integracao BE    pytest + mocks   CH-02,03,04,05,06,09,10
Integracao FE    Vitest/RTL       CH-07, CH-08, CH-09, CH-10
E2E pipeline     pytest           CH-05 (pipeline completo)
E2E frontend     Playwright       CH-07, CH-08, CH-09, CH-10
```

Cobertura mínima obrigatória: >= 80% em opencode/src/core/ (RNF-15).

---

## Critérios de Aceite do MVP (CH-01 a CH-08)

- [ ] RF-01: Webhook valida eventos do GitHub em < 3s — CH-02
- [ ] RF-02: Diff de PRs obtido e processado — CH-03
- [ ] RF-03: Comentários inline postados nas linhas corretas — CH-05
- [ ] RF-04: Sumário com contagem por severidade e recomendação — CH-05
- [ ] RF-05: OWASP Top 10 detectados — CH-04 + CH-05
- [ ] RF-06: Problemas de qualidade identificados — CH-04 + CH-05
- [ ] RF-07: Issues classificados e ordenados por severidade — CH-05
- [ ] RNF-07: Código-fonte não persistido — CH-03 + CH-06
- [ ] RNF-14: Rastreabilidade de análises — CH-06
- [ ] RNF-15: Cobertura >= 80% em core/ — CH-05

---

## Ordem de Implementação

```
Sprint 1 (MVP Backend)  : CH-01 -> CH-02 -> CH-03
Sprint 2 (MVP Core)     : CH-04 -> CH-05
Sprint 3 (MVP Frontend) : CH-06 -> CH-07 -> CH-08
Sprint 4 (Pos-MVP)      : CH-09 -> CH-10
```

> Regra de ouro: Nenhuma mudança é concluída sem pytest, ruff check e mypy --strict passando
> (mais tsc --noEmit para frontend), e cobertura de core/ >= 80%.
