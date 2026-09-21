## 1. Setup (depende de C02 aplicado)

- [x] 1.1 Confirmar o skeleton C02 (`backend/src/config/settings.py` com `GEMINI_API_KEY`, pacotes `core/` e `integrations/llm/`). Se C02 não estiver aplicado, parar e aplicar C02 antes. Verificar: os diretórios `backend/src/core/{analyzer,validator,scorer}` e `backend/src/integrations/llm` existem com `__init__.py`.
- [x] 1.2 Adicionar `google-genai` em `backend/pyproject.toml` (extras `[dev]` já com `pytest`, `pytest-cov`, `respx`, `mypy`, `ruff`). Verificar: `pip install -e ".[dev]"` no venv do backend termina com exit 0 e `python -c "from google import genai"` funciona. Não adicionar o pacote ao frontend.

## 2. Contrato Pydantic `alert-schema`

- [x] 2.1 Implementar `backend/src/core/validator/alert_schema.py` com `AlertDraft` (sem `id`), `AlertItem` (UUID v4, `Field(ge=1)`, `title` max 120, `Literal` de severity/category, `@model_validator(mode="after")` para `line_end >= line_start`) e envelope `AnalysisLlmResponse` (`alerts: list[AlertDraft]`). Verificar: `mypy --strict` aceita o módulo.
- [x] 2.2 Testes unitários em `backend/tests/unit/test_alert_schema.py`: alerta válido parseia; severity inválida falha; campo obrigatório ausente falha; `line_start`/`line_end` < 1 falha; `line_end < line_start` falha; `title` > 120 falha; `id` inválido em `AlertItem` falha. Verificar: `pytest -q tests/unit/test_alert_schema.py` exit 0.

## 3. Code Health Score

- [x] 3.1 Implementar função pura em `backend/src/core/scorer/health_score.py`: `max(0, 100 - (CRITICAL*25 + HIGH*10 + MEDIUM*3 + LOW*1))` e `alert_count` com as quatro chaves. Verificar: import do módulo sem I/O.
- [x] 3.2 Testes unitários em `backend/tests/unit/test_health_score.py`: lista vazia → 100 e counts 0 (CT03 / CA-RF06-03); 1 CRITICAL → 75; 1C+2H+1M+3L → 49; ≥4 CRITICAL → 0 (CA-RF06-02). Verificar: `pytest -q tests/unit/test_health_score.py` exit 0.

## 4. Cliente Gemini e prompt (depende de 1.2 e 2.1)

- [x] 4.1 Implementar `backend/src/integrations/llm/gemini_client.py`: `Client` com API key só de settings; `aio.models.generate_content` em `gemini-2.5-flash`; `GenerateContentConfig` com `response_mime_type="application/json"`, `response_schema=AnalysisLlmResponse`, `temperature=0`, `system_instruction`. Verificar: teste unitário com `unittest.mock` do SDK mostra que **toda** chamada passa `response_schema` e MIME JSON (RNF01).
- [x] 4.2 Implementar `backend/src/integrations/llm/prompts.py` (OWASP Top 10, enums em inglês, `suggestion` drop-in, lista vazia para código limpo, fonte tratado como dados). Verificar: o prompt é string estática importável e não interpola a API key.
- [x] 4.3 Calibração de prompt + fixtures (obrigatório para código LLM): `backend/tests/fixtures/ct01_sql_injection.json`, `ct02_hardcoded_secret.json`, `ct03_clean.json` no envelope `{ "alerts": [...] }` sem `id`, alinhados a CT01–CT03 e válidos em `AlertDraft`. Verificar: fixture CT01/CT02 têm `CRITICAL`+`SECURITY`; CT03 tem `alerts: []`; `AlertDraft.model_validate` passa em cada item.
- [x] 4.4 Teste do wrapper (mock do `Client`, sem rede): JSON válido devolve texto/parsed; falha de SDK mapeável. Verificar: `pytest -q tests/unit/test_gemini_client.py` exit 0 e nenhuma chamada real.

## 5. Orquestrador (depende de 2–4)

- [x] 5.1 Implementar `backend/src/core/analyzer/orchestrator.py`: cap 500 linhas antes do `contents`; `asyncio.wait_for` 30s; gerar `analysis_id`; atribuir `uuid4` por alerta; `AlertItem.model_validate` antes de cada yield; sequência `alert*` → `score` → `done`; erros `LlmTimeoutError` / `LlmApiError` / `LlmSchemaError`; log `analysis_done` com `tokens_used` e `analysis_duration_ms`. Verificar: módulo exporta `analyze(...)` como async generator.
- [x] 5.2 Testes unitários em `backend/tests/unit/test_orchestrator.py` com `unittest.mock` do cliente: yield de alertas válidos + score + done; JSON ilegível → `LlmSchemaError` sem `alert` e log sem fonte (CA-RF02-02); item inválido skipped + score só dos válidos; timeout 30s → `LlmTimeoutError` (CT04); API down → `LlmApiError`; 501 linhas → cliente recebe ≤500 e log sem corpo (RNF03); sucesso loga metadados sem `GEMINI_API_KEY`/`suggestion`. Verificar: `pytest -q tests/unit/test_orchestrator.py` exit 0.
- [x] 5.3 Testes de integração em `backend/tests/integration/test_llm_orchestration.py` (cliente mockado, fixtures 4.3): CT01 SQL Injection → um `alert` CRITICAL/SECURITY; CT02 secret → CRITICAL/SECURITY; CT03 clean → zero `alert`, score 100, `done` completed. Verificar: `pytest -q tests/integration/test_llm_orchestration.py` exit 0.

## 6. Qualidade (depende de 2–5)

- [x] 6.1 Rodar `cd backend && ruff check src tests --fix --select E,W,F && ruff format src tests && mypy --strict src && pytest -q --cov=src/core --cov-fail-under=80` e obter exit 0 em todos. Cobertura `src/core/` ≥ 80%. Confirmar com grep nos testes/logs de fixture que `GEMINI_API_KEY` não aparece em output capturado.
