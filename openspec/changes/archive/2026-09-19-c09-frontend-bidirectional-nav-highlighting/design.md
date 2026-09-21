## Context

Camada afetada: **somente `frontend/`** — `hooks/useEditorHighlight.ts`, extensão de `hooks/useEditor.ts` / `EditorInstance`, `components/Editor/` (decorações + CSS de severidade), wiring com `useAlerts` / `selectAlert` / `visibleSeverities` de C08, e scroll do drawer de cards. Nenhum módulo `backend/`.

Estado observado: C07 já entrega `CodeEditor` + `useEditor` com `registerEditor` e `EditorInstance` mínimo (`executeEdits`, `trigger`, `getModel`). C08 planeja `activeId`, `selectAlert` e `visibleSeverities` sem scroll Monaco. Decorações e navegação bidirecional ainda não existem.

Motivação: ver `proposal.md`. Comportamento: specs `bidirectional-nav` e `editor-highlighting` (RF03, RF08; CT06/CT08; contrato CT07).

Fluxo `POST /api/analyze` → SSE **não é aberto** (C11). **RNF02** (TTFA) não é exercitado. **RNF01** não muda (validação Pydantic no backend). **RNF03**: sem chaves no bundle; só memória de sessão.

## Goals / Non-Goals

**Goals:**

- Decorações Monaco (gutter + background) por alerta OPEN, filtradas por `visibleSeverities`.
- Navegação bidirecional card ↔ gutter com um único `activeId` e highlight temporário 2–3 s.
- Superfície de API (`highlight` / `clear` / sync) que C10 chama ao resolver sem redesenhar o pipeline SSE.

**Non-Goals (nível de design):**

- `executeEdits` / undo de correção (C10).
- `useSSE` / `fetch` analyze (C11).
- Virtualização do painel, store global (Zustand), nova dependência npm.
- Alterar contrato `/api/*` ou backend.

## Decisions

### D1 — Um hook `useEditorHighlight` dono das decorações

Hook `'use client'` recebe: ref/instância Monaco (via `registerEditor` estendido), lista de alertas OPEN, `visibleSeverities`, `activeId`. Expõe `focusAlert(id)`, `clearHighlight(id)`, e reage a mudanças de filtro/lista com sync idempotente.

**Por quê:** C07 já centraliza a instância no `useEditor`; C08 já tem seleção. Alternativa rejeitada: lógica só dentro de `CodeEditor` — dificulta testes e o contrato C10.

### D2 — Monaco `deltaDecorations` + CSS de severidade (não overlays DOM)

Usar a API de decorações do Monaco (`deltaDecorations` / equivalente estável na 4.x) com:

- gutter: `glyphMarginClassName` ou stripe de margem (`linesDecorationsClassName`) 4px sólidas (`docs/design.md` Severity Gutter Markers);
- fundo: `className` / `inlineClassName` + `isWholeLine` no intervalo `line_start`–`line_end`.

Cores **normativas** de RF08 (não o tint 0.12 do palette de cards em `docs/design.md`):

| Severity | Gutter | Highlight |
|---|---|---|
| CRITICAL | `#EF4444` | `rgba(239,68,68,0.15)` |
| HIGH | `#F97316` | `rgba(249,115,22,0.15)` |
| MEDIUM | `#EAB308` | `rgba(234,179,8,0.12)` |
| LOW | `#3B82F6` | `rgba(59,130,246,0.10)` |

CSS em `globals.css` (ou módulo do Editor) com `border-radius: 0`. Manter mapa `alertId → decorationIds[]`; sempre substituir via `deltaDecorations(oldIds, newDecs)` para evitar órfãos.

**Por quê:** roadmap/proposal e RF08. Alternativa rejeitada: markers DOM absolutos — destoam do Monaco e quebram scroll virtual.

### D3 — Estender `EditorInstance` sem acoplar tipos `monaco-editor` no hook de domínio

Ampliar o tipo mínimo em `useEditor.ts`:

- `deltaDecorations(old: string[], next: unknown[]): string[]`
- `revealLineInCenterIfOutsideViewport(line: number)` (ou `revealLineInCenter`)
- `onMouseDown` / disposable para clique em glyph margin

`CodeEditor` faz cast no `onMount` como hoje. Testes mockam essa superfície.

**Por quê:** C07 já evitou hard-dep de types no hook. Alternativa rejeitada: importar `monaco-editor` em todo lugar.

### D4 — Dois tipos de highlight: persistente vs temporário

- **Persistente:** um decoration set por alerta OPEN visível (gutter + fundo RF08).
- **Temporário (nav):** decoration extra no intervalo do `activeId`, TTL **2500 ms** (dentro de 2–3 s / CA-RF03-03); `clearTimeout` ao trocar `activeId`.

**Por quê:** RF03 e RF08 são ortogonais. Alternativa rejeitada: só temporário — perderia gutters estáveis; só persistente — falharia CA-RF03-03.

### D5 — Wiring com C08: `selectAlert` + `visibleSeverities`

- Clique no card → `selectAlert(id)` + `focusAlert(id)` (reveal + temp highlight).
- Clique no gutter → resolve `id` da decoration/meta → `selectAlert(id)` + `scrollIntoView` do card (`data-alert-id`).
- Filtro → recompute decorações; severidades ocultas não geram gutter (CT06).

Clique em severidade filtrada não ocorre (sem glyph). Cards RESOLVED: sem decorações; C10 chama `clearHighlight`.

**RNF03:** nenhum token; sem persistir ranges em `localStorage`.

### D6 — `GutterMarkers` como factory/CSS, não segundo editor

`components/Editor/GutterMarkers.tsx` (ou `severityDecorations.ts`) só mapeia severity → opções de decoration + classNames. O hook aplica. Evita segundo Monaco.

**Por quê:** proposal lista o artefato; manter diff cirúrgico.

### D7 — Performance CT08

Batch de decorações em um único `deltaDecorations` por sync; debounce leve (~16–32 ms) só se ingestão em massa (C11) disparar muitas atualizações — nesta mudança sync é síncrono por clique/filtro. Sem virtualização de gutters.

**RNF02:** N/A (sem analyze). Latência alvo de UX: **< 300 ms** (CA-RF03-01) via `revealLine*` + rAF se necessário para scroll do painel.

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| Decorações órfãs após trocar `content` | Limpar todos os IDs quando `content`/modelo muda; re-sync a partir da lista de alertas |
| Instância Monaco null no primeiro clique | Guard no hook; fila no-op até `registerEditor` |
| C08 ainda não aplicado (`selectAlert` ausente) | Apply C09 após C07+C08; stub mínimo de `activeId` só se bloqueado — preferir dependência real |
| Clique no glyph vs seleção de texto | Filtrar `target.type` / `glyphMargin` no handler Monaco |
| Tint design.md (0.12) ≠ RF08 (0.15) | RF08 vence no editor; cards C08 seguem design.md |

**Trade-off:** glyph margin consome coluna horizontal — aceitável no Central Stage desktop; em mobile tabbed o gutter permanece (RNF04).

## Migration Plan

Depende de C07 (Monaco + `useEditor`) e C08 (`useAlerts` / filtros / `activeId`) aplicados. Sem migração de dados. Rollback = revert dos arquivos frontend desta change. Após apply:

```bash
cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build
```

Browser: fixture com 2+ alertas → clique card → scroll/highlight → clique gutter → card `active`; CT06 desligar MEDIUM → gutters MEDIUM somem.

## Open Questions

Nenhuma que altere specs. Mapeamento glyph vs `linesDecorationsClassName` é detalhe de implementação desde que CA-RF08-01/02 passem.
