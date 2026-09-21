## Context

C06 entrega shell three-pane, tokens, tipos RF02 e `lib/pr-url-validator.ts`. C04 define `POST /api/diff/ingest` no backend. Motivação: ver `proposal.md`. Comportamento alvo: specs `editor-input-modes` e `diff-viewer`.

Camada afetada: **somente `frontend/`** (`components/Editor`, `components/DiffViewer`, `hooks/useEditor`, testes). Nenhum módulo `backend/`.

Esta mudança **não** implementa SSE/`POST /api/analyze` (C11), gutter/highlights (C09), AlertPanel (C08) nem `executeEdits` de correção (C10) além das APIs mínimas do hook para C09/C10 reutilizarem.

Premissas: C06 aplicado (Jest + RTL, slots Central Stage, `validatePrUrl`); C04 disponível em ambiente integrado para ingest real — testes desta mudança mockam `fetch` para `/api/diff/ingest`.

## Goals / Non-Goals

**Goals:**

- Monaco na Central Stage com lazy load SSR-safe (ADR-04).
- Três abas Manual / Upload / URL sem reload, preservando `content`.
- Upload com allowlist de extensões; URL inválida bloqueada (CT05) antes do ingest.
- DiffViewer side-by-side ↔ unified sem perder estado de sessão.
- Hook `useEditor` estável para C09/C10.

**Non-Goals:**

- Streaming de análise e toasts de erro de rede SSE (C11).
- Decorações de severidade e navegação alerta↔editor (C09).
- Persistência, store global, ou tokens no client (RNF03).

## Decisions

### D1 — Monaco via `next/dynamic` com `ssr: false`

`CodeEditor` e `DiffViewer` carregam com `next/dynamic(..., { ssr: false })` e skeleton de loading.

**Por quê:** Monaco e `react-diff-viewer-continued` dependem de `window`/DOM (ADR-04). Alternativa rejeitada: import estático no Server Component (quebra o build SSR).

### D2 — Estado de sessão no hook `useEditor`, sem store global

Estado: `{ content, language, mode: 'manual' | 'upload' | 'url' }`. Métodos: `setContent`, `setLanguage`, `setMode`, `applyEdit` (wrapper fino sobre API Monaco quando montado), `undo`. Vivem em React state no client; C08/C11 leem/escrevem via props/callbacks no composition root (`page.tsx` ou provider mínimo local).

**Por quê:** ADR-02 / AGENTS.md — sessão só no frontend, sem Redux/Zustand no MVP. Alternativa rejeitada: Context global prematuro.

### D3 — Tabs controlam só o painel de entrada; editor único

Um único Monaco montado no stage. Abas trocam o *controle* (textarea implícita do Monaco / file input / URL form), não desmontam o editor ao alternar (evita perda de content e re-download do bundle).

**Por quê:** CA-RF01-01. Alternativa rejeitada: um Monaco por aba.

### D4 — Reutilizar `validatePrUrl` de C06; ingest só após `ok: true`

`PrUrlInput` chama `validatePrUrl`. Só então `fetch(POST /api/diff/ingest, { pr_url })`. Tokens nunca no body/headers do browser (RNF03) — backend usa env.

**Por quê:** CT05 / CA-RF01-03; evita duplicar regex. Alternativa rejeitada: validar só no backend (falha o CT05 client-side).

### D5 — DiffViewer com `react-diff-viewer-continued`; parse mínimo no client

Para URL/diff unificado, derivar `oldValue`/`newValue` com utilitário puro em `lib/diff-split.ts` (ou props já separadas). Toggle split/unified é estado local do DiffViewer; não toca na lista de alertas (CA-RF07-02).

**Por quê:** stack fixada em `docs/spec.md` / AGENTS.md. Alternativa rejeitada: só Monaco DiffEditor (proposta e Stitch pedem o viewer React).

### D6 — Tokens e abas alinhados a `docs/design.md`

Aba ativa: bg `#161F30`, border-top 2px `#F97316`. Inativa: `#111827`, texto `#9CA3AF`. Radius 0. Fonte mono JetBrains no editor.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Bundle Monaco ~2MB atrasa FCP | `next/dynamic` + skeleton; não bloquear shell C06 |
| SSR/hydration mismatch | `ssr: false` em Editor e DiffViewer |
| FileReader indisponível em testes SSR | componentes `'use client'`; mock FileReader nos testes |
| Ingest real depende de C04 | testes com `fetch` mockado; integração manual com C04 |
| CT08 subjetivo (freeze) | teste de smoke com fixture ~2k linhas + checklist manual DevTools |

## Migration Plan

1. Aplicar após C06 (e preferencialmente C04 para ingest E2E).
2. Montar Editor no slot Central Stage; DiffViewer visível quando `mode === 'url'` ou conteúdo for diff.
3. Rollback: remover componentes do slot; shell C06 permanece.

## Open Questions

Nenhuma que altere specs: navegação por hunks usará controles da lib ou botões “Anterior/Próximo” no wrapper — detalhe de implementação sem mudar CA-RF07-03.
