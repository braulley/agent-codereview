# api-error-resilience Specification

## Purpose

Trata falhas de análise e conectividade na UI: toast com retry, banner offline e preservação da sessão do editor conforme RF10 e RNF05.

## Requirements

### Requirement: Toast de erro com Tentar Novamente (RF10, CT04, RNF05)
Quando a análise falhar por timeout (> 30s / `LLM_TIMEOUT`), erro SSE (`LLM_UNAVAILABLE`, `LLM_SCHEMA`, `RATE_LIMITED`), HTTP pré-stream (4xx/5xx com envelope), rede ou parsing de frame, a UI SHALL exibir um toast acessível com a mensagem amigável e um botão **"Tentar Novamente"**. Prioridade P1. Ator: Desenvolvedor Solicitante / Sistema.

O toast MUST usar o host de notificações existente (região `aria-live`, radius 0, superfície L2 `#161F30`, borda hairline — `docs/design.md` / design-system). MUST NOT interpolar código-fonte, `suggestion` ou segredos na mensagem. CTs: **CT04**; CA-RF10-01; CA-RF10-02.

#### Scenario: Timeout exibe toast com retry (CT04)
- **WHEN** a análise termina com timeout ou `event: error` `LLM_TIMEOUT`
- **THEN** um toast visível MUST incluir a mensagem de erro e o botão "Tentar Novamente"

#### Scenario: Parsing inválido não limpa o editor (CA-RF10-02)
- **WHEN** um frame SSE ou envelope HTTP de falha é sinalizado à UI
- **THEN** o toast MUST aparecer e o conteúdo do editor MUST permanecer inalterado

### Requirement: Retry reenvia sem reinserir código (CA-RF10-03)
Clicar em **"Tentar Novamente"** MUST reenviar `POST /api/analyze` com o mesmo `code` e `language` da última tentativa (conteúdo atual do editor na falha), sem exigir que o usuário cole o código de novo. MUST reapresentar skeleton/loading. MUST fechar ou substituir o toast de erro da falha anterior ao iniciar o retry.

#### Scenario: Retry dispara nova análise com o mesmo código
- **WHEN** um toast de falha está visível e o usuário clica "Tentar Novamente" com código ainda no editor
- **THEN** o sistema MUST emitir novo `POST /api/analyze` com esse código e MUST NOT exigir nova colagem

### Requirement: Banner offline via navigator.onLine (CA-RF10-04, RNF05)
Quando `navigator.onLine` for `false`, a UI SHALL exibir um banner informativo permanente (não dismissível por timeout) até a conexão restaurar (`online` event ou `navigator.onLine === true`). Prioridade P1.

O banner MUST ser acessível (`role="status"` ou equivalente), radius 0, e MUST NOT bloquear a edição do código. Analisar / retry SHOULD permanecer desabilitados ou falhar de forma explícita enquanto offline.

#### Scenario: Offline mostra banner
- **WHEN** `navigator.onLine` passa a `false` durante a sessão
- **THEN** um banner informativo de conectividade MUST ficar visível

#### Scenario: Volta online remove o banner
- **WHEN** a conexão é restaurada após o banner offline
- **THEN** o banner MUST ser removido sem reload de página

### Requirement: Estado vazio positivo após análise limpa (CT03, RNF05)
Quando a análise completa sem alertas, a UI MUST mostrar o estado **"Nenhum problema encontrado"** no painel e score 100 — sem toast de erro. Isso NÃO é falha de API.

#### Scenario: Sucesso sem alertas não é erro
- **WHEN** o stream completa com `done` e zero `alert`
- **THEN** MUST NOT aparecer toast de erro de API e o painel MUST mostrar o estado positivo
