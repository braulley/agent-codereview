## Purpose

Define o processo HTTP do backend: configuração por ambiente, health check, logging estruturado e envelope de erro, sem persistir código ou expor chaves (RNF03).

## ADDED Requirements

### Requirement: Health check reports process status

O sistema SHALL expor `GET /api/health` (MVP sem versionamento de URL) e MUST responder `200` com `Content-Type: application/json` contendo exatamente os campos `status`, `version`, `gemini_api` e `timestamp`. Mapeia `docs/spec.md` §5.3. Ator: operador / frontend / orquestrador. Prioridade: P0. CTs CT01–CT08: não aplicáveis (nenhum código de usuário é analisado).

Contrato de resposta:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "gemini_api": "reachable",
  "timestamp": "2026-09-19T16:00:00Z"
}
```

- `status` MUST ser `"healthy"` quando o processo aceita HTTP.
- `version` MUST corresponder à versão do pacote da aplicação (`1.0.0` no MVP).
- `gemini_api` MUST ser `"reachable"` ou `"unreachable"`.
- `timestamp` MUST ser ISO-8601 em UTC.

Nesta capacidade, `gemini_api` MUST ser `"reachable"` se e somente se `GEMINI_API_KEY` estiver configurada no processo; MUST NOT realizar probe de rede à Gemini API.

#### Scenario: Health check succeeds on a running process

- **WHEN** um cliente envia `GET /api/health` a um processo já iniciado com `GEMINI_API_KEY` definida
- **THEN** a resposta é HTTP 200 com JSON contendo `status` igual a `"healthy"`, `version` não vazio, `gemini_api` igual a `"reachable"` e `timestamp` em ISO-8601 UTC

#### Scenario: Health response never includes secrets

- **WHEN** um cliente envia `GET /api/health`
- **THEN** o corpo MUST NOT conter os nomes ou valores de `GEMINI_API_KEY`, `GITHUB_TOKEN` ou `GITLAB_TOKEN`

### Requirement: Server loads secrets only from environment

O sistema MUST carregar `GEMINI_API_KEY` (obrigatória), `GITHUB_TOKEN` (opcional) e `GITLAB_TOKEN` (opcional) exclusivamente de variáveis de ambiente do servidor. O processo MUST recusar iniciar se `GEMINI_API_KEY` estiver ausente ou vazia. Tokens opcionais ausentes MUST ser tratados como não configurados, sem falha de boot. Mapeia RNF03. CT01–CT08: não aplicáveis.

#### Scenario: Missing Gemini key prevents bind

- **WHEN** o processo é iniciado sem `GEMINI_API_KEY` no ambiente
- **THEN** o processo MUST falhar na inicialização e MUST NOT escutar a porta HTTP

#### Scenario: Optional tokens may be absent

- **WHEN** o processo é iniciado com `GEMINI_API_KEY` definida e sem `GITHUB_TOKEN` nem `GITLAB_TOKEN`
- **THEN** o processo MUST iniciar com sucesso e `GET /api/health` MUST retornar 200

### Requirement: Structured logs omit secrets and source

O sistema MUST emitir logs em JSON para stdout. Cada registro estruturado MUST poder incluir campos de telemetria (`analysis_id`, `tokens_used`, `analysis_duration_ms`) quando a análise existir; nesta capacidade, requisições HTTP MUST gerar pelo menos método, caminho e status. Logs MUST NOT conter código-fonte, diffs, `GEMINI_API_KEY`, `GITHUB_TOKEN` ou `GITLAB_TOKEN`. Mapeia `docs/architecture.md` (observabilidade) e RNF03.

#### Scenario: Request log is JSON without secrets

- **WHEN** um cliente chama `GET /api/health`
- **THEN** o processo escreve em stdout um objeto JSON com o caminho `/api/health` e MUST NOT incluir valores de chaves de API

### Requirement: HTTP errors use a stable JSON envelope

Erros HTTP da API MUST usar JSON com `error` (código de máquina), `message` (texto amigável) e `detail` opcional. Mapeia `docs/architecture.md` (contrato de API) e prepara RF10 / RNF05. Não altera CT04 nesta mudança.

#### Scenario: Unhandled error returns envelope

- **WHEN** uma rota registrada levanta uma exceção não tratada
- **THEN** a resposta MUST ser JSON com `error` e `message` e MUST NOT incluir valores de chaves de API

### Requirement: Backend remains stateless

O processo MUST NOT persistir corpos de requisição, diffs ou código em banco, arquivo ou cache. Nenhuma rota desta capacidade aceita código de usuário. Mapeia ADR-02 e RNF03.

#### Scenario: Health check leaves no stored payload

- **WHEN** um cliente chama `GET /api/health`
- **THEN** o processo MUST NOT gravar o request em banco de dados nem em arquivo de persistência
