## Why

RF09 (P1) e F09 exigem a terceira modalidade de RF01: o desenvolvedor cola a URL de um PR GitHub ou MR GitLab e o backend devolve o unified diff. Sem `POST /api/diff/ingest`, essa entrada não existe e o truncamento de CA-RF01-05 / RNF03 não tem ponto de aplicação antes da LLM (C05). C02 já carrega `GITHUB_TOKEN` e `GITLAB_TOKEN` opcionais no servidor.

## What Changes

- Novo endpoint `POST /api/diff/ingest` conforme `docs/spec.md` §5.2 / RF09.
- Parser de URL para `github.com/{owner}/{repo}/pull/{n}` e `gitlab.com/{namespace}/[-/]merge_requests/{iid}` (grupos aninhados). URL inválida → HTTP 422 `INVALID_PR_URL` (defesa em profundidade; CT05 / CA-RF09-03 no cliente pertencem ao C07).
- Clientes GitHub REST API v3 e GitLab API v4 para PRs/MRs públicos. Tokens só no env do servidor (RNF03); ausentes, apenas recursos públicos.
- Truncamento de diffs com mais de 500 linhas no backend e aviso ao cliente via campo aditivo `"truncated": true` (CA-RF09-05, CA-RF01-05, RNF03). O exemplo de RF09 omite o campo; a extensão não quebra o contrato.
- PR/MR privado ou inexistente sem token → 4xx descritivo, nunca 500 (CA-RF09-04).
- Nenhuma persistência de `diff_content` (ADR-02, RNF03).

### Non-goals (MVP)

- Análise LLM do diff (C03 / C05).
- Validação client-side da URL, toast ou carga no Monaco (C07).
- Bitbucket, GitHub Enterprise, GitLab self-hosted, OAuth de usuário.
- Autenticação além do token opcional de ambiente (PRs privados corporativos = v1.1 / pós-MVP).
- Banco, fila, cache ou retry de plataforma (RF10 cobre só a LLM).

## Capabilities

### New Capabilities

- `diff-ingestion`: ingestão de unified diff via URL de PR/MR público, truncamento em 500 linhas e erros descritivos sem persistir conteúdo.

### Modified Capabilities

- (nenhuma — `openspec/specs` ainda não tem capacidades arquivadas)

## Impact

- **Camada:** apenas `backend/` — `integrations/github`, `integrations/gitlab`, truncator em `core/analyzer`, rota em `api/routes`. Frontend não entra.
- **API:** cria `POST /api/diff/ingest`. Não altera `POST /api/analyze` nem o fluxo SSE; RNF02 (TTFA) não é impactado. Target de ingestão: < 5s p95 (RNF02 / CA-RF01-04).
- **Dependências:** `httpx` como runtime se C02 não o promoveu de `[dev]`; testes com `respx` (zero chamadas reais a GitHub/GitLab).
- **Segurança / privacidade (RNF03):** `GITHUB_TOKEN` e `GITLAB_TOKEN` nunca no bundle client-side; logs JSON podem registrar `platform`, `pr_number`, `truncated` e latência — nunca `diff_content`, tokens ou o código do PR.
- **Bloqueia:** C05 (diff truncado antes da LLM) e C07 (modo URL).
- **Depende de:** C02 (FastAPI, settings, health, pacotes).
