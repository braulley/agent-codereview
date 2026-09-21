## Context

Motivação e escopo: ver `proposal.md`. Requisitos observáveis: `specs/diff-ingestion/spec.md`.

Estado atual: o scaffold `backend/` ainda não existe neste checkout; C02 cria FastAPI, settings (`GITHUB_TOKEN`, `GITLAB_TOKEN` opcionais) e `GET /api/health`. C04 assume C02 aplicado e adiciona ingestão. Truncamento também alimenta C05 (diff → LLM), mas esta mudança não chama Gemini e não altera `POST /api/analyze` → SSE → Monaco, portanto não mexe em TTFA (RNF02) nem em schema de alerta (RNF01).

Camada afetada: **somente `backend/`** (`api/routes`, `core/analyzer`, `integrations/github`, `integrations/gitlab`). Nenhum componente ou hook de `frontend/`.

## Goals / Non-Goals

**Goals:**

- Pipeline único: parse URL → cliente da plataforma → truncator → JSON 200 / erro envelope.
- Clientes HTTP isolados e mockáveis com `respx`.
- Truncamento e parsing como funções puras em `core/` (cobertura ≥ 80% em `src/core`).
- Tokens só via settings do servidor (RNF03).

**Non-Goals:**

- Não definir UI, toasts ou `pr-url-validator.ts` (C07).
- Não aplicar truncamento dentro do cliente Gemini (C05 consome o `diff_content` já cortado).
- Não paginar além do necessário para montar o diff do MVP (PRs enormes truncam em 500 linhas de qualquer forma).

## Decisions

### D1 — Parse primeiro, depois uma chamada de plataforma

A rota valida o body Pydantic, parseia a URL e só então instancia o cliente GitHub ou GitLab. URL inválida nunca gera I/O. Alternativa (regex na rota sem tipo `ParsedPrUrl`) mistura HTTP com parsing e dificulta testes unitários do CT05.

### D2 — GitHub: media type `diff` + lista de arquivos

Documentação REST: `GET /repos/{owner}/{repo}/pulls/{pull_number}` aceita `Accept: application/vnd.github.diff` para o unified diff; `GET /repos/{owner}/{repo}/pulls/{pull_number}/files` devolve `filename`, `additions`, `deletions`. O handler dispara as duas em paralelo (`httpx.AsyncClient`, timeout 4s) para caber no p95 < 5s (RNF02 / CA-RF01-04). Metadados vêm de `/files` (somatório e nomes), não do diff truncado.

Alternativa (`*.diff` na web) não é API versionada. Alternativa (só `/files[].patch`) omite arquivos grandes; o media type `diff` é a fonte do `diff_content`.

Headers: `User-Agent` obrigatório; `Authorization: Bearer <token>` só se `GITHUB_TOKEN` estiver setado; `X-GitHub-Api-Version: 2022-11-28`.

### D3 — GitLab: `/diffs`, não `/changes`

`GET /projects/:id/merge_requests/:iid/changes` está deprecated (GitLab 15.7). Usar `GET /projects/{urlencoded_path}/merge_requests/{iid}/diffs` (API v4), paginando `per_page=100` até esgotar ou até o truncator já ter material para 500 linhas — ainda assim `additions`/`deletions`/`files_changed` MUST cobrir o MR completo, então a paginação de metadados continua até o fim; o texto concatenado pode parar de crescer depois que o truncator não precisaria de mais linhas. `{id}` é o path URL-encoded (`group%2Fsub%2Fproject`). Token opcional: header `PRIVATE-TOKEN`.

Concatenar o campo `diff` de cada arquivo, prefixando `--- a/{old_path}` / `+++ b/{new_path}` quando o hunk não trouxer cabeçalho git. `files_changed` usa `new_path` (ou `old_path` se deleted).

### D4 — Truncator puro em `core/analyzer`

`truncate_diff(text: str, max_lines: int = 500) -> tuple[str, bool]`: `splitlines()` (sem descartar a última linha vazia de forma a alterar o corte), se `len > 500` retorna `("\n".join(lines[:500]), True)`. Sem I/O, sem log do texto. C05 reutiliza a mesma função se analisar paste longo; C04 é o primeiro consumidor.

### D5 — Envelope de erro único

Exceções de domínio (`InvalidPrUrl`, `PrNotFound`, `UpstreamRateLimited`, `UpstreamError`) mapeadas na rota para o JSON `{error, message, detail?}` de `docs/spec.md`. 401/403/404 da plataforma → 404 `PR_NOT_FOUND` (GitHub mascara privados como 404; não distinguir existência). Timeout/`httpx` 5xx → 502. Sem retry (RF10 é só LLM).

### D6 — `httpx` como cliente

C02 lista `httpx` em extras de teste. C04 promove `httpx` a dependência de runtime se ainda não estiver. Sem SDK GitHub/GitLab (menos superfície e mock direto com `respx`).

### D7 — Layout de módulos

```
backend/src/core/analyzer/pr_url.py          # parse → ParsedPrUrl
backend/src/core/analyzer/diff_truncator.py
backend/src/integrations/github/github_client.py
backend/src/integrations/gitlab/gitlab_client.py
backend/src/api/routes/diff.py               # POST /api/diff/ingest
```

A rota registra-se no `app` do C02. Models Pydantic de request/response na própria rota ou `src/api/schemas/diff.py` — sem camada extra de “service” além do orquestrador mínimo na rota (parse → fetch → truncate → log metadata).

## Risks / Trade-offs

- **[Rate limit GitHub sem token]** → Mitigação: 429 `UPSTREAM_RATE_LIMITED`; documentar token no README (C01/C02). Testes não batem na rede.
- **[GitLab `/diffs` sem cabeçalho `diff --git`]** → Mitigação: D3 prefixa paths; analisador (C05) recebe texto unified suficiente.
- **[Dois round-trips GitHub vs p95 < 5s]** → Mitigação: paralelo + timeout 4s; 502 se estourar.
- **[Prompt injection no diff]** → Truncamento (RNF03) e nenhum log do corpo; sanitização adicional da LLM é C03/C05.
- **[Token no log de exception]** → Catch de `httpx` NÃO interpola headers; `extra` de log só com `platform`, `pr_number`, `truncated`, duração.

## Migration Plan

Endpoint novo; sem dados persistidos. Deploy: subir backend com C02+C04. Rollback: remover a rota e os clientes; C05 volta a aceitar só paste. Nenhuma migration de banco (ADR-02).

## Open Questions

Nenhuma que altere spec, abordagem ou tarefas. Premissas já fechadas: hosts `github.com` / `gitlab.com` apenas; campo `truncated` aditivo em relação ao exemplo de RF09.
