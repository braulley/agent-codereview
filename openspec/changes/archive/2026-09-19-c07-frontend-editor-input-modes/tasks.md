## 1. Setup (depende de C06 aplicado)

- [x] 1.1 Confirmar C06 no `frontend/` (`validatePrUrl`, shell three-pane, Jest/RTL, tokens). Se ausente, parar e aplicar C06. Verificar: `test -f frontend/lib/pr-url-validator.ts` (ou equivalente) e `frontend/package.json` com Next 15.x
- [x] 1.2 Adicionar `@monaco-editor/react` 4.x e `react-diff-viewer-continued` 4.x em `frontend/package.json` se ainda não estiverem; `npm ci` (ou `npm install`) exit 0. Verificar: `npm ls @monaco-editor/react react-diff-viewer-continued` sem missing

## 2. Hook `useEditor` (D2)

- [x] 2.1 Implementar `frontend/hooks/useEditor.ts` com estado `content`, `language`, `mode` (`manual` \| `upload` \| `url`) e métodos `setContent`, `setLanguage`, `setMode`, `applyEdit`, `undo`. Componente/hook afetado: `useEditor`. Verificar: export tipado; sem `fetch` nem chaves de API no arquivo
- [x] 2.2 Testes unitários `frontend/__tests__/hooks/useEditor.test.ts`: `setContent` atualiza; `setMode` troca aba sem limpar content; linguagem inferível. Verificar: `npm test -- useEditor` exit 0

## 3. Monaco + abas de entrada (D1, D3, D6)

- [x] 3.1 Implementar `frontend/components/Editor/CodeEditor.tsx` com `next/dynamic` + `ssr: false`, tema dark, seletor de linguagem (TS/Python/Go/Java/Rust no mínimo). Hook/componente: `CodeEditor` + `useEditor`. Verificar: arquivo contém `ssr: false`; build não importa Monaco no Server Component
- [x] 3.2 Implementar `frontend/components/Editor/InputTabs.tsx` (três abas, estilos L1/L2/beacon 0px radius). Verificar: markup com as três abas; classes usam tokens do design
- [x] 3.3 Montar Editor + tabs no slot Central Stage (`app/page.tsx` ou wrapper). Verificar: `aria-label` do stage contém o editor; sem full page navigation ao trocar aba
- [x] 3.4 Testes `frontend/__tests__/components/InputTabs.test.tsx`: render das três abas; indicador ativo; troca de aba preserva content (CA-RF01-01). Verificar: `npm test -- InputTabs` exit 0

## 4. Upload de arquivo (CA-RF01-02)

- [x] 4.1 Implementar `frontend/components/Editor/FileUpload.tsx` (`'use client'`, FileReader, allowlist `.py .js .ts .jsx .tsx .java .go .php .rb`, inferência de linguagem). Verificar: extensão fora da lista não chama `setContent`
- [x] 4.2 Testes integração `frontend/__tests__/integration/FileUpload.test.tsx`: upload `.py` popula editor; extensão inválida mostra erro e mantém content. Verificar: `npm test -- FileUpload` exit 0 (FileReader mockado)

## 5. URL PR/MR + ingest (D4, CT05)

- [x] 5.1 Implementar `frontend/components/Editor/PrUrlInput.tsx` usando `validatePrUrl` de C06; só após `ok: true` chamar `POST /api/diff/ingest` com `{ pr_url }` (sem tokens). Em sucesso: `setContent(diff_content)` e aviso se `truncated`. Hook/componente: `PrUrlInput` + `useEditor`. Verificar: `rg "GEMINI_API_KEY|GITHUB_TOKEN|GITLAB_TOKEN" frontend/components/Editor` vazio
- [x] 5.2 Testes `frontend/__tests__/components/PrUrlInput.test.tsx`: GitHub válido não mostra INVALID_PR_URL; `pull/abc` mostra erro e **zero** `fetch` (CT05); mock 200 popula editor; mock `truncated: true` mostra aviso. Verificar: `npm test -- PrUrlInput` exit 0

## 6. DiffViewer (D5, RF07)

- [x] 6.1 Implementar utilitário puro `frontend/lib/diff-split.ts` (ou equivalente) e `frontend/components/DiffViewer/DiffViewer.tsx` com `next/dynamic` `ssr: false`, toggle side-by-side/unified, navegação por hunks. Verificar: toggle não limpa lista de alertas (prop/callback isolado)
- [x] 6.2 Testes `frontend/__tests__/integration/DiffViewer.test.tsx`: side-by-side renderiza dois painéis (CA-RF07-01); troca para unified não perde fixture de alertas (CA-RF07-02). Verificar: `npm test -- DiffViewer` exit 0

## 7. Qualidade e CT08

- [x] 7.1 (depende de 2–6) `cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build` — os quatro exit 0
- [x] 7.2 Checklist manual CT08: colar fixture ~2.000 linhas → scroll/digitação sem freeze perceptível (DevTools Performance). Verificar: nota no PR/checklist DoD; editor não trava
- [x] 7.3 Auditoria RNF03: `rg "NEXT_PUBLIC_GEMINI|NEXT_PUBLIC_GITHUB|NEXT_PUBLIC_GITLAB|GEMINI_API_KEY|GITHUB_TOKEN|GITLAB_TOKEN" frontend/components frontend/hooks frontend/lib` sem matches de secrets; bundle não inclui tokens. Verificar: grep vazio (exit 1 do rg sem match = OK)

### DoD / CT08 (manual)

- [x] CT08 smoke: fixture `frontend/__tests__/fixtures/ct08-large.txt` (~2000 lines) loaded into `useEditor` / Monaco without crash; final UX check in browser DevTools Performance recommended before release.
