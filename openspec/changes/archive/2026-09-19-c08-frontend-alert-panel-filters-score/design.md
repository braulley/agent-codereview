## Context

Camada afetada: **somente `frontend/`** (`components/AlertPanel`, `components/HealthDashboard`, `hooks/useAlerts`, parser de schema em `lib/`, slots do shell em `app/page.tsx`). Nenhum módulo `backend/src/core/`.

Estado observado: `frontend/components/AlertPanel/` e `HealthDashboard/` são `.gitkeep`; a home ainda é o boilerplate Next (C06 pode não estar aplicado). Tipos RF02, `calculateHealthScore` / `healthBand`, `SeverityBadge` e `ToastHost` são de C06.

Motivação: ver `proposal.md` (Why). Comportamento: specs `alert-panel`, `severity-filters`, `health-dashboard`.

Fluxo `POST /api/analyze` → SSE → Monaco **não é aberto nesta mudança**. **RNF02** (TTFA ≤ 1.500 ms) não é exercitado; `addAlert` incremental deixa C11 anexar o primeiro `alert` sem batch. **RNF01** no client = type guard RF02 antes de mutar a sessão (a validação Pydantic continua no backend). **RNF03**: sem chaves no bundle; sessão só em memória.

## Goals / Non-Goals

**Goals:**

- Um store de sessão no cliente que C09–C11 hidratam sem Zustand/Redux.
- UI Telemetry Triage (`docs/design.md`: 0px radius, L1/L2, chips, gauge) nos slots three-pane.
- Parser síncrono de alerta/score/done testável com fixtures CT01–CT03/CT06, sem rede.

**Non-Goals (nível de design):**

- `EventSource` / `fetch` + `ReadableStream` (C11).
- Decorações Monaco (C09) e `executeEdits` (C10).
- Recalcular a fórmula em duplicata: reutilizar `lib/health-score.ts` de C06.
- Dependência nova (Zod, estado global).

## Decisions

### D1 — Rail = score + filtros; drawer = cards

`docs/design.md`: Left Telemetry Rail (280–340px) = gauge + chips + breakdown; Right Action Drawer (320–420px) = lista de `AlertCard` (descrição, suggestion, stub Aplicar Correção). Viewport < 1024px: aba Telemetry = D1 rail; aba Remediation = cards (shell C06).

**Por quê:** une Stitch (“Alert Panel à direita”), o rail de score, e o “painel lateral” de RF05. Alternativa rejeitada: tudo no rail — cards longos esmagam o gauge.

### D2 — `useAlerts` em memória, sem store global

Um hook `'use client'` na página (ou provider mínimo só se C07/C08 brigarem pelo `page.tsx`): `alerts` com `status: OPEN | RESOLVED`, `visibleSeverities: Set<Severity>` (default os quatro), `activeId`, `lastScore`, `analysisDone`. Métodos: `ingest(event)`, `toggleFilter`, `resolveAlert` / `unresolveAlert` (C10), `selectAlert` (C09). `filteredAlerts` via `useMemo`.

**Por quê:** ADR-02 e architecture.md. Alternativa rejeitada: Zustand — C06 já proibiu store global no MVP.

### D3 — Ingestão = união SSE de C06, sem I/O

`ingest` aceita `SseEvent` (`alert` | `score` | `done`) já tipado em C06. C11 só chama `ingest` por evento. Testes e um helper de fixture exercitam o mesmo caminho. MUST NOT importar SDK Gemini nem `NEXT_PUBLIC_GEMINI_*`.

**RNF02:** zero round-trip no filtro/score local. **RNF01:** eventos `alert` passam por D4 antes da lista.

### D4 — Validador RF02 sem Zod

`frontend/lib/alert-schema.ts`: função pura que verifica required, enums, `line_end >= line_start`, UUID de `id`. Falha → toast via `ToastHost` C06; mensagem genérica (`Alerta ignorado: formato inválido`); **não** interpolar `suggestion`/código. Editor (C07) não é desmontado.

**Por quê:** AGENTS.md pede pedir antes de nova dependência; o backend já valida com Pydantic. Alternativa rejeitada: Zod.

### D5 — Score visível = recálculo local dos OPEN

`HealthDashboard` chama `calculateHealthScore` + `healthBand` nos alertas `OPEN`. Evento `score` é guardado mas **não** substitui o número após resolve/ingest. Filtros não entram na fórmula.

**Por quê:** CA-RF06-04 / C10. Alternativa rejeitada: confiar só no SSE `score` — ficaria stale ao resolver.

### D6 — Visual Stitch / design.md, sem animação obrigatória

Cards: L1 `#111827`, hairline `#1F2937`, barra esquerda 3px nas cores CRITICAL `#EF4444` / HIGH `#F97316` / MEDIUM `#EAB308` / LOW `#3B82F6`. Chips inativos: dim (`opacity` ou texto `#9CA3AF`), `aria-pressed`. Gauge: número `display-hero` + barra segmentada 0-radius; labels EXCELLENT/GOOD/ATTENTION/CRITICAL (não os rótulos PT do spec). Botão Aplicar Correção: estilo primary mas `disabled`. Sem `backdrop-filter`. Lista: scroll próprio; até 50 cards sem virtualização (RNF04).

**Por quê:** `docs/design.md` Components. Alternativa rejeitada: filtro por categoria (roadmap) — RF05 não pede.

### D7 — Contrato para C09

Exportar `visibleSeverities` e `selectAlert`. Clique no card só marca `active` (borda L3 / beacon). Scroll Monaco = C09.

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| C06/C07 e C08 editam `page.tsx` em paralelo | C08 só substitui slots `aria-label` do rail/drawer; merge cirúrgico |
| 50 cards com suggestion longa | `useMemo` no filtro; lista nativa; CT de volume no painel |
| ToastHost C06 ainda não aplicado | Apply C08 depois de C06; fallback: `role="alert"` |
| Parser client ≠ Pydantic | Fixtures iguais ao spec RF02; C11 trata envelope HTTP |
| Usuário espera filtro de categoria (design.md rail) | Badge `[SECURITY]` no card; chips só severidade (spec) |

**Trade-off:** HealthDashboard entra nesta mudança (C06 deixou o gauge para C08; RF06 exige UI). Não é o probe `GET /api/health`.

## Migration Plan

Depende de C06 aplicado (tipos + shell + `health-score` + toast). Sem migração de dados. Rollback = revert. Após apply: `cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build` exit 0. Browser: fixture CT03 (vazio + 100) e CT06 (desligar LOW/MEDIUM).

## Open Questions

Nenhuma que altere specs. Proxy Next → FastAPI e `useSSE` ficam em C11.
