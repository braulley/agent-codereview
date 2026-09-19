## Purpose

Provides the web dashboard interface for viewing the pull request review queue, metrics summary, filtering PR analyses, and navigating to detailed code review findings.

## ADDED Requirements

### Requirement: Frontend Application Setup and Design System
The frontend application SHALL be built as a Single Page Application using Vite, React, and TypeScript located in `opencode/frontend/`, adhering to the "Obsidian Autonomous Intelligence" design system tokens.

#### Scenario: Visual styling and design tokens
- **WHEN** the application renders components
- **THEN** it applies the Obsidian theme with dark mode background (`#0B0F17` / `#111827`), Geist font for body text, JetBrains Mono for metrics and code references, and indigo primary accents (`#6366f1`).

### Requirement: KPI Metrics Summary Display
The dashboard page SHALL display summary KPI metrics for overall PR review activity at the top of the interface.

#### Scenario: Metrics display on dashboard header
- **WHEN** the dashboard page loads summary data from the API
- **THEN** it displays total PRs analyzed, average analysis response time in minutes, and percentage/count of critical severity findings using `MetricCard` components.

### Requirement: PR Queue List and Cards
The dashboard page SHALL display a list of recently analyzed Pull Requests using `PRQueueItem` components.

#### Scenario: Displaying PR queue items
- **WHEN** the PR queue is rendered
- **THEN** each item displays the repository name, PR number, title, author, formatted analysis timestamp, dual-coded `SeverityBadge` (icon + label for CRÍTICO, ALTO, MÉDIO, BAIXO), `StatusChip` (APROVADO, APROVADO_COM_RESSALVAS, REQUER_MUDANCAS), and total issue counts.

### Requirement: Dual-coded Severity Badges and Status Chips
The application SHALL render dual-coded severity badges and status chips with distinct visual indicators and accessible text labels.

#### Scenario: Critical severity badge rendering
- **WHEN** a PR has a maximum severity of CRÍTICO
- **THEN** the `SeverityBadge` displays a red alert icon alongside the text "CRÍTICO" and applies high-contrast alert styling.

#### Scenario: Status chip rendering for required changes
- **WHEN** an analysis recommendation is REQUER_MUDANCAS
- **THEN** the `StatusChip` renders with a red background chip and the text "REQUER MUDANÇAS".

### Requirement: Queue Filtering and Pagination
The dashboard page SHALL allow users to filter the PR queue by repository name, severity level, and review status, and navigate through paginated results.

#### Scenario: Filtering PR queue by severity
- **WHEN** the user selects the "CRÍTICO" severity filter
- **THEN** the API client fetches filtered results and the queue displays only PR analyses containing critical severity issues.

#### Scenario: Navigating paginated results
- **WHEN** the user clicks page 2 in the queue pagination controls
- **THEN** the application requests page 2 from the API and updates the displayed PR items.

### Requirement: API Client Integration
The application SHALL include a typed API client (`src/api/client.ts`) that fetches data from the FastAPI REST endpoints (`GET /api/v1/analyses` and `GET /api/v1/analyses/summary`).

#### Scenario: Fetching PR analyses list from backend
- **WHEN** `fetchAnalyses` is called with pagination and filter params
- **THEN** it sends an HTTP GET request to `/api/v1/analyses` and parses the paginated response structure.

### Requirement: Navigation to Analysis Details
The application SHALL support SPA routing via React Router and allow clicking a PR queue item to navigate to the detailed analysis view at `/analysis/:id`.

#### Scenario: Clicking PR item navigates to detail route
- **WHEN** a user clicks on a PR card in the queue
- **THEN** React Router navigates the user to `/analysis/:id` passing the selected analysis ID.
