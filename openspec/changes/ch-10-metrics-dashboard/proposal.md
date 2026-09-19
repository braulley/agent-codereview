# CH-10 — Dashboard de Métricas & Analytics de Qualidade (Pós-MVP)

**Tipo:** Pós-MVP | **Tamanho:** Médio | **Complexidade:** Média | **Risco:** Baixo

---

## Descrição

Implementa o painel de métricas e analytics de qualidade para Tech Leads, conforme o protótipo Stitch tela `0201399c` "Métricas & Analytics de Qualidade". Exibe tendências de qualidade do codebase ao longo do tempo: PRs analisados, tempo médio de análise, problemas mais recorrentes, evolução do Lead Time, e score de risco por repositório (F09). Também adiciona exportação CSV dos dados.

## Escopo Funcional

- Implementar `api/metrics.py` com endpoints de analytics:
  - `GET /api/v1/metrics/summary` — resumo agregado: total PRs, tempo médio, % por severidade.
  - `GET /api/v1/metrics/trend?repo=&days=30` — série temporal de issues por severidade.
  - `GET /api/v1/metrics/top-issues?limit=10` — categorias de problemas mais recorrentes.
  - `GET /api/v1/metrics/export?format=csv` — exportação CSV (F09 critério de aceite).
- Implementar `core/metrics/aggregator.py` (`MetricsAggregator`):
  - Agrega dados da tabela `analysis_results` do banco SQLite.
  - Calcula: médias, percentuais, tendências (delta vs. período anterior).
- Implementar frontend — página `MetricsPage` (`/metrics`):
  - KPI cards: total de PRs, tempo médio (p50/p95), taxa de críticos, NPS proxy.
  - Gráfico de linha: evolução de issues por severidade (últimos 30/60/90 dias) — usando `recharts`.
  - Gráfico de barras: top 10 categorias de problema mais recorrentes.
  - Tabela: PRs por repositório com score de risco (0-100) — preparação para RF-09.
  - Botão de exportação CSV.
  - Alinhado ao protótipo Stitch tela `0201399c`.

## Requisitos Referenciados

- **F09 (Pós-MVP):** Dashboard de Métricas e Qualidade — métricas, trends, exportação CSV/PDF.
- **F07 (Pós-MVP prep):** Score de risco (exibido na tabela, calculado de forma simplificada).
- **RNF-14:** Rastreabilidade de todas as análises nos relatórios.

## Non-goals

- Não implementa exportação PDF (apenas CSV no MVP desta mudança).
- Não implementa alertas automáticos por email/Slack para degradação de qualidade.
- Não implementa score de risco com ML completo (F07 — versão simplificada: score baseado em contagem de issues ponderada por severidade).
- Não migra de SQLite para PostgreSQL (infra de escala — mudança separada).

## Dependências

- **CH-06** (API de resultados, tabela `analysis_results`) concluída.
- **CH-07** (Frontend base, componentes, Sidebar) concluído.
- Dados suficientes na `analysis_results` para métricas (≥ 10 análises para visualização útil).

## Riscos

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Consultas SQLite lentas com muitos registros | Baixa | Índice em `analyzed_at` e `repository`; limit de 1000 registros por query |
| Gráficos sem dados em ambiente novo | Baixa | Seed de dados de exemplo para desenvolvimento; UI com estado vazio elegante |

## Execução de Linter

```bash
ruff check opencode/src/api/metrics.py opencode/src/core/metrics opencode/tests
ruff format --check opencode/src opencode/tests
mypy opencode/src/api/metrics.py opencode/src/core/metrics --strict
npx tsc --noEmit  # frontend
```

## Testes Unitários Necessários

- `tests/unit/core/metrics/test_aggregator.py`:
  - `test_summary_aggregation_correct` — fixture com 10 análises, verificar médias e percentuais.
  - `test_trend_returns_correct_time_series` — série temporal com dados de 30 dias.
  - `test_top_issues_sorted_by_frequency` — top 10 categorias em ordem decrescente.
- `tests/unit/api/test_metrics_endpoints.py`:
  - `test_summary_endpoint_returns_expected_structure` — mock aggregator.
  - `test_trend_endpoint_with_repo_filter` — filtro por repositório.
  - `test_export_csv_returns_correct_headers` — verificar Content-Type e colunas.
- `src/__tests__/pages/MetricsPage.test.tsx` — mock api/client, verificar renderização de KPIs e gráficos.

## Testes de Integração Necessários

- `tests/integration/test_metrics_api.py`:
  - `test_metrics_aggregate_from_real_analysis_results` — inserir análises no SQLite em memória, verificar endpoints de métricas.

## Testes E2E Necessários

- `tests/e2e/frontend/test_metrics_page.spec.ts` (Playwright):
  - `test_metrics_page_displays_kpi_cards` — verificar valores renderizados.
  - `test_export_csv_download_triggered` — clicar em exportar e verificar download.

## Critério de Conclusão

- Todos os testes passam.
- `ruff check`, `mypy --strict` e `tsc --noEmit` sem erros.
- Exportação CSV com dados reais funcional.
- Revisão visual contra protótipo Stitch tela `0201399c`.
- Gráficos exibem dados históricos com dados de seed.
