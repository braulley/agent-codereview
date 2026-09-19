# CH-05 — Classificador de Severidade e Reporter (Inline + Sumário)

**Tipo:** MVP | **Tamanho:** Médio | **Complexidade:** Média | **Risco:** Médio

---

## Descrição

Implementa o classificador de severidade (`core/classifier`) que normaliza e prioriza os problemas brutos retornados pelo LLM em 4 níveis (CRÍTICO, ALTO, MÉDIO, BAIXO), e o reporter (`core/reporter`) que formata os comentários inline e o sumário usando templates Jinja2 e os posta via GitHub Review API. Esta mudança fecha o pipeline de análise MVP (RF-03, RF-04, RF-05, RF-06, RF-07).

## Escopo Funcional

- Implementar `core/classifier/severity.py` (`SeverityClassifier`):
  - `classify(raw_issues: list[RawIssue]) -> list[Issue]`: normaliza severidade para enum `Severity` (CRÍTICO, ALTO, MÉDIO, BAIXO).
  - Regra: se severidade LLM for ambígua, aplica heurísticas por categoria (OWASP → CRÍTICO/ALTO; SOLID → MÉDIO; estilo → BAIXO).
  - Ordena lista de Crítico → Baixo.
  - Se houver ≥ 1 CRÍTICO: define `recommendation = REQUER_MUDANCAS`.
  - Caso contrário: `APROVADO_COM_RESSALVAS` (ALTO/MÉDIO) ou `APROVADO` (apenas BAIXO/vazio).
- Implementar `core/classifier/models.py`: `Issue` (id, file, line, severity: Severity, category, title, description, suggestion, owasp_ref?), `AnalysisResult`.
- Implementar `core/reporter/formatter.py` (`CommentFormatter`):
  - `format_inline_comment(issue: Issue) -> str`: usando template `reporter/templates/inline_comment.j2`.
  - `format_summary(result: AnalysisResult) -> str`: usando template `reporter/templates/summary.j2`.
  - Sumário inclui: contagem por severidade, top 3 riscos, recomendação, identificação do agente (nome, model_version, timestamp) — RF-04.
- Implementar `integrations/github/reviewer.py` (`GitHubReviewer`):
  - `post_review(owner, repo, pull_number, comments, summary, recommendation) -> None`.
  - Agrupa todos os comentários em uma única `POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews` (evita notificação excessiva — RF-03).
  - Mapeia `recommendation` para `event`: `REQUER_MUDANCAS` → `REQUEST_CHANGES`; outros → `COMMENT`.
- Integrar `PRAnalyzer → SeverityClassifier → CommentFormatter → GitHubReviewer` em `core/analyzer/orchestrator.py`.

## Requisitos Referenciados

- **RF-03:** Postagem de comentários inline nas linhas corretas.
- **RF-04:** Sumário com contagem por severidade e recomendação final.
- **RF-05:** Vulnerabilidades críticas bloqueiam aprovação automática.
- **RF-06:** Problemas de qualidade identificados e formatados.
- **RF-07:** Problemas ordenados por severidade.
- **RNF-07:** Nenhum conteúdo de código postado fora do PR (apenas comentários formatados).
- **RNF-14:** Identificação do agente em todos os comentários.
- **RNF-15:** Cobertura ≥ 80% em `core/`.

## Non-goals

- Não implementa GitHub Suggested Changes (sugestão de código em 1 clique) — pós-MVP (F08).
- Não calcula score de risco (pós-MVP — F07/CH-10).
- Não lê `.codereview.yml` (pós-MVP — F06/CH-09).

## Dependências

- **CH-03** (modelos `PRDiff`, `PRFile`) concluída.
- **CH-04** (modelos `RawIssue`, `PRAnalyzer`) concluída.
- **CH-03** integração com `GitHubClient` (para reviewer usar mesmo padrão de auth).

## Riscos

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Mapeamento incorreto de linha do diff para comentário inline | Alta | Fixtures com diffs reais (unified diff format); testes com casos de adição, deleção e contexto |
| Rate limiting GitHub na postagem de reviews | Baixa | Mock em todos os testes; note que GitHub limita a 1 review por hora por bot |
| Templates Jinja2 gerando markdown inválido | Média | Testes de snapshot com saída esperada em fixture |

## Execução de Linter

```bash
ruff check opencode/src/core opencode/src/integrations/github opencode/tests
ruff format --check opencode/src/core opencode/src/integrations/github opencode/tests
mypy opencode/src/core opencode/src/integrations/github --strict
```

## Testes Unitários Necessários

- `tests/unit/core/classifier/test_severity.py`:
  - `test_critical_issue_sets_request_changes` — 1 CRÍTICO → `REQUER_MUDANCAS`.
  - `test_issues_ordered_critical_to_low` — lista desordenada → verifica ordem.
  - `test_approved_when_no_issues` — lista vazia → `APROVADO`.
  - `test_owasp_category_mapped_to_critical` — SQL Injection → CRÍTICO.
  - `test_solid_violation_mapped_to_medium` — violação SOLID → MÉDIO.
  - `test_each_issue_has_unique_id` — verifica que `issue.id` é único por issue.
- `tests/unit/core/reporter/test_formatter.py`:
  - `test_inline_comment_contains_severity_category_description_suggestion` — verificar 4 campos presentes.
  - `test_summary_contains_agent_identification` — nome, model_version, timestamp no sumário.
  - `test_summary_contains_top_3_risks` — com 5 issues, apenas 3 no sumário.
  - `test_summary_displays_count_by_severity` — contagem exata por nível.
- `tests/unit/integrations/github/test_reviewer.py`:
  - `test_posts_single_review_for_multiple_comments` — mock HTTP, verifica 1 chamada à Review API.
  - `test_critical_recommendation_maps_to_request_changes` — `REQUER_MUDANCAS` → `event: REQUEST_CHANGES`.
  - `test_reviewer_includes_agent_attribution_in_body` — corpo do review contém identificação do agente.

## Testes de Integração Necessários

- `tests/integration/test_pipeline_classifier_to_reporter.py`:
  - `test_full_pipeline_raw_issues_to_github_review` — `RawIssue[]` → classificação → formatação → mock GitHub Review API, verificar payload final.

## Testes E2E Necessários

- `tests/e2e/test_pr_analysis_pipeline.py`:
  - `test_complete_pipeline_webhook_to_github_review`:
    - Simular: payload de webhook → fila Redis → worker → mock LLM → mock GitHub API.
    - Verificar: review postada com comentários inline + sumário correto.
    - Verificar: `REQUEST_CHANGES` quando há issue CRÍTICO.
    - Verificar: código do diff não persistido após execução.

## Critério de Conclusão

- Todos os testes (unit, integration, e2e) passam.
- `pytest --cov=opencode/src/core --cov-report=term-missing` ≥ 80% de cobertura em `core/`.
- `ruff check` e `mypy --strict` sem erros.
- Pipeline manual testado: webhook simulado → log confirma análise → mock review postada.
