## Purpose

Provides persistence for analysis execution metadata and REST API endpoints for retrieving historical code review results and system health status.

## ADDED Requirements

### Requirement: Analysis Metadata Persistence
The system SHALL persist analysis metadata (analysis ID, repository name, PR ID, timestamp, model version, total issues count, severity counts, and overall recommendation) to the SQLite database without storing source code or diff contents.

#### Scenario: Successful metadata save
- **WHEN** an analysis is completed by the orchestrator
- **THEN** the metadata is persisted in the database and source code or diff content is excluded from storage

#### Scenario: Retrieval by analysis ID
- **WHEN** a request is made for a specific analysis ID
- **THEN** the system returns the corresponding analysis metadata record if it exists

### Requirement: Analysis List Endpoint
The system SHALL provide a `GET /api/v1/analyses` REST endpoint returning a paginated list of completed analyses, with optional filtering by repository.

#### Scenario: Paginated listing request
- **WHEN** a GET request is sent to `/api/v1/analyses` with `page` and `limit` parameters
- **THEN** the system returns a JSON list of analysis metadata items matching the pagination parameters

#### Scenario: Filter listing by repository
- **WHEN** a GET request is sent to `/api/v1/analyses` with a `repo` query parameter
- **THEN** the system returns only analysis results matching that repository name

### Requirement: Analysis Detail Endpoint
The system SHALL provide a `GET /api/v1/analyses/{analysis_id}` REST endpoint returning detailed metadata for a specific analysis.

#### Scenario: Detail request for existing analysis
- **WHEN** a GET request is sent to `/api/v1/analyses/{analysis_id}` with a valid ID
- **THEN** the system returns full metadata details and HTTP 200 OK

#### Scenario: Detail request for non-existent analysis
- **WHEN** a GET request is sent to `/api/v1/analyses/{analysis_id}` with an invalid ID
- **THEN** the system returns an HTTP 404 Not Found error response

### Requirement: Analysis Issues Endpoint
The system SHALL provide a `GET /api/v1/analyses/{analysis_id}/issues` REST endpoint returning the list of detected issues for a specific analysis.

#### Scenario: Retrieve issues for valid analysis
- **WHEN** a GET request is sent to `/api/v1/analyses/{analysis_id}/issues`
- **THEN** the system returns the list of issues classified by severity for that analysis

### Requirement: System Health Endpoint Connectivity Verification
The system SHALL update `GET /health` to verify connectivity status for both Redis and the SQLite database.

#### Scenario: All services healthy
- **WHEN** a GET request is sent to `/health` and both Redis and SQLite are accessible
- **THEN** the system returns HTTP 200 OK with status `healthy` and detailed connectivity status for Redis and Database
