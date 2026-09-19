# CH-06 — API REST de Resultados e Persistência de Metadados

**Tipo:** MVP | **Tamanho:** Médio | **Complexidade:** Média | **Risco:** Baixo

---

## Descrição

Implementa a camada de persistência de **metadados de resultado** (nunca o código-fonte) e os endpoints REST que o frontend consumirá: listagem de PRs analisados, detalhes de uma análise, e status de saúde do sistema. Esta mudança alimenta as telas "Dashboard & Fila de PRs" e "Análise Detalhada do PR #42" do protótipo Stitch.

> **Nota de privacidade:** Apenas metadados são persistidos (pr_id, repo, severidades, contagens, recommendation, timestamps, model_version). Nenhum conteúdo de diff ou código é armazenado permanentemente.

## Escopo Funcional

- Implementar `config/database.py`: conexão com SQLite (via `aiosqlite` + SQLAlchemy async) para metadados locais no MVP. Schema: tabela `analysis_results` (id, pr_id, repository, analyzed_at, model_version, total_issues, by_severity_json, recommendation, duration_ms).
- Implementar `core/analyzer/repository.py` (`AnalysisRepository`):
  - `save_result(result: AnalysisResult) -> None`.
  - `get_result(analysis_id: str) -> AnalysisResult | None`.
  - `list_results(repo: str | None, page: int, limit: int) -> list[AnalysisResult]`.
- Implementar `api/results.py` com endpoints:
  - `GET /api/v1/analyses` — lista análises recentes (paginação, filtro por repositório).
  - `GET /api/v1/analyses/{analysis_id}` — detalhes de uma análise (issues por severidade).
  - `GET /api/v1/analyses/{analysis_id}/issues` — lista de issues da análise.
- Atualizar `core/analyzer/orchestrator.py` para persistir resultado via `AnalysisRepository` após análise completa.
- Atualizar `GET /health` para incluir status de conectividade: Redis, DB.

## Requisitos Referenciados

- **RF-04:** Sumário de revisão rastreável com identificador único, data/hora, model_version.
- **RNF-07:** Somente metadados de resultado são retidos (código-fonte nunca persistido).
- **RNF-14:** Rastreabilidade de todas as análises com identificador único.
- **F09 (Pós-MVP):** Preparação da base para o Dashboard de Métricas.

## Protótipos Stitch Referenciados

- **"Dashboard & Fila de PRs"** (`05a4aa18`) — lista de PRs analisados, status, severidade.
- **"Análise Detalhada do PR #42"** (`9fa4b0e8`) — issues por severidade, comentários inline, sumário.

## Non-goals

- Não implementa autenticação de usuários na API REST (pós-MVP).
- Não usa PostgreSQL (SQLite suficiente para MVP; migração em CH-10).
- Não exporta CSV/PDF (pós-MVP — F09).
- Não implementa WebSocket para updates em tempo real.

## Dependências

- **CH-01** (settings, estrutura base) concluída.
- **CH-05** (modelos `AnalysisResult`, `Issue`) concluídos — o repositório salva esses dados.

## Riscos

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Persistir acidentalmente conteúdo de diff no banco | Média | Code review obrigatório no schema e nos mappers; teste explícito de que diff não está no DB |
| Migrações SQLite conflitando em Windows | Baixa | Usar `aiosqlite` com criação declarativa; sem Alembic no MVP (schema simples) |

## Execução de Linter

```bash
ruff check opencode/src/api opencode/src/core/analyzer opencode/src/config opencode/tests
ruff format --check opencode/src/api opencode/src/core/analyzer opencode/src/config opencode/tests
mypy opencode/src/api opencode/src/core/analyzer opencode/src/config --strict
```

## Testes Unitários Necessários

- `tests/unit/core/analyzer/test_repository.py`:
  - `test_save_and_get_result_roundtrip` — salvar e recuperar por ID.
  - `test_list_results_with_repo_filter` — verificar filtro por repositório.
  - `test_diff_content_not_persisted` — verificar que campos de diff não existem no schema.
- `tests/unit/api/test_results_endpoints.py`:
  - `test_get_analyses_returns_paginated_list` — mock repository.
  - `test_get_analysis_detail_returns_issues` — mock repository com issues por severidade.
  - `test_get_analysis_not_found_returns_404` — ID inexistente.
  - `test_health_endpoint_includes_db_and_redis_status` — mock de conectividade.

## Testes de Integração Necessários

- `tests/integration/test_results_api.py`:
  - `test_analysis_persisted_and_retrieved_via_api` — usando SQLite em memória + httpx, verificar ciclo completo save→GET.

## Testes E2E Necessários

- Nenhum nesta mudança (E2E de pipeline já coberto em CH-05).

## Critério de Conclusão

- Todos os testes passam.
- `ruff check` e `mypy --strict` sem erros.
- `GET /api/v1/analyses` retorna lista com paginação funcional.
- Verificação manual: após análise completa, metadados aparecem na API; conteúdo de diff não aparece.
