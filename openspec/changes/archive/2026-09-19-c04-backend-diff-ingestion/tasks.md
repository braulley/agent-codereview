## 1. Setup (depende de C02 aplicado)

- [x] 1.1 Confirmar que `backend/` do C02 existe (`src/main.py`, settings com `GITHUB_TOKEN`/`GITLAB_TOKEN` opcionais) e promover `httpx` a dependência de runtime em `backend/pyproject.toml` se ainda estiver só em `[dev]`; verificar com `pip install -e ".[dev]"` sem erro
- [x] 1.2 Criar pacotes vazios e exceções de domínio (`InvalidPrUrl`, `PrNotFound`, `UpstreamRateLimited`, `UpstreamError`) nos módulos de `design.md` D7; verificar que `python -c "from src.core.analyzer import pr_url"` (ou import equivalente) funciona após os arquivos existirem

## 2. Parser de URL (D1)

- [x] 2.1 Implementar `parse_pr_url` em `backend/src/core/analyzer/pr_url.py` (GitHub `github.com/{owner}/{repo}/pull/{n}` com `www.` e barra final opcionais; GitLab com e sem `/-/`, grupos aninhados; rejeitar host/enterprise/self-hosted e número não numérico); verificar com os testes da 2.2
- [x] 2.2 Testes unitários em `backend/tests/unit/test_pr_url.py`: GitHub válido, GitLab válido (simples e nested), `pull/abc` (CT05), Bitbucket, URL vazia — todos sem I/O; `pytest -q tests/unit/test_pr_url.py` exit 0

## 3. Truncator (D4)

- [x] 3.1 Implementar `truncate_diff(text, max_lines=500)` em `backend/src/core/analyzer/diff_truncator.py`; verificar com os testes da 3.2 (CA-RF01-05, CA-RF09-05)
- [x] 3.2 Testes unitários em `backend/tests/unit/test_diff_truncator.py`: 500 linhas → não trunca / `truncated=False`; 501 → 500 linhas e `True`; string vazia; verificar `pytest -q tests/unit/test_diff_truncator.py` exit 0

## 4. Cliente GitHub (D2) — depende de 1 e 2

- [x] 4.1 Implementar `github_client` (`GET /repos/{owner}/{repo}/pulls/{n}` com `Accept: application/vnd.github.diff` + `GET .../files` em paralelo, timeout 4s, `Bearer` só se settings tiver token, mapear 401/403/404 → `PrNotFound`, 429 → `UpstreamRateLimited`, timeout/5xx → `UpstreamError`); verificar com 4.2
- [x] 4.2 Testes unitários com `respx` em `backend/tests/unit/test_github_client.py`: 200 + files; 404 privado; 429; timeout; assertiva de que o mock recebeu `Authorization` só quando o token existe; `pytest -q tests/unit/test_github_client.py` exit 0 e zero chamadas reais

## 5. Cliente GitLab (D3) — depende de 1 e 2

- [x] 5.1 Implementar `gitlab_client` (`GET /api/v4/projects/{urlencoded}/merge_requests/{iid}/diffs`, paginação `per_page=100`, prefixo `--- a/` `+++ b/` se faltar, `PRIVATE-TOKEN` opcional, mesmo mapeamento de erros que o GitHub); verificar com 5.2
- [x] 5.2 Testes unitários com `respx` em `backend/tests/unit/test_gitlab_client.py`: MR simples; grupo aninhado (path encoded); 404; página 2 de diffs; `pytest -q tests/unit/test_gitlab_client.py` exit 0

## 6. Rota `POST /api/diff/ingest` — depende de 2, 3, 4 e 5

- [x] 6.1 Implementar schemas Pydantic request/response e `backend/src/api/routes/diff.py`: parse → fetch → `truncate_diff` → 200 com `truncated`; exceções → envelope `{error, message, detail?}`; log JSON só com `platform`, `pr_number`, `truncated`, duração (RNF03); registrar o router no app C02; verificar com 6.2
- [x] 6.2 Testes de integração com `respx` em `backend/tests/integration/test_diff_ingest_endpoint.py`: GitHub 200 (CA-RF09-01); GitLab 200 (CA-RF09-02); `pull/abc` → 422 sem request mock (CT05/CA-RF09-03 defesa); privado 404 `PR_NOT_FOUND` não 500 (CA-RF09-04); diff 501 linhas → `truncated: true` e metadados do PR completo (CA-RF09-05); 429 e timeout; capturar logs e assertir ausência de `diff_content` e tokens; `pytest -q tests/integration/test_diff_ingest_endpoint.py` exit 0

## 7. Qualidade

- [x] 7.1 `cd backend && ruff check src tests --fix --select E,W,F && ruff format src tests && mypy --strict src` exit 0
- [x] 7.2 `cd backend && pytest -q --cov=src/core --cov-fail-under=80` exit 0 (parser + truncator em `src/core`)
- [x] 7.3 Grep nos handlers e fixtures de log: nenhuma interpolação de `diff_content`, `GITHUB_TOKEN` ou `GITLAB_TOKEN`; confirmar que o endpoint não lê token do body/query/header do browser
