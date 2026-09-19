## Context

The frontend application provides the user-facing web dashboard for the CodeReview Agent. It renders the analysis queue, metric summaries, and severity indicators. See `proposal.md` for motivation and functional scope.

The frontend is located in `opencode/frontend/` as a SPA built with Vite, React, and TypeScript. It consumes backend REST endpoints (`GET /api/v1/analyses` and `GET /api/v1/analyses/summary`) created in CH-06. The visual styling adheres strictly to the "Obsidian Autonomous Intelligence" design system from the Stitch prototype (screen `05a4aa18`).

## Goals / Non-Goals

**Goals:**
- Establish `opencode/frontend/` project structure using Vite + React + TypeScript.
- Implement design system tokens in `src/styles/tokens.css` matching Stitch specs (Obsidian dark theme, Geist font for UI, JetBrains Mono for code/metrics, Indigo `#6366f1` primary accent).
- Build reusable UI components: `SeverityBadge`, `StatusChip`, `MetricCard`, `PRQueueItem`, `Sidebar`.
- Implement `DashboardPage` with KPI summary header, PR queue list, search/severity/status filters, and pagination.
- Create typed API client (`src/api/client.ts`) and React custom hooks (`useAnalyses`) for fetching data.
- Setup React Router DOM for SPA routing (`/` for Dashboard, `/analysis/:id` for Detail).
- Provide unit/integration tests (`Vitest` / `@testing_library/react`) and E2E tests (`Playwright`).

**Non-Goals:**
- User authentication and authorization (future enhancement).
- Detailed analysis view page (handled in CH-08).
- Real-time WebSockets / SSE push updates (handled via simple polling or manual refresh in v1.0).

## Decisions

### Decision 1: Architecture & Styling — Vanilla CSS Tokens vs Tailwind
- **Choice:** Use Vite + React + TypeScript with standard CSS using CSS Variables (`src/styles/tokens.css`).
- **Rationale:** Direct mapping to the Stitch design system tokens (`--bg-primary: #0b0f17`, `--accent-indigo: #6366f1`, etc.). Avoids extra build-tool complexity while maintaining high fidelity with the dark Obsidian aesthetic.
- **Alternatives Considered:** TailwindCSS — rejected to keep CSS minimal and completely aligned with existing token names without requiring Tailwind compiler setup.

### Decision 2: State Management & Data Fetching — Custom React Hooks vs Redux/TanStack Query
- **Choice:** Custom React hooks (`useAnalyses`, `useSummary`) wrapping a typed `fetch` client in `src/api/client.ts`.
- **Rationale:** The application state consists primarily of server-side list data with pagination and filters. Custom hooks with native state (`useState`, `useEffect`) keep bundle size minimal and logic readable.
- **Alternatives Considered:** TanStack Query (React Query) — unnecessary overhead for MVP scope; can be refactored easily if real-time caching needs grow.

### Decision 3: Accessible Dual-Coded Components (`SeverityBadge` & `StatusChip`)
- **Choice:** Render dual indicators (SVG icon + text label + distinct color class) for all severity levels (`CRÍTICO`, `ALTO`, `MÉDIO`, `BAIXO`) and statuses (`APROVADO`, `APROVADO_COM_RESSALVAS`, `REQUER_MUDANCAS`).
- **Rationale:** Complies with accessibility guidelines (WCAG) so users with color vision deficiencies can immediately distinguish critical findings by icon shape and label.

### Decision 4: Dev Server Proxy & CORS
- **Choice:** Configure Vite proxy in `vite.config.ts` mapping `/api` requests to `http://localhost:8000`.
- **Rationale:** Avoids CORS issues in development while serving both static frontend assets and backend API seamlessly.

## Component Hierarchy & Directory Structure

```text
opencode/frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── api/
    │   ├── types.ts
    │   └── client.ts
    ├── components/
    │   ├── MetricCard.tsx
    │   ├── PRQueueItem.tsx
    │   ├── SeverityBadge.tsx
    │   ├── Sidebar.tsx
    │   └── StatusChip.tsx
    ├── hooks/
    │   └── useAnalyses.ts
    ├── pages/
    │   └── DashboardPage.tsx
    └── styles/
        ├── tokens.css
        └── main.css
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Divergence from Stitch prototype design | Use exact CSS variables from `docs/spec.md` and Stitch `05a4aa18` screen spec; verify visually. |
| API mismatch during local development | Define TypeScript interfaces matching CH-06 `schemas/results.py` Pydantic models. |
| Font loading delay | Embed Google Fonts links for Geist and JetBrains Mono in `index.html` head with `font-display: swap`. |

## Migration Plan

1. Scaffold project files in `opencode/frontend/` (`package.json`, `vite.config.ts`, `tsconfig.json`).
2. Add `tokens.css` and base layout in `App.tsx`.
3. Implement core components (`SeverityBadge`, `StatusChip`, `MetricCard`, `PRQueueItem`, `Sidebar`).
4. Implement `api/client.ts` and `useAnalyses` hook.
5. Assemble `DashboardPage` with pagination and filter controls.
6. Write unit tests for components and E2E Playwright test for queue rendering.
