# CH-04 — LLM Gateway e Motor de Análise (Analyzer)

**Tipo:** MVP | **Tamanho:** Médio | **Complexidade:** Média | **Risco:** Médio

---

## Descrição

Implementa o gateway de abstração de LLM (suportando Google Gemini e OpenAI GPT-4 de forma intercambiável) e o motor de análise (`core/analyzer`) que orquestra o envio do diff ao LLM com o prompt estruturado, recebe a lista de problemas e a repassa para o classificador. Esta mudança isola completamente a dependência de provedor de LLM do restante do sistema (RNF-13).

## Escopo Funcional

- Implementar `integrations/llm/gateway.py` (`LLMGateway`):
  - Interface abstrata: `async def analyze_diff(diff: PRDiff, context: str) -> list[RawIssue]`.
  - Implementação `GeminiGateway` (padrão MVP) e stub `OpenAIGateway`.
  - Prompt estruturado em Jinja2 template (`integrations/llm/templates/analysis_prompt.j2`) cobrindo: segurança OWASP Top 10, qualidade (N+1, race conditions, SOLID), performance.
  - Parsing da resposta LLM para `list[RawIssue]` (com tratamento de respostas malformadas).
  - Fallback gracioso: se LLM indisponível, retorna lista vazia com flag `analysis_failed: true` — RF-05 + RNF-05.
- Implementar `integrations/llm/models.py`: `RawIssue` (file, line, severity_raw, category, description, suggestion).
- Implementar `core/analyzer/orchestrator.py` (`PRAnalyzer`):
  - `async def analyze(diff: PRDiff) -> list[RawIssue]`.
  - Chama `LLMGateway.analyze_diff()`.
  - Registra metadados de execução: `request_id`, `pr_id`, `repository`, `model_version`, `timestamp` (RNF-14).
  - NUNCA loga o conteúdo do diff em produção (RNF-07).

## Requisitos Referenciados

- **RF-05:** Detecção de falhas de segurança (OWASP Top 10).
- **RF-06:** Detecção de problemas de qualidade e performance.
- **RNF-01:** Análise em até 3 minutos para diffs ≤ 500 linhas.
- **RNF-05:** Fallback via regras estáticas em caso de falha do LLM.
- **RNF-07:** Código-fonte não persistido; nunca logado.
- **RNF-13:** Troca de provedor LLM sem impacto no `core`.
- **RNF-14:** Logs com metadados rastreáveis.

## Non-goals

- Não implementa classificação de severidade (CH-05).
- Não posta comentários no GitHub (CH-06).
- Não calibra o prompt — calibração é uma tarefa contínua pós-deploy.
- Não suporta `.codereview.yml` customizado (pós-MVP, CH-09).

## Dependências

- **CH-01** (settings, estrutura base) concluída.
- **CH-03** (modelos `PRDiff` de GitHub Client) concluída — o analyzer consome `PRDiff`.

## Riscos

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Resposta LLM com JSON malformado | Alta | Parser defensivo com `try/except`; log de warning; retornar lista parcial |
| Custo elevado da API LLM em testes | Alta | Nunca chamar API real nos testes — mockar `GeminiGateway` |
| Vazamento do `GEMINI_API_KEY` em logs | Média | Checar explicitamente no review que headers de auth nunca são logados |
| Latência LLM > 3min para diffs grandes | Média | Timeout configurável via settings; fallback ativado após timeout |

## Execução de Linter

```bash
ruff check opencode/src/integrations/llm opencode/src/core/analyzer opencode/tests
ruff format --check opencode/src/integrations/llm opencode/src/core/analyzer opencode/tests
mypy opencode/src/integrations/llm opencode/src/core/analyzer --strict
```

## Testes Unitários Necessários

- `tests/unit/integrations/llm/test_gateway.py`:
  - `test_gemini_gateway_returns_raw_issue_list` — mock cliente Gemini, verificar parsing.
  - `test_gateway_handles_malformed_llm_response` — resposta JSON inválida → lista vazia + log.
  - `test_gateway_activates_fallback_on_llm_unavailable` — simular exceção de rede → `analysis_failed: true`.
  - `test_openai_gateway_stub_not_called_by_default` — verificar que implementação padrão é Gemini.
- `tests/unit/core/analyzer/test_orchestrator.py`:
  - `test_analyzer_calls_llm_gateway_once` — mock gateway, verifica 1 chamada.
  - `test_analyzer_logs_required_metadata` — capturar logs, verificar `request_id`, `pr_id`, `model_version`, `timestamp`.
  - `test_analyzer_never_logs_diff_content` — verificar ausência do conteúdo do diff nos logs.
  - `test_prompt_template_renders_correctly` — renderizar template Jinja2 com PRDiff fixture.
  - `test_owasp_categories_covered_in_prompt` — verificar que SQL Injection, XSS, IDOR, Broken Access Control, Secrets estão no prompt.

## Testes de Integração Necessários

- `tests/integration/test_analyzer_to_llm.py`:
  - `test_analyzer_end_to_end_with_mocked_llm` — usando mock do LLM gateway com resposta estruturada realista, verificar que `list[RawIssue]` é retornada corretamente sem chamada real à API.

## Testes E2E Necessários

- Nenhum nesta mudança.

## Critério de Conclusão

- Todos os testes passam.
- `ruff check` e `mypy --strict` sem erros.
- `GEMINI_API_KEY` nunca aparece em logs (verificação manual).
- Conteúdo do diff nunca aparece em logs (verificação manual).
- Template de prompt cobre todos os casos OWASP Top 10 (verificação de revisão do template).
