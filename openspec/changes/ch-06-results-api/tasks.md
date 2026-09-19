## 1. Database Setup & Infrastructure

- [x] 1.1 Implement `opencode/src/config/database.py` using SQLAlchemy async engine and `aiosqlite` for local SQLite persistence.
- [x] 1.2 Write unit tests in `opencode/tests/unit/config/test_database.py` verifying engine setup and table creation.

## 2. Analysis Metadata Persistence Layer

- [x] 2.1 Define `AnalysisResultTable` schema in `opencode/src/core/analyzer/repository.py` ensuring strict exclusion of code diffs (RNF-07).
- [x] 2.2 Implement `AnalysisRepository` class methods: `save_result`, `get_result`, and `list_results`.
- [x] 2.3 Write unit tests in `opencode/tests/unit/core/analyzer/test_repository.py` validating save/get roundtrip, repository filter, pagination, and diff non-persistence.

## 3. Results REST API & Health Check

- [x] 3.1 Implement FastAPI router `opencode/src/api/results.py` exposing `GET /api/v1/analyses`, `GET /api/v1/analyses/{analysis_id}`, and `GET /api/v1/analyses/{analysis_id}/issues`.
- [x] 3.2 Update `GET /health` to include SQLite and Redis connectivity verification.
- [x] 3.3 Write unit tests in `opencode/tests/unit/api/test_results_endpoints.py` testing list pagination, detail responses, 404 handling, and health connectivity.

## 4. Pipeline Integration & Integration Tests

- [x] 4.1 Update `opencode/src/core/analyzer/orchestrator.py` to persist `AnalysisResult` via `AnalysisRepository` upon analysis completion.
- [x] 4.2 Write integration tests in `opencode/tests/integration/test_results_api.py` covering end-to-end saving and API retrieval using an in-memory SQLite database.

## 5. Verification & Code Quality

- [x] 5.1 Run static analysis (`ruff check`, `ruff format --check`, `mypy --strict`) and full pytest test suite (`pytest`) to verify all specs pass.
