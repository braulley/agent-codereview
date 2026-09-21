## Purpose

Permite ao backend buscar o unified diff de um Pull Request GitHub ou Merge Request GitLab a partir da URL pública, truncar diffs longos e devolver metadados sem persistir o conteúdo.

## ADDED Requirements

### Requirement: Ingestão de PR GitHub via URL

O sistema SHALL aceitar `POST /api/diff/ingest` com um JSON `{ "url": string }` cuja URL corresponda a um Pull Request público em `github.com` no formato `https://github.com/{owner}/{repo}/pull/{number}` (esquema `https`, `www.` opcional, barra final opcional). Em sucesso o backend MUST responder HTTP 200 com `application/json` contendo todos os campos:

```json
{
  "diff_content": "diff --git a/users.py b/users.py\n...",
  "files_changed": ["users.py", "auth.py"],
  "additions": 42,
  "deletions": 18,
  "platform": "github",
  "pr_number": 123,
  "truncated": false
}
```

`platform` MUST ser o literal `"github"`. `pr_number` MUST ser o inteiro extraído da URL. `files_changed`, `additions` e `deletions` MUST refletir o PR completo na plataforma (não o trecho truncado). Mapeia RF09 CA-RF09-01 e RF01 CA-RF01-04 (p95 < 5s para PRs públicos).

#### Scenario: URL válida de PR GitHub público retorna diff estruturado

- **WHEN** o cliente envia `POST /api/diff/ingest` com `"url": "https://github.com/owner/repo/pull/123"` e a plataforma devolve um PR público
- **THEN** a resposta é HTTP 200 com `platform` igual a `"github"`, `pr_number` igual a `123`, `diff_content` em unified diff, `files_changed` não vazio quando o PR altera arquivos, e `truncated` booleano

### Requirement: Ingestão de MR GitLab via URL

O sistema SHALL aceitar a mesma rota para Merge Requests públicos em `gitlab.com` nos formatos `https://gitlab.com/{namespace}/{project}/-/merge_requests/{iid}` e `https://gitlab.com/{namespace}/{project}/merge_requests/{iid}`, incluindo grupos aninhados no `{namespace}`. Em sucesso MUST responder HTTP 200 com o mesmo schema de sucesso, `platform` igual a `"gitlab"` e `pr_number` igual ao IID numérico. Mapeia RF09 CA-RF09-02.

#### Scenario: URL válida de MR GitLab público retorna diff estruturado

- **WHEN** o cliente envia `POST /api/diff/ingest` com `"url": "https://gitlab.com/group/project/-/merge_requests/45"` e a plataforma devolve um MR público
- **THEN** a resposta é HTTP 200 com `platform` igual a `"gitlab"`, `pr_number` igual a `45` e `diff_content` em unified diff

### Requirement: Rejeição de URL inválida

O sistema SHALL rejeitar URLs que não correspondam aos formatos GitHub PR ou GitLab MR aceitos, inclusive número não numérico (exemplo CT05: `https://github.com/user/repo/pull/abc`), host diferente, Bitbucket, GitHub Enterprise, GitLab self-hosted, e payload sem `url` ou `url` vazio. A resposta MUST ser HTTP 422 com:

```json
{
  "error": "INVALID_PR_URL",
  "message": "A URL fornecida não corresponde a um Pull Request GitHub ou Merge Request GitLab válido.",
  "detail": "Formato esperado: https://github.com/{owner}/{repo}/pull/{number}"
}
```

O backend MUST realizar essa validação antes de qualquer chamada à API da plataforma. CT05 / CA-RF09-03 descrevem validação client-side (C07); este requisito é a defesa em profundidade no servidor (RF09, RNF05).

#### Scenario: Número de PR não numérico retorna 422

- **WHEN** o cliente envia `"url": "https://github.com/user/repo/pull/abc"`
- **THEN** a resposta é HTTP 422 com `error` igual a `"INVALID_PR_URL"` e nenhuma chamada é feita a GitHub ou GitLab

#### Scenario: Host ou formato não suportado retorna 422

- **WHEN** o cliente envia uma URL de Bitbucket, GitHub Enterprise, GitLab self-hosted, ou texto que não é URL de PR/MR
- **THEN** a resposta é HTTP 422 com `error` igual a `"INVALID_PR_URL"`

### Requirement: Truncamento de diffs com mais de 500 linhas

O sistema SHALL contar as linhas de `diff_content` (separadas por `\n`) após obter o unified diff da plataforma. Se a contagem for maior que 500, o backend MUST substituir `diff_content` pelas primeiras 500 linhas e MUST definir `"truncated": true`. Se a contagem for 500 ou menos, MUST definir `"truncated": false` e NÃO alterar o conteúdo. `files_changed`, `additions` e `deletions` MUST permanecer os valores da plataforma para o PR/MR completo. Mapeia CA-RF09-05, CA-RF01-05 e RNF03 (truncar antes da LLM no C05).

#### Scenario: Diff com 501 ou mais linhas é truncado com aviso

- **WHEN** a plataforma devolve um unified diff com 501 ou mais linhas
- **THEN** a resposta 200 contém `diff_content` com exatamente 500 linhas e `"truncated": true`

#### Scenario: Diff com 500 linhas ou menos não é truncado

- **WHEN** a plataforma devolve um unified diff com 500 linhas ou menos
- **THEN** a resposta 200 contém o `diff_content` integral e `"truncated": false`

### Requirement: Recurso privado ou inexistente retorna erro descritivo

Quando a URL é bem formada mas a plataforma responde 401, 403 ou 404 (PR/MR privado sem token, token insuficiente, ou recurso inexistente), o sistema MUST responder HTTP 404 com:

```json
{
  "error": "PR_NOT_FOUND",
  "message": "Pull Request ou Merge Request não encontrado ou inacessível com as credenciais configuradas.",
  "detail": "Verifique se o repositório é público ou se GITHUB_TOKEN / GITLAB_TOKEN está configurado no servidor."
}
```

A resposta MUST NÃO ser HTTP 500. Mapeia CA-RF09-04 e RNF05.

#### Scenario: PR privado sem token não retorna 500

- **WHEN** a URL é válida e a API da plataforma responde 404 (repositório privado sem token)
- **THEN** o backend responde HTTP 404 com `error` igual a `"PR_NOT_FOUND"` e `message` não vazio

### Requirement: Falhas de plataforma mapeadas sem vazar credenciais

O sistema SHALL mapear HTTP 429 da plataforma para HTTP 429 `{ "error": "UPSTREAM_RATE_LIMITED", "message": "...", "detail": "..." }` e falhas de rede, timeout ou 5xx da plataforma para HTTP 502 `{ "error": "UPSTREAM_ERROR", "message": "...", "detail": "..." }`. `message` e `detail` MUST NÃO incluir o valor de `GITHUB_TOKEN`, `GITLAB_TOKEN` nem o corpo do diff.

#### Scenario: Rate limit da plataforma

- **WHEN** GitHub ou GitLab responde 429
- **THEN** o backend responde HTTP 429 com `error` igual a `"UPSTREAM_RATE_LIMITED"`

#### Scenario: Timeout ou 5xx da plataforma

- **WHEN** a chamada à plataforma estoura o timeout do cliente HTTP ou retorna 5xx
- **THEN** o backend responde HTTP 502 com `error` igual a `"UPSTREAM_ERROR"`

### Requirement: Tokens apenas no servidor e conteúdo não persistido

`GITHUB_TOKEN` e `GITLAB_TOKEN` MUST ser lidos exclusivamente da configuração do servidor (variáveis de ambiente). O endpoint MUST NÃO exigir token no body, query string ou header enviado pelo browser. O backend MUST NÃO gravar `diff_content`, patches ou código-fonte em banco, arquivo ou log. Logs JSON em stdout MAY incluir `platform`, `pr_number`, `truncated` e duração em ms. Mapeia RNF03 e ADR-02.

#### Scenario: Ingestão não persiste o diff

- **WHEN** uma ingestão conclui com sucesso ou erro
- **THEN** nenhum handler grava `diff_content` em armazenamento persistente e os logs não contêm o texto do diff nem os valores dos tokens

#### Scenario: Cliente não envia token de plataforma

- **WHEN** o browser chama `POST /api/diff/ingest` apenas com `{ "url": "..." }`
- **THEN** a requisição é aceita sem header de token GitHub/GitLab; se um token existir, ele é aplicado só na chamada servidor→plataforma
