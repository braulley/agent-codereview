## Purpose

Valida no navegador URLs de Pull Request GitHub e Merge Request GitLab antes de qualquer chamada ao backend, cobrindo CT05, CA-RF01-03 e CA-RF09-03.

## ADDED Requirements

### Requirement: Aceitar apenas URLs canônicas de PR/MR (RF01, RF09)
O frontend SHALL classificar uma string de URL **antes** de qualquer envio a `POST /api/diff/ingest`. Prioridade P0. Ator: Desenvolvedor Solicitante. CTs: **CT05**.

Formatos válidos MUST:

| Plataforma | Padrão |
|---|---|
| GitHub | `https://github.com/{owner}/{repo}/pull/{number}` |
| GitLab | `https://gitlab.com/{group}/{repo}/-/merge_requests/{number}` |

`{number}` MUST ser um inteiro ≥ 1 (somente dígitos). `{owner}`, `{repo}` e `{group}` MUST ser segmentos não vazios. O validador MUST aceitar somente `https`. URLs com número não numérico, path incompleto, outro host ou esquema `http` MUST ser inválidas.

Resultado MUST ser um objeto JSON com `ok` booleano. Em sucesso, MUST incluir `platform` (`github` \| `gitlab`) e os segmentos parseados. Em falha, MUST incluir `error` e `message` descritivos, sem chamar o backend.

Payload de sucesso:

```json
{
  "ok": true,
  "platform": "github",
  "owner": "owner",
  "repo": "repo",
  "number": 123
}
```

Payload de erro (CT05 / envelope alinhado a `docs/spec.md` §5.2):

```json
{
  "ok": false,
  "error": "INVALID_PR_URL",
  "message": "A URL fornecida não corresponde a um Pull Request GitHub ou Merge Request GitLab válido.",
  "detail": "Formato esperado: https://github.com/{owner}/{repo}/pull/{number}"
}
```

#### Scenario: URL GitHub válida é aceita
- **WHEN** a entrada é `https://github.com/owner/repo/pull/123`
- **THEN** o resultado MUST ter `ok: true`, `platform: "github"` e `number: 123`

#### Scenario: URL GitLab válida é aceita
- **WHEN** a entrada é `https://gitlab.com/group/repo/-/merge_requests/45`
- **THEN** o resultado MUST ter `ok: true`, `platform: "gitlab"` e `number: 45`

#### Scenario: Número não numérico é rejeitado antes do envio (CT05, CA-RF01-03, CA-RF09-03)
- **WHEN** a entrada é `https://github.com/user/repo/pull/abc`
- **THEN** o resultado MUST ter `ok: false` e `error: "INVALID_PR_URL"`, e o frontend MUST NOT disparar `POST /api/diff/ingest`

#### Scenario: URL vazia ou host estranho é rejeitada
- **WHEN** a entrada está vazia, é `http://github.com/owner/repo/pull/1`, ou aponta para outro host
- **THEN** o resultado MUST ter `ok: false` e nenhuma requisição de rede MUST ser iniciada
