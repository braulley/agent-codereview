## Purpose

Provides an HTTP endpoint to receive, authenticate via HMAC-SHA256, filter, and enqueue GitHub webhook pull_request events for asynchronous analysis.

## ADDED Requirements

### Requirement: Webhook Authentication
The system SHALL validate the `X-Hub-Signature-256` header of incoming `POST /webhooks/github` requests using HMAC-SHA256 with constant-time byte comparison (`hmac.compare_digest`).

#### Scenario: Valid HMAC signature
- **WHEN** a webhook request is received with a valid `X-Hub-Signature-256` header matching the configured secret
- **THEN** the system accepts the request for processing

#### Scenario: Invalid HMAC signature
- **WHEN** a webhook request is received with an invalid `X-Hub-Signature-256` header
- **THEN** the system SHALL reject the request with `HTTP 401 Unauthorized` and log a security audit entry without leaking secrets

#### Scenario: Missing HMAC signature header
- **WHEN** a webhook request is received without an `X-Hub-Signature-256` header
- **THEN** the system SHALL reject the request with `HTTP 401 Unauthorized`

### Requirement: Event Filtering and Validation
The system SHALL accept only `X-GitHub-Event: pull_request` events with `action` equal to `opened` or `synchronize`.

#### Scenario: Supported pull request actions
- **WHEN** a valid webhook request is received with `action` set to `opened` or `synchronize`
- **THEN** the system SHALL parse the payload into the `GitHubPullRequestEvent` schema

#### Scenario: Unsupported action or event type
- **WHEN** a webhook request is received with an action other than `opened` or `synchronize` (e.g. `closed`, `labeled`), or a non-`pull_request` event type
- **THEN** the system SHALL reject the request with `HTTP 400 Bad Request`

### Requirement: Asynchronous Queueing and Fast ACK
The system SHALL enqueue valid `pull_request` events into the Redis stream/queue and return `HTTP 202 Accepted` with a confirmation payload within 3 seconds.

#### Scenario: Successful event enqueueing
- **WHEN** a valid `opened` or `synchronize` `pull_request` event is received
- **THEN** the system SHALL publish the event to the queue and return `HTTP 202 Accepted` within 3 seconds

#### Scenario: Queue service unavailable
- **WHEN** publishing to the queue fails due to connection or infrastructure errors
- **THEN** the system SHALL return `HTTP 500 Internal Server Error` and log the error context with `request_id`
