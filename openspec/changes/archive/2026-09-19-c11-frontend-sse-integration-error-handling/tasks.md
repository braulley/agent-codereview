## 1. Setup e proxy (D2)

- [x] 1.1 Confirmar pré-requisitos no frontend: `lib/api-paths.ts` (`ANALYZE`), `types/alert.ts`, `types/analysis.ts`, `components/ui/ToastHost.tsx`, `Button.tsx`, `Spinner.tsx`, `hooks/useEditor.ts`. Hook afetado: nenhum ainda. Verificar: os arquivos existem; se C08+ não estiverem aplicados, anotar gaps de `useAlerts` / AlertPanel antes do wiring em §5.
- [x] 1.2 Em `frontend/next.config.ts`, adicionar `rewrites` `/api/:path*` → `${BACKEND_URL ?? "http://127.0.0.1:8000"}/api/:path*` (D2). Nenhum hook. Verificar: `npx tsc --noEmit` aceita o config; documentar `BACKEND_URL` em comentário ou `.env.example` do frontend se já houver padrão no repo — sem `NEXT_PUBLIC_*` de API key.

## 2. Tipos SSE (`types/analysis.ts`)

- [x] 2.1 Estender `SseEvent` com `error` (`error`, `message`, `analysis_id`) e `done` completo (`status: "completed"`, `analysis_id`, `duration_ms`) conforme D3 / spec `sse-client`. Arquivo: `frontend/types/analysis.ts`. Verificar: `npx tsc --noEmit`; teste de tipo ou assert em `frontend/__tests__/types/` cobre o union `alert|score|done|error`.

## 3. Parser SSE puro (`lib/sse-parse.ts`)

- [x] 3.1 Implementar parser de frames SSE (buffer até `\n\n`, ignora comments `:`, extrai `event` + `data` JSON) em `frontend/lib/sse-parse.ts` — função pura, sem React. Verificar: o módulo não importa `fetch`/React; `npx tsc --noEmit` ok.
- [x] 3.2 Testes unitários `frontend/__tests__/lib/sse-parse.test.ts`: frame `alert` CT01; sequência `score`+`done`; `event: error` LLM_TIMEOUT; comment ignorado; chunk fragmentado no meio de `data`; JSON inválido rejeitado. Verificar: `npm test -- sse-parse` exit 0.

## 4. Hook `useSSE`

- [x] 4.1 Implementar `frontend/hooks/useSSE.ts`: `fetch`+`ReadableStream` (D1), `AbortController`, timeout 30s (D5), callbacks `onAlert`/`onScore`/`onDone`/`onError`, uma análise em voo (nova start aborta a anterior). Usa `ANALYZE` de `api-paths`. Verificar: `rg "EventSource|GEMINI_API_KEY|localStorage" frontend/hooks/useSSE.ts` vazio.
- [x] 4.2 Testes `frontend/__tests__/hooks/useSSE.test.ts` (`renderHook` + `fetch` mock / stream fake): `onAlert` por evento; `onScore`+`onDone`; `onError` em `event: error` e em HTTP 422; timeout 30s chama `onError` (CT04); segunda `start` aborta a primeira; unmount aborta. Verificar: `npm test -- useSSE` exit 0.

## 5. Toast com retry e banner offline (`ToastHost`, `OfflineBanner`)

- [x] 5.1 Estender `frontend/components/ui/ToastHost.tsx` com ação opcional `{ label, onClick }` (botão "Tentar Novamente", D6). Radius 0 / L2. Verificar: toast com ação renderiza botão acessível; sem ação mantém comportamento atual.
- [x] 5.2 Testes `frontend/__tests__/components/ui/ToastHost.test.tsx`: clique em "Tentar Novamente" dispara `onClick` (CA-RF10-03). Verificar: `npm test -- ToastHost` exit 0.
- [x] 5.3 Implementar `frontend/components/ui/OfflineBanner.tsx` escutando `online`/`offline` + `navigator.onLine` (spec `api-error-resilience`). Verificar: banner visível só quando offline; `role="status"` (ou equivalente).
- [x] 5.4 Testes `frontend/__tests__/components/ui/OfflineBanner.test.tsx`: `onLine=false` mostra banner; evento `online` remove (CA-RF10-04). Verificar: `npm test -- OfflineBanner` exit 0.

## 6. Orquestração da página (`page.tsx`, Analisar, skeleton)

- [x] 6.1 (depende de 4 e de C08 `useAlerts`) Em `frontend/app/page.tsx`: botão Analisar (`Button`+`Spinner`), skeleton no drawer ≤ 200ms (D7), `reset` da sessão antes do stream, wire `useSSE` → `ingest` / highlight se C09 existir, toast+retry, montar `OfflineBanner`+`ToastHost`. Editor vazio não chama API. Verificar: `rg "EventSource" frontend/app/page.tsx` vazio; Analisar desabilitado/spinner enquanto `isAnalyzing`.
- [x] 6.2 Testes integração `frontend/__tests__/integration/AnalyzeFlow.test.tsx` (mock `fetch`/SSE): skeleton após clique; alert CT01 aparece no painel; CT03 empty+score 100 sem toast de erro; CT04 timeout → toast+retry reenvia sem limpar editor; código preservado em erro. Verificar: `npm test -- AnalyzeFlow` exit 0.

## 7. Qualidade e auditoria RNF03

- [x] 7.1 (depende de 2–6) Rodar `cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build` e obter exit 0. Verificar: os quatro comandos exit 0.
- [x] 7.2 (depende de 7.1) Auditoria RNF03: `rg "GEMINI_API_KEY|GITHUB_TOKEN|GITLAB_TOKEN|NEXT_PUBLIC_GEMINI" frontend/hooks/useSSE.ts frontend/app/page.tsx frontend/lib/sse-parse.ts frontend/components/ui` vazio; após build, as três strings de token não aparecem no `.next` desta UI. Verificar: greps sem match.
- [x] 7.3 Checklist manual (staging): colar → Analisar → alertas → Aplicar Correção → Ctrl+Z; CT04 toast; offline banner; TTFA/skeleton (RNF02). Verificar: DoD da proposal §8 marcado para os itens de UI exercitáveis.
