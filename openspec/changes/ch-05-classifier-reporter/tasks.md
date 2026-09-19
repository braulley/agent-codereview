## 1. Classificador de Severidade (`core/classifier`)

- [x] 1.1 Implementar modelos de dados em `opencode/src/core/classifier/models.py` (`Issue`, `AnalysisResult`, Enum `Severity`, Enum `ReviewRecommendation`) e verificar tipagem estrita via `mypy opencode/src/core/classifier --strict`
- [x] 1.2 Implementar `SeverityClassifier` em `opencode/src/core/classifier/severity.py` para normalização, priorização por heurísticas (OWASP -> CRÍTICO/ALTO, SOLID -> MÉDIO, Estilo -> BAIXO) e definição de recomendação de review, e verificar com `pytest opencode/tests/unit/core/classifier/test_severity.py`
- [x] 1.3 Criar testes unitários em `opencode/tests/unit/core/classifier/test_severity.py` cobrindo ordenação decrescente de severidade, mapeamento de falha crítica para `REQUER_MUDANCAS` e unicidade de IDs, e verificar cobertura via `pytest --cov=opencode/src/core/classifier --cov-report=term-missing`

## 2. Formatação de Comentários e Sumário (`core/reporter`)

- [x] 2.1 Criar templates Jinja2 `inline_comment.j2` e `summary.j2` no diretório `opencode/src/core/reporter/templates/` formatando badges de severidade e marca d'água do bot, e verificar a renderização de sintaxe markdown válida
- [x] 2.2 Implementar `CommentFormatter` em `opencode/src/core/reporter/formatter.py` com métodos `format_inline_comment` e `format_summary`, e verificar com `pytest opencode/tests/unit/core/reporter/test_formatter.py`
- [x] 2.3 Criar testes unitários em `opencode/tests/unit/core/reporter/test_formatter.py` validando identificação do bot (RNF-14), limite dos top 3 riscos e contagem por severidade, e verificar execução sem falhas via `pytest`

## 3. Publicação de Reviews na API do GitHub (`integrations/github`)

- [x] 3.1 Implementar `GitHubReviewer` em `opencode/src/integrations/github/reviewer.py` agrupando comentários inline e sumário em chamada única `POST /pulls/{pull_number}/reviews`, e verificar integração com cliente HTTP mockado
- [x] 3.2 Criar testes unitários em `opencode/tests/unit/integrations/github/test_reviewer.py` cobrindo mapeamento do evento `REQUEST_CHANGES` vs `COMMENT` e validação do payload enviado, e verificar com `pytest`

## 4. Integração do Orquestrador e Testes E2E

- [x] 4.1 Integrar `SeverityClassifier`, `CommentFormatter` e `GitHubReviewer` no orquestrador `opencode/src/core/analyzer/orchestrator.py` e verificar integração no teste `opencode/tests/integration/test_pipeline_classifier_to_reporter.py`
- [x] 4.2 Criar teste E2E em `opencode/tests/e2e/test_pr_analysis_pipeline.py` validando o ciclo completo (webhook -> fila -> LLM -> classificação -> review no GitHub) e verificar via `pytest` e `mypy opencode/src --strict`
