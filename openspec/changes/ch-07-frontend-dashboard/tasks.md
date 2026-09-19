## 1. Project Setup & Design System Foundation

- [x] 1.1 Create Vite project structure in `opencode/frontend/` with `package.json`, `vite.config.ts`, `tsconfig.json`, and `index.html` configured with Google Fonts (Geist, JetBrains Mono) and dev server proxy to FastAPI. Verify with `npm install` (or `npx tsc --noEmit`).
- [x] 1.2 Implement design system tokens in `src/styles/tokens.css` and base reset in `src/styles/main.css` implementing Obsidian Autonomous Intelligence dark theme variables (`--bg-primary`, `--accent-indigo`, etc.). Verify stylesheets compile cleanly without CSS errors.

## 2. API Client & Data Types

- [x] 2.1 Define TypeScript interfaces in `src/api/types.ts` for PR analysis results, summary metrics, severity levels, and paginated responses corresponding to CH-06 backend schemas. Verify `npx tsc --noEmit` succeeds.
- [x] 2.2 Implement typed HTTP client in `src/api/client.ts` with `fetchAnalyses` and `fetchSummary` methods. Verify unit test in `src/__tests__/api/client.test.ts` passes with mocked responses.
- [x] 2.3 Implement `useAnalyses` custom hook in `src/hooks/useAnalyses.ts` handling data fetching, loading state, error state, pagination, and filter query parameters. Verify hook behavior with unit tests.

## 3. UI Components

- [x] 3.1 Implement dual-coded `SeverityBadge` component in `src/components/SeverityBadge.tsx` displaying icon and label for CRÍTICO, ALTO, MÉDIO, BAIXO. Verify rendering unit test in `src/__tests__/components/SeverityBadge.test.tsx`.
- [x] 3.2 Implement `StatusChip` component in `src/components/StatusChip.tsx` displaying APROVADO, APROVADO_COM_RESSALVAS, REQUER_MUDANCAS. Verify rendering unit test in `src/__tests__/components/StatusChip.test.tsx`.
- [x] 3.3 Implement `MetricCard` component in `src/components/MetricCard.tsx` for displaying KPI numbers in JetBrains Mono font. Verify unit test in `src/__tests__/components/MetricCard.test.tsx`.
- [x] 3.4 Implement `PRQueueItem` card component in `src/components/PRQueueItem.tsx` displaying repo, PR number, title, author, badges, timestamp, and issue count. Verify unit test in `src/__tests__/components/PRQueueItem.test.tsx`.
- [x] 3.5 Implement `Sidebar` collapsible navigation menu in `src/components/Sidebar.tsx`. Verify unit test for collapse/expand behavior.

## 4. Dashboard Page Assembly & Routing

- [x] 4.1 Implement `DashboardPage` in `src/pages/DashboardPage.tsx` integrating KPI header metrics, PR queue list, pagination controls, and severity/status filter dropdowns. Verify component integration unit test in `src/__tests__/pages/DashboardPage.test.tsx`.
- [x] 4.2 Configure SPA routing in `src/App.tsx` with React Router DOM mapping `/` to `DashboardPage` and `/analysis/:id` placeholder route. Verify routing navigation in tests.

## 5. Quality, E2E & Validation

- [x] 5.1 Run TypeScript typecheck and ESLint linting across `opencode/frontend/`. Verify `npx tsc --noEmit` and `npx eslint src --ext .ts,.tsx` return 0 errors.
- [x] 5.2 Implement Playwright E2E test in `tests/e2e/frontend/test_dashboard.spec.ts` verifying PR queue list rendering, severity badge visibility, and click navigation to analysis detail. Verify test runs cleanly against frontend dev server.
