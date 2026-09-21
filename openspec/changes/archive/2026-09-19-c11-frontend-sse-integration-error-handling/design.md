## Context

Camada afetada: **somente `frontend/`** — `hooks/useSSE` (ou nome equivalente), extensão de `ToastHost`, banner offline, orquestração em `app/page.tsx`, proxy Next opcional em `next.config.ts`, tipos SSE em `types/analysis.ts`. Nenhum módulo `backend/src/` (C05 já publica `alert|score|done|error`).

Estado observado:

- Shell three-pane + `useEditor` + modos de input (C07) em `page.tsx`; slots rail/drawer ainda placeholder se C08 não estiver aplicado.
- `lib/api-paths.ts` exporta `ANALYZE = "/api/analyze"` relativo; `next.config.ts` **sem** rewrite — `fetch("/api/analyze")` hoje 404 no Next.
- Backend CORS já libera `http://localhost:3000`; SSE emite comment `stream-open` imediato e `event: error` tipado (`LLM_TIMEOUT` | `LLM_UNAVAILABLE` | `LLM_SCHEMA` | `RATE_LIMITED`).
- `ToastHost` renderiza mensagens sem ação de retry; `SseEvent` em `types/analysis.ts` ainda não inclui `error` nem `duration_ms`/`status` em `done`.
- C08 preparou `useAlerts.ingest`; C09/C10 highlights e `applyFix` — C11 só liga o stream.

Motivação: ver `proposal.md`. Comportamento: specs `sse-client`, `analyze-flow`, `api-error-resilience`.

**RNF02:** skeleton ≤ 200ms no clique; ingestão por evento (sem batch) para TTFA ≤ 1.500ms. **RNF01:** validação Pydantic no backend; client rejeita frames inválidos sem derrubar a sessão. **RNF03:** sem chaves no bundle; só paths relativos / proxy.

## Goals / Non-Goals

**Goals:**

- Hook de consumo SSE via `fetch` + `ReadableStream` + parser de frames, com `AbortController` e timeout 30s.
- Página orquestra Analisar → limpa sessão anterior → stream → `ingest` / highlights / score UI.
- Toast com **"Tentar Novamente"** + banner `navigator.onLine`.
- Proxy same-origin para `/api/*` para os paths relativos de C06 funcionarem.

**Non-Goals (nível de design):**

- Alterar contrato ou timeouts do backend C05.
- Nova lógica de score, filtros, apply-fix ou Monaco decorations (C08–C10).
- WebSocket, EventSource, Zustand/Redux, persistência.
- Nova dependência npm de SSE (parser mínimo próprio).

## Decisions

### D1 — `fetch` + `ReadableStream`, não `EventSource`

`EventSource` é GET-only. `useSSE` (nome alinhado a AGENTS.md / proposal) faz `fetch(ANALYZE, { method: "POST", body, signal, headers: { Accept: "text/event-stream" } })`, lê `response.body` com `TextDecoder`, acumula linhas e emite frames `{ event, data }`.

**Por quê:** contrato §5.1 é POST. Alternativa rejeitada: `EventSource` + query string (vaza código na URL / logs de proxy).

### D2 — Rewrite Next → FastAPI para paths relativos

Em `next.config.ts`:

```ts
rewrites: async () => [
  { source: "/api/:path*", destination: `${process.env.BACKEND_URL ?? "http://127.0.0.1:8000"}/api/:path*` },
]
```

Browser continua em same-origin `/api/analyze` (RNF03, sem URL de backend no bundle obrigatória). CORS do backend permanece como fallback para chamadas diretas em dev.

**Por quê:** `api-paths.ts` já é relativo; sem rewrite o Next 404. Alternativa rejeitada: `NEXT_PUBLIC_API_URL` no client — mais superfície e risco de config errada.

### D3 — Estender `SseEvent` com `error` e `done` completo

```ts
| { event: "error"; data: { error: string; message: string; analysis_id: string } }
| { event: "done"; data: { status: "completed"; analysis_id: string; duration_ms: number } }
```

Parser rejeita `data` que não case; chama callback `onError` / toast sem mutar alertas válidos já ingestados.

**RNF01:** espelha enums do backend; não reimplementa Pydantic.

### D4 — Composition root em `page.tsx`

`page.tsx` (`'use client'`) compõe `useEditor` + `useAlerts` + `useSSE` (+ highlight/apply se C09/C10 presentes):

1. Analisar → `resetAnalysisSession()` → `start({ code, language, filename? })`.
2. `onAlert` → `ingest({ event: "alert", data })` (+ highlight).
3. `onScore` / `onDone` / `onError` → estado de loading + toast.
4. Retry → `start` de novo com `editor.content` atual.

Sem Context global a menos que o merge C08–C10 já tenha introduzido um provider mínimo.

**Por quê:** ADR-02; C08 já previu o composition root. Alternativa rejeitada: store Zustand.

### D5 — Timeout 30s no client + abort

`AbortController` + `setTimeout(30_000)` aborta se não houver `done` nem `error`. Trata abort por timeout como falha CT04 (mesmo UX que `LLM_TIMEOUT`). Abort por nova Analisar ou unmount NÃO mostra toast de timeout.

**Por quê:** RF10 / CT04; backend também timeouta, mas o client precisa UX se a conexão pendurar.

### D6 — Toast com ação; banner offline separado

Estender `ToastHost` (ou item de toast) com `action?: { label: "Tentar Novamente"; onClick }`. Banner offline: componente fixo no topo do shell, escuta `online`/`offline`, independente do toast. Visual: L2, hairline, 0 radius, Space Grotesk uppercase no label do banner.

**Por quê:** CA-RF10-01 vs CA-RF10-04 são interações distintas. Alternativa rejeitada: só `alert()` nativo.

### D7 — Skeleton no drawer + spinner no botão

Skeleton: blocos L2 no slot AlertPanel ≤ 200ms após clique (RNF02). `Button` Analisar: `disabled` + `Spinner` enquanto `isAnalyzing`. Empty CT03 só após `done` sem alerts — skeleton some.

**Por quê:** proposal + RNF02. Alternativa rejeitada: bloquear o Monaco com overlay modal (prejudica CT08 / edição).

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Rewrite Next bufferiza SSE | Headers `Cache-Control` / `X-Accel-Buffering` já no backend; validar stream chunked no DevTools; se bufferar, fallback documentado: apontar `BACKEND_URL` e CORS direto |
| C08–C10 ainda não aplicados | Tasks condicionam wiring; testes do hook SSE isolados com `fetch` mock |
| Parser SSE frágil (linhas partidas) | Buffer de texto até `\n\n`; testes com chunks fragmentados |
| TTFA > 1.500ms por batch no React | `ingest` por evento; sem `Promise.all` de alerts |
| ToastHost sem retry hoje | Extensão mínima do componente + testes RTL |
| Duplo timeout client+server | Mesma mensagem amigável; retry único caminho |

**Trade-off:** proxy no Next adiciona hop; escolhido por same-origin e paths existentes.

## Migration Plan

1. Aplicar após C05 (SSE) e, para E2E completo, C08–C10; o hook SSE pode aterrissar antes com mocks.
2. Adicionar rewrite; estender tipos; implementar `useSSE` + UI de erro; ligar Analisar em `page.tsx`.
3. Rollback: remover rewrite e hook; shell/editor permanecem.
4. Verificar: `cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build` exit 0; grep bundle sem tokens (RNF03). Browser: colar → Analisar → Aplicar → Ctrl+Z; simular timeout (CT04).

## Open Questions

Nenhuma que altere specs. Detalhe de filename default (`snippet.py` vs linguagem) pode seguir o backend quando omitido.
