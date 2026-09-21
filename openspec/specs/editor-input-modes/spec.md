# editor-input-modes Specification

## Purpose

Entrega o Monaco Editor na Central Stage com três modalidades de entrada (manual, upload e URL de PR/MR), estado de sessão em memória e validação client-side antes de qualquer ingestão — cobrindo RF01, CT05 e CT08 no frontend.

## Requirements

### Requirement: Três modalidades de entrada sem reload (RF01, CA-RF01-01)
O frontend SHALL oferecer três abas de entrada no Central Stage: **Código Manual**, **Upload Arquivo** e **URL PR/MR**. Alternar abas MUST NÃO recarregar a página e MUST preservar o conteúdo já carregado no editor (CA-RF01-01). Prioridade P0. Ator: Desenvolvedor Solicitante. CTs: **CT01**, **CT02**, **CT05** (entrada).

Aba ativa MUST usar superfície L2 `#161F30` com borda superior 2px beacon `#F97316`. Abas inativas MUST usar superfície L1 `#111827` e texto `#9CA3AF` (`docs/design.md`). Radius MUST ser 0px.

#### Scenario: Alternar abas preserva conteúdo
- **WHEN** o usuário cola código na aba Manual e depois seleciona Upload e retorna a Manual
- **THEN** o conteúdo colado MUST permanecer no editor e a URL da página MUST NÃO mudar (sem full reload)

#### Scenario: Três abas visíveis
- **WHEN** a página principal carrega com o shell C06
- **THEN** as três abas Manual, Upload e URL PR/MR MUST estar presentes e acionáveis

### Requirement: Inserção manual no Monaco Editor
Na aba Manual, o sistema SHALL exibir um editor Monaco com syntax highlighting, tema dark compatível com o canvas `#090D16`, e seletor de linguagem cobrindo pelo menos TypeScript, Python, Go, Java e Rust. O usuário MUST poder colar plain text ou unified diff. Conteúdo MUST existir só em memória de sessão (ADR-02, RNF03). MUST NOT embutir `GEMINI_API_KEY`, `GITHUB_TOKEN` ou `GITLAB_TOKEN` no bundle. Prioridade P0.

#### Scenario: Colar código atualiza o editor
- **WHEN** o usuário cola um trecho Python na aba Manual
- **THEN** o texto MUST aparecer no editor e a linguagem selecionável MUST incluir Python

#### Scenario: Arquivo grande permanece responsivo (CT08, RNF04)
- **WHEN** o usuário cola um arquivo com cerca de 2.000 linhas
- **THEN** o editor MUST permanecer interativo (scroll e digitação sem freeze perceptível); CT08

### Requirement: Upload de arquivo com extensões suportadas (CA-RF01-02)
Na aba Upload, o sistema SHALL aceitar arquivos com extensões `.py`, `.js`, `.ts`, `.jsx`, `.tsx`, `.java`, `.go`, `.php`, `.rb`. O conteúdo MUST ser lido no browser (FileReader) e injetado no editor, com linguagem inferida da extensão quando possível. Extensão fora da lista MUST ser rejeitada com mensagem descritiva visível **antes** de alterar o conteúdo do editor. Prioridade P0.

#### Scenario: Upload .py popula o editor
- **WHEN** o usuário seleciona um arquivo `app.py` válido
- **THEN** o conteúdo do arquivo MUST aparecer no editor e a linguagem MUST refletir Python

#### Scenario: Extensão não suportada é rejeitada
- **WHEN** o usuário seleciona um arquivo `.exe` ou `.md`
- **THEN** o sistema MUST exibir erro descritivo e MUST NÃO substituir o conteúdo atual do editor

### Requirement: URL de PR/MR com validação client-side (CT05, CA-RF01-03)
Na aba URL PR/MR, o frontend SHALL validar a URL com o validador de C06 (`validatePrUrl` / contrato `pr-url-validation`) **antes** de qualquer `POST /api/diff/ingest`. Formatos válidos MUST ser os canônicos GitHub e GitLab https-only. URL inválida (ex.: `https://github.com/user/repo/pull/abc`) MUST exibir erro `INVALID_PR_URL` (ou mensagem equivalente) e MUST NÃO iniciar requisição de rede. Prioridade P0. CTs: **CT05**.

URL válida MUST disparar `POST /api/diff/ingest` com o body `{ "pr_url": "<url>" }` (sem tokens no client). Em sucesso, o `diff_content` retornado MUST ser carregado no editor (e/ou DiffViewer). Se a resposta indicar truncamento (`truncated: true`), o UI MUST avisar o usuário. Erros de envelope do backend (`PR_NOT_FOUND`, etc.) MUST ser exibidos sem limpar o editor se o ingest falhar. MUST NOT enviar chaves de API no request (RNF03).

#### Scenario: URL inválida não chama a API (CT05)
- **WHEN** o usuário submete `https://github.com/user/repo/pull/abc`
- **THEN** a validação client-side MUST falhar, nenhuma requisição a `/api/diff/ingest` MUST ser iniciada, e uma mensagem de erro MUST ser visível

#### Scenario: URL válida carrega o diff
- **WHEN** o usuário submete uma URL GitHub válida e o backend responde 200 com `diff_content`
- **THEN** o diff MUST aparecer no editor/DiffViewer em memória de sessão

#### Scenario: Resposta truncada mostra aviso
- **WHEN** o ingest retorna `truncated: true`
- **THEN** o UI MUST exibir aviso de truncamento (>500 linhas) e ainda assim mostrar o conteúdo retornado

### Requirement: Estado do editor em sessão (useEditor)
O frontend SHALL manter estado de sessão com pelo menos `content`, `language` e `mode` (manual | upload | url), e operações `setContent`, `applyEdit` e `undo` (ou equivalentes) reutilizáveis por C09/C10. Reload da página MUST zerar o estado. Prioridade P0.

#### Scenario: setContent atualiza a sessão
- **WHEN** `setContent` é chamado com um novo texto
- **THEN** o editor MUST refletir esse texto e `content` da sessão MUST igualar o valor

#### Scenario: Reload descarta o editor
- **WHEN** o usuário recarrega a página após editar
- **THEN** o editor MUST iniciar vazio (sem persistência)
