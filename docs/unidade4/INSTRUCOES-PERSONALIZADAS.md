# Instruções personalizadas — Agent Code Review (Unidade 4)

Arquivo de custom instructions **específicas deste repositório**. Cada regra abaixo é verificável por grep, teste ou comando de qualidade. Não substitui `AGENTS.md`; é o recorte usado na Parte 2 da atividade.

## R1 — Fórmula de score é da spec, não do “código de hoje”

Qualquer função ou teste que calcule Code Health Score **deve** usar:

```text
max(0, 100 - (CRITICAL×25 + HIGH×10 + MEDIUM×3 + LOW×1))
```

Proibido: `assert score == compute_health_score(x)["code_health_score"]` (tautologia).  
Proibido: `100 - 25*n` sem `max(0, …)` (mascara score negativo).  
Verificação: `pytest backend/tests/unit/test_health_score.py -q` e leitura de `docs/spec.md` RF06.

## R2 — Gemini e tokens só no servidor FastAPI

Sugestões de código **não podem**:

- importar `google.genai` / `@google/generative-ai` no `frontend/`;
- usar `NEXT_PUBLIC_GEMINI_API_KEY` ou qualquer `GEMINI_*` no bundle client;
- persistir o snippet/diff em SQLite, Postgres, Redis ou arquivo.

O caminho permitido é `POST /api/analyze` (SSE). Prefixos: `/api/*` **sem** `/v1`.  
Verificação: `rg "google.genai|NEXT_PUBLIC_GEMINI" frontend` deve ser vazio; Compose sem SGBD.

## R3 — Dependência HTTP é `httpx`; erros de URL são exceções tipadas

Clientes GitHub/GitLab e qualquer fetch de PR **devem** usar `httpx` (não `requests`).  
URL inválida **deve** levantar `InvalidPrUrl` — nunca retornar `None` nem `{"ok": false}`.  
Testes de rede **devem** usar `respx` / `unittest.mock`; é proibido chamar api.github.com de verdade.  
Verificação: `rg "import requests" backend/src` vazio; `pytest backend/tests/unit/test_pr_url.py backend/tests/unit/test_github_client.py -q`.

## R4 — Tipagem e logging (extra, testável)

Funções novas em `backend/src/core` levam type hints em parâmetros e retorno (`mypy --strict src`).  
Logs de análise só podem carregar `analysis_id`, `tokens_used`, `analysis_duration_ms` — nunca o corpo do código, o diff, nem `GEMINI_API_KEY`.  
Verificação: `mypy --strict src`; testes de orchestrator que assertam ausência do source no log.
