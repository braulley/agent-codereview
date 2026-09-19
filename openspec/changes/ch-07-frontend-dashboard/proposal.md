# CH-07 — Frontend: Dashboard & Fila de PRs

**Tipo:** MVP | **Tamanho:** Médio | **Complexidade:** Média | **Risco:** Baixo

---

## Descrição

Implementa a interface web do **Dashboard & Fila de PRs** — a tela principal da aplicação — conforme o protótipo Stitch "AI Code Review Agent Prototype" (tela `05a4aa18`). Exibe a fila de Pull Requests analisados recentemente com status de severidade, tempo de análise e ação rápida de drill-down para análise detalhada.

O frontend será uma **SPA com Vite + React + TypeScript**, usando o design system "Obsidian Autonomous Intelligence" definido no projeto Stitch (dark mode, Geist + JetBrains Mono, cor primária `#6366f1`).

## Escopo Funcional

- Criar projeto frontend em `opencode/frontend/` com Vite + React + TypeScript.
- Implementar design system base (`src/styles/tokens.css`): cores, tipografia (Geist, JetBrains Mono), espaçamentos, elevação — conforme design.md do Stitch.
- Implementar componentes:
  - `PRQueueItem` — card de PR na fila com: número do PR, repositório, título, autor, badge de severidade máxima, recomendação, tempo de análise.
  - `SeverityBadge` — badge dual-coded (ícone + label) para CRÍTICO/ALTO/MÉDIO/BAIXO.
  - `StatusChip` — APROVADO / APROVADO_COM_RESSALVAS / REQUER_MUDANCAS.
  - `MetricCard` — card de métrica com número em JetBrains Mono.
  - `Sidebar` — navegação lateral colapsável (240px / 64px).
- Implementar página `DashboardPage`:
  - Header com KPIs: total de PRs analisados, tempo médio de análise, taxa de críticos.
  - Tabela/lista de PRs com paginação.
  - Filtros: por repositório, severidade, status.
  - Link para análise detalhada (rota `/analysis/:id`).
- Implementar `api/client.ts` com fetch tipado consumindo `GET /api/v1/analyses`.
- Configurar roteamento com React Router.

## Requisitos Referenciados

- **F09 (Pós-MVP prep):** Dashboard de métricas — implementado parcialmente no MVP com dados reais.
- **RNF-14:** Rastreabilidade — exibir model_version e timestamp na interface.
- Protótipo Stitch: tela `05a4aa18` "Dashboard & Fila de PRs".

## Non-goals

- Não implementa autenticação/login de usuários.
- Não implementa tela de análise detalhada (CH-08).
- Não implementa gráficos históricos complexos (pós-MVP F09).
- Não implementa WebSocket para atualização em tempo real (polling simples suficiente no MVP).

## Dependências

- **CH-06** (API REST de resultados) concluída — o frontend consome esses endpoints.

## Riscos

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Divergência visual entre implementação e protótipo Stitch | Média | Usar tokens exatos do design.md Stitch; revisão visual side-by-side |
| CORS bloqueando chamadas frontend → FastAPI | Baixa | Configurar `CORSMiddleware` no FastAPI com origins permitidas |

## Execução de Linter

```bash
# No diretório opencode/frontend/
npx tsc --noEmit
npx eslint src --ext .ts,.tsx
```

## Testes Unitários Necessários

- `src/__tests__/components/SeverityBadge.test.tsx` — renderizar cada severidade, verificar ícone + label corretos.
- `src/__tests__/components/StatusChip.test.tsx` — APROVADO, APROVADO_COM_RESSALVAS, REQUER_MUDANCAS.
- `src/__tests__/components/PRQueueItem.test.tsx` — renderizar com fixture de PR, verificar campos exibidos.
- `src/__tests__/api/client.test.ts` — mock fetch, verificar parsing de resposta paginada.

## Testes de Integração Necessários

- `src/__tests__/pages/DashboardPage.test.tsx` — mock do `api/client.ts`, verificar renderização da lista e filtros.

## Testes E2E Necessários

- `tests/e2e/frontend/test_dashboard.spec.ts` (Playwright):
  - `test_dashboard_displays_pr_list_from_api` — subir frontend + API mock server, verificar lista renderizada.
  - `test_severity_badge_correct_for_critical_pr` — verificar badge CRÍTICO visível e com ícone.
  - `test_click_pr_navigates_to_detail` — clicar no PR e verificar navegação para rota `/analysis/:id`.

## Critério de Conclusão

- Todos os testes passam.
- TypeScript sem erros (`tsc --noEmit`).
- Dashboard renderiza corretamente com dados mockados e dados reais da API.
- Revisão visual confirmando alinhamento com protótipo Stitch tela `05a4aa18`.
- Responsivo para desktop (≥ 1440px) e laptop/compact (1024px-1439px).
