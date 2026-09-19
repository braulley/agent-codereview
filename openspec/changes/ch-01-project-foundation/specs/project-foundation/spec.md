## Purpose

Provides core runtime configuration, base project structure, health status reporting, and local containerized dependency services for the CodeReview Agent.

## ADDED Requirements

### Requirement: Configuration settings loading
The system SHALL load application configuration settings from environment variables using Pydantic Settings and enforce strict validation on required environment variables.

#### Scenario: Successful configuration loading with defaults
- **WHEN** mandatory environment variables (`GITHUB_TOKEN`, `GITHUB_WEBHOOK_SECRET`, `GEMINI_API_KEY`) are present
- **THEN** the system SHALL initialize `Settings` with defined values and default values for optional settings (`REDIS_URL`, `RABBITMQ_URL`, `LOG_LEVEL`).

#### Scenario: Validation error on missing required configuration
- **WHEN** mandatory environment variables (such as `GITHUB_TOKEN`) are missing or empty
- **THEN** the system SHALL fail initialization and raise a validation error.

### Requirement: Health check endpoint
The API service SHALL expose an HTTP GET `/health` endpoint that returns application health status and version without authentication.

#### Scenario: Successful health status query
- **WHEN** an HTTP GET request is sent to `/health`
- **THEN** the system SHALL respond with status `200 OK` and a JSON body containing `{"status": "ok", "version": "1.0.0"}`.

### Requirement: Containerized local development infrastructure
The local development environment configuration SHALL define Redis and RabbitMQ containerized services accessible on standard ports.

#### Scenario: Local containerized services definition
- **WHEN** the local compose stack is executed via `docker-compose up`
- **THEN** Redis SHALL be accessible on port `6379` and RabbitMQ SHALL be accessible on port `5672` (and management interface on `15672`).
