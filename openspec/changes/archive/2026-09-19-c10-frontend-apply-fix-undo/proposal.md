## Why

C08 deixa o botão **Aplicar Correção** desabilitado e C09 só navega/destaca linhas. Sem RF04, o usuário não remedia achados na sessão nem exercita CT07 (apply + Ctrl+Z). C11 depende deste loop para o happy path ponta a ponta. Esta mudança é **MVP**.

## What Changes

- Habilitar **Aplicar Correção** no card OPEN: substituição atômica do intervalo `line_start`–`line_end` pelo `suggestion` via Monaco `executeEdits` (entra no undo stack nativo).
- Marcar o alerta como `RESOLVED` (check + opacidade); limpar gutter/highlight daquele `id` (CA-RF08-03).
- Recalcular Code Health Score client-side só com alertas OPEN em **< 100 ms** (CA-RF04-05; fórmula C06 `client-health-score`).
- `Ctrl+Z` / `Cmd+Z` reverte o texto **e** restaura o card para OPEN (CA-RF04-04 / CT07), sincronizando via mudança de conteúdo do modelo.
- Demais alertas da sessão MUST permanecer intactos (CA-RF04-02). Sem reload de página (CA-RF04-01).

### Non-goals (MVP; fora desta mudança)

- `useSSE` / `POST /api/analyze` real, retry, toasts de rede (C11).
- Aplicar várias correções em lote ou “fix all”.
- Atalho `⌘↵` como unique handler obrigatório (hint visual ok; undo = stack Monaco).
- Persistência de sessão, backend novo, ou chaves no bundle.

## Capabilities

### New Capabilities

- `apply-fix-undo`: apply atômico (RF04), estado RESOLVED, undo sincronizado, score OPEN, limpeza de decorações do alerta resolvido (CA-RF08-03), CT07.

### Modified Capabilities

- Nenhuma em `openspec/specs/` arquivado. `alert-panel` (C08) e highlight (C09) ainda são deltas de change; C10 **liga** o stub do botão e chama clear de decoração sem reescrever aqueles specs arquivados.

## Impact

- **Código:** `frontend/hooks/useEditor.ts` (aplicar fix no range do alerta), composição com `useAlerts.resolveAlert` / `unresolveAlert` (C08), `AlertCard` botão enabled, bridge com `useEditorHighlight` (C09). Camada **somente frontend/**.
- **APIs:** nenhum endpoint. Não altera TTFA do backend (RNF02). **RNF01** inalterado (validação LLM no server).
- **RFs/RNFs:** RF04 (P0), CA-RF08-03, RF06 recalc local, RNF03 (sem keys; sem persistir código), CT07.
- **Segurança:** apply/undo só em memória; MUST NOT logar `suggestion`/fonte; sem `GEMINI_*` no client.
- **Dependências:** C08 (`useAlerts`, card stub), C09 (clear gutter/highlight). Bloqueia C11.
- **Breaking:** nenhum.
