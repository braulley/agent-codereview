## Why

O shell three-pane de C06 deixa o Left Telemetry Rail e o drawer sem lista de achados, filtros ou gauge. Sem o painel, RF02 não é visível, CT03/CT06 não têm UI, e C09–C11 não têm `useAlerts` para hidratar. Esta mudança é **MVP**.

## What Changes

- Preencher `frontend/components/AlertPanel/` com lista de cards RF02 (snake_case), chips de severidade e estado vazio positivo.
- Exibir Code Health Score no rail via `frontend/components/HealthDashboard/` (fórmula já em C06 `client-health-score`).
- Hook `useAlerts`: sessão **somente em memória** (ADR-02); `addAlert` / ingestão de eventos com o formato SSE `alert` | `score` | `done`; `toggleFilter`; `resolveAlert` para C10.
- Filtros **apenas por severidade** (RF05); default todos ligados; chips `CRITICAL (N)` … `LOW (N)`; < 100 ms, sem round-trip.
- Score na UI: `max(0, 100 - (CRITICAL×25 + HIGH×10 + MEDIUM×3 + LOW×1))`; faixas EXCELLENT/GOOD/ATTENTION/CRITICAL (`docs/design.md`). Recálculo local a partir de alertas **OPEN**.
- Payload RF02 inválido no ingest: toast; **editor e sessão permanecem**. Sem `fetch` Gemini.

### Non-goals (MVP; fora desta mudança)

- `useSSE` / `POST /api/analyze` real, retry RF10, banner offline (C11).
- Gutter, scroll bidirecional, highlight Monaco (C09). Ocultar gutter ao filtrar: C08 só exporta severidades visíveis.
- Botão **Aplicar Correção** funcional e Ctrl+Z (C10); C08 deixa stub desabilitado.
- Filtro por **categoria** (roadmap/Stitch vs RF05): só badge no card.
- Persistência, Redis, `NEXT_PUBLIC_*` de chaves, chamada Gemini no browser.
- Health check HTTP (`GET /api/health`) além do gauge de score.

## Capabilities

### New Capabilities

- `alert-panel`: cards RF02, lista filtrável, empty CT03, ingestão tipada `alert|score|done`, toast de schema, `useAlerts`.
- `severity-filters`: chips RF05 / CT06 (cards); contrato de visibilidade para C09.
- `health-dashboard`: gauge + breakdown RF06 / CT03 (render; fórmula C06).

### Modified Capabilities

- Nenhuma. `openspec/specs/` está vazio. Não alterar `client-health-score` (C06) nem `health-score` (C03).

## Impact

- **Código:** `frontend/components/AlertPanel/*`, `HealthDashboard/*`, `hooks/useAlerts.ts`, slots do rail em `app/page.tsx` (após C06). `AlertPanel/` hoje é só `.gitkeep`.
- **APIs:** nenhum endpoint novo. Ingestão **consome o contrato** §5 (`alert|score|done`); transport SSE = C11. **Não** altera latência TTFA do backend (RNF02).
- **RFs/RNFs:** RF02 (exibição), RF05, RF06, RNF03, RNF04 (≤50 cards), RNF05 empty/toast local. CT03 e CT06 (cards). Gutter CT06 → C09. CT04/CT07/CT08 editor → C11/C10/C07.
- **Segurança:** sem chaves no bundle; sem persistir código/diff; toast não loga suggestion/código.
- **Dependências:** C06 (tipos, `calculateHealthScore`, `SeverityBadge`, `ToastHost`, shell). C07 paralelo (editor permanece se o ingest falhar). Bloqueia C09/C10/C11.
- **Breaking:** nenhum.
