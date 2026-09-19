## Context

This design outlines the implementation of metadata persistence and REST API endpoints for analysis results in CodeReview Agent. See [proposal.md](proposal.md) for background and motivation.

Affected components:
- `opencode/src/config/database.py` (database connection & session management)
- `opencode/src/core/analyzer/repository.py` (data access layer for analysis results)
- `opencode/src/api/results.py` (REST API router for frontend consumption)
- `opencode/src/core/analyzer/orchestrator.py` (persistence invocation after review execution)
- `opencode/src/main.py` (route registration and database startup initialization)

## Goals / Non-Goals

**Goals:**
- Provide asynchronous SQLite persistence for analysis execution metadata via SQLAlchemy + `aiosqlite`.
- Expose REST API endpoints for querying historical analysis runs, detailed results, and issues.
- Update `/health` endpoint to verify database and Redis connectivity.
- Enforce strict compliance with RNF-07 (zero persistence of code diffs).

**Non-Goals:**
- PostgreSQL database setup (deferred to CH-10).
- User authentication and authorization on REST endpoints (post-MVP).
- WebSocket or real-time streaming updates.

## Decisions

### Decision 1: Async SQLAlchemy with `aiosqlite` Driver
- **Choice:** Use SQLAlchemy 2.0 async ORM with `aiosqlite` as the database engine for SQLite.
- **Rationale:** Ensures non-blocking database I/O within FastAPI's async event loop. Provides a clean ORM model while maintaining high performance.
- **Alternatives Considered:**
  - Standard `sqlite3` driver: Synchronous blocking calls could freeze event loop threads.
  - Raw `aiosqlite` SQL queries: Lacks ORM type safety and schema mapping conveniences.

### Decision 2: Repository Pattern (`AnalysisRepository`)
- **Choice:** Encapsulate database interactions in `AnalysisRepository` with methods `save_result`, `get_result`, and `list_results`.
- **Rationale:** Decouples core business orchestrator and API routes from raw database operations, facilitating unit testing via mock repositories.
- **Alternatives Considered:** Direct SQLAlchemy queries inside FastAPI route functions.

### Decision 3: Metadata-Only Persistence (RNF-07 Compliance)
- **Choice:** The DB model `AnalysisResultTable` stores only PR metadata, severity counts, list of classified issues, model version, and timing metrics. Diff content is explicitly excluded.
- **Rationale:** Strict compliance with privacy and security requirement RNF-07.
- **Alternatives Considered:** Storing diff files in DB or local disk (rejected due to RNF-07).

## Risks / Trade-offs

- **SQLite Concurrency Limitation:**
  - *Risk:* Concurrent writes from multiple worker tasks might hit database lock contention.
  - *Mitigation:* Enable WAL (Write-Ahead Logging) mode on connection init and keep database transactions short and isolated. SQLite is fully sufficient for MVP workloads.

- **Data Privacy Leakage:**
  - *Risk:* Accidental storage of raw code diffs in issue fields.
  - *Mitigation:* Explicit schema definition and dedicated unit test `test_diff_content_not_persisted`.
