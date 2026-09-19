## Purpose

Prover uma API de agregados e métricas de qualidade de código, juntamente com um painel interativo (Dashboard & Analytics) no frontend para visualização de tendências, KPIs e exportação de relatórios em CSV.

## ADDED Requirements

### Requirement: Summary Metrics Aggregation
The system SHALL provide an API endpoint `GET /api/v1/metrics/summary` that returns aggregated quality metrics, including total analyzed PRs, average analysis duration (p50 and p95), and issue counts categorized by severity (CRÍTICO, ALTO, MÉDIO, BAIXO).

#### Scenario: Retrieve summary metrics
- **WHEN** client sends a GET request to `/api/v1/metrics/summary`
- **THEN** the system returns a 200 OK JSON response containing total PRs, average duration metrics, and severity distributions.

### Requirement: Historical Quality Trends
The system SHALL provide an API endpoint `GET /api/v1/metrics/trend` that accepts query parameters for repository filter (`repo`) and time period (`days`), returning time-series data of identified code quality issues grouped by date and severity.

#### Scenario: Retrieve quality trends with filters
- **WHEN** client requests `/api/v1/metrics/trend?repo=org/repo&days=30`
- **THEN** the system returns time-series data filtered for the specified repository and time range.

### Requirement: Top Recurrent Issues
The system SHALL provide an API endpoint `GET /api/v1/metrics/top-issues` returning the top recurrent issue categories (such as OWASP categories or anti-patterns) sorted by frequency up to a specified limit.

#### Scenario: Retrieve top recurrent issue categories
- **WHEN** client sends a GET request to `/api/v1/metrics/top-issues?limit=10`
- **THEN** the system returns a JSON list of the top 10 most frequent issue categories with their respective counts.

### Requirement: Metrics CSV Export
The system SHALL provide an API endpoint `GET /api/v1/metrics/export` with `format=csv` that exports analysis results and aggregated metrics in CSV format with appropriate HTTP headers (`Content-Type: text/csv`).

#### Scenario: Download metrics CSV file
- **WHEN** client requests `/api/v1/metrics/export?format=csv`
- **THEN** the system returns a 200 OK response with a CSV file download attachment containing analysis metrics data.

### Requirement: Frontend Metrics Dashboard Interface
The frontend SHALL present a dedicated `MetricsPage` (`/metrics`) displaying KPI summary cards, interactive charts for quality trends (using Recharts), top issues breakdown, repository risk scores, and a CSV export button aligned with prototype `0201399c`.

#### Scenario: Render metrics page
- **WHEN** user navigates to `/metrics`
- **THEN** the page displays KPI cards, trend charts, top issue breakdown, repository risk table, and the CSV export trigger.
