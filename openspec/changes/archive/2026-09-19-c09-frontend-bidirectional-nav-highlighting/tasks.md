## 1. Setup (depende de C07 + C08 aplicados)

- [x] 1.1 Confirmar C07 (`useEditor`, `CodeEditor`) e C08 (`useAlerts` com `selectAlert` / `activeId` / `visibleSeverities`, cards com `data-alert-id`). Se ausente, parar e aplicar C07/C08. Verificar: `test -f frontend/hooks/useEditor.ts` e presença de `selectAlert` (ou equivalente) no hook de alertas
- [x] 1.2 Garantir `glyphMargin` habilitado nas opções do Monaco em `CodeEditor` (componente afetado: `CodeEditor`). Verificar: opções do editor incluem glyph margin / line decorations; sem nova dependência npm

## 2. Mapa de decorações e CSS (D2, D6, RF08)

- [x] 2.1 Implementar `frontend/components/Editor/GutterMarkers.tsx` (ou `severityDecorations.ts`) mapeando severity → classNames/opções de decoration com cores RF08. Componente/util afetado: `GutterMarkers`. Verificar: export puro testável; CRITICAL→`#EF4444` / `rgba(239,68,68,0.15)`
- [x] 2.2 Adicionar classes CSS de severidade em `frontend/app/globals.css` (0px radius, superfícies opacas). Verificar: classes referenciadas pelo mapa existem; sem `backdrop-filter`
- [x] 2.3 Testes unitários `frontend/__tests__/components/Editor/severityDecorations.test.ts` (ou GutterMarkers): quatro severidades com cores corretas (CA-RF08-02). Verificar: `npm test -- severityDecorations` (ou GutterMarkers) exit 0

## 3. Extensão `EditorInstance` + `useEditorHighlight` (D1, D3, D4)

- [x] 3.1 Estender `EditorInstance` em `frontend/hooks/useEditor.ts` com `deltaDecorations`, `revealLineInCenterIfOutsideViewport` (ou `revealLineInCenter`) e registro de `onMouseDown`/disposable. Hook afetado: `useEditor`. Verificar: tipos compilam; `CodeEditor` onMount continua registrando a instância
- [x] 3.2 Implementar `frontend/hooks/useEditorHighlight.ts`: sync de decorações persistentes para alertas OPEN ∩ `visibleSeverities`; mapa `alertId → decorationIds`; `clearHighlight(id)`; highlight temporário 2500 ms em `focusAlert`; limpar órfãos ao mudar content. Hook afetado: `useEditorHighlight`. Verificar: arquivo exporta API tipada; sem `fetch`/secrets
- [x] 3.3 Testes unitários `frontend/__tests__/hooks/useEditorHighlight.test.ts` com Monaco mockado: `highlightLine`/sync aplica decoration; temp some após 2–3 s (fake timers, CA-RF03-03); um active por vez (CA-RF03-05); `clearHighlight` remove (CA-RF08-03); filtro remove gutters ocultos (CA-RF08-04). Verificar: `npm test -- useEditorHighlight` exit 0

## 4. Navegação bidirecional e wiring UI (D5, RF03)

- [x] 4.1 No shell (`app/page.tsx` ou provider de sessão): conectar `useEditorHighlight` a `useEditor` + `useAlerts` — clique no card chama `selectAlert` + `focusAlert` (reveal + temp). Componentes/hooks: page shell, `AlertCard`/`AlertPanel`, `useEditorHighlight`. Verificar: clique no card dispara `revealLine*` no mock/editor
- [x] 4.2 Handler de clique no glyph margin → `selectAlert(id)` + `scrollIntoView` do card `[data-alert-id]`. Hooks/componentes: `useEditorHighlight`, `AlertPanel`. Verificar: clique no gutter (simulado) marca card `active` e rola o painel (CA-RF03-04)
- [x] 4.3 Testes de integração `frontend/__tests__/integration/BidirectionalNav.test.tsx`: clique card → scroll editor (CA-RF03-02); clique gutter → card active (CA-RF03-04); desativar MEDIUM → sem gutter MEDIUM (CT06 / CA-RF08-04). Verificar: `npm test -- BidirectionalNav` exit 0 (Monaco e timers mockados; sem rede)

## 5. Qualidade, CT08 e RNF03

- [x] 5.1 (depende de 2–4) `cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build` — os quatro exit 0
- [x] 5.2 Checklist manual CT08: ~2.000 linhas + vários gutters → scroll e clique card sem freeze perceptível (< 300 ms CA-RF03-01). Verificar: nota no checklist DoD / PR
  - **Nota DoD:** smoke automatizado em `frontend/__tests__/hooks/ct08-large.test.ts` (~2000 linhas no `useEditor`). Validação perceptível de gutters + clique card em arquivo grande permanece checklist manual no browser antes do PR (CA-RF03-01 / RNF04).
- [x] 5.3 Auditoria RNF03: `rg "NEXT_PUBLIC_GEMINI|NEXT_PUBLIC_GITHUB|NEXT_PUBLIC_GITLAB|GEMINI_API_KEY|GITHUB_TOKEN|GITLAB_TOKEN" frontend/hooks frontend/components/Editor` sem matches de secrets. Verificar: grep vazio
