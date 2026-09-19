## 1. Backend Core & Aggregator Implementation

- [ ] 1.1 Implementar `MetricsAggregator` em `opencode/src/core/metrics/aggregator.py` para calcular métricas de resumo, séries temporais e top categorias de problemas a partir da tabela `analysis_results`, e verificar com testes unitários em `opencode/tests/unit/core/metrics/test_aggregator.py`.
- [ ] 1.2 Implementar rotas da API em `opencode/src/api/metrics.py` (`GET /summary`, `GET /trend`, `GET /top-issues`, `GET /export`) e registrar no roteador principal em `opencode/src/main.py`.
- [ ] 1.3 Adicionar testes unitários de endpoints da API de métricas em `opencode/tests/unit/api/test_metrics_endpoints.py` validando estruturas de resposta, códigos de status e headers de exportação CSV.
- [ ] 1.4 Adicionar teste de integração em `opencode/tests/integration/test_metrics_api.py` populando dados sintéticos no SQLite em memória e verificando agregações reais via HTTP client `httpx`.

## 2. Frontend Interface & Components Implementation

- [ ] 2.1 Adicionar funções de chamada de API de métricas em `src/services/api.ts` (ou cliente API do frontend) com tipagem estrita para summary, trend e export CSV.
- [ ] 2.2 Implementar componente de KPI Summary Cards e Tabela de Score de Risco por Repositório em `src/components/metrics/SummaryCards.tsx` e `src/components/metrics/RepoRiskTable.tsx`.
- [ ] 2.3 Implementar gráficos interativos com `recharts` em `src/components/metrics/TrendChart.tsx` (linhas por severidade) e `src/components/metrics/TopIssuesChart.tsx` (barras por categoria).
- [ ] 2.4 Implementar a página `MetricsPage` (`src/pages/MetricsPage.tsx`) integrando os componentes visualmente conforme o protótipo Stitch `0201399c` e adicionando botão para exportação CSV.
- [ ] 2.5 Adicionar testes unitários no frontend em `src/__tests__/pages/MetricsPage.test.tsx` com React Testing Library e Playwright E2E em `tests/e2e/frontend/test_metrics_page.spec.ts`.

## 3. Qualidade, Validação e Linters

- [ ] 3.1 Executar linter `ruff check` e checagem de tipos `mypy --strict` no backend para garantir zero violações e conformidade com RNF-13/RNF-15.
- [ ] 3.2 Executar `npx tsc --noEmit` e `npm test` no frontend para garantir compilação TypeScript limpa e testes de interface passando.
