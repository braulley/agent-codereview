## Context

See `proposal.md` for overall motivation and requirements scope.

This design details the technical implementation of the `POST /webhooks/github` endpoint and the associated messaging publisher. The endpoint serves as the asynchronous entry point for the CodeReview Agent, handling payload receipt, security authentication, payload parsing, and event enqueueing.

### Affected Components
- `opencode/src/api/webhooks/github.py`: Webhook receiver router and endpoint logic.
- `opencode/src/api/models.py`: Pydantic models for GitHub webhook payloads and acknowledgment responses.
- `opencode/src/queue/publisher.py`: Redis Streams message publisher interface.
- `opencode/src/main.py`: Route registration for `/webhooks/github`.

## Goals / Non-Goals

**Goals:**
- Provide a low-latency endpoint returning `HTTP 202 Accepted` in < 3 seconds (RNF-02).
- Enforce HMAC-SHA256 signature verification on raw request body bytes to satisfy RNF-09.
- Ensure strict typing (Mypy strict) and 100% decoupling from downstream LLM analysis or GitHub API calls.
- Enqueue valid `opened` and `synchronize` `pull_request` events to a Redis Stream for asynchronous worker consumption.

**Non-Goals:**
- Worker consumption or diff fetching logic (handled in CH-03).
- Inline commenting or review posting (handled in CH-05).
- Webhook retries on worker failure (handled in CH-03).

## Decisions

### Decision 1: Signature Verification on Raw Request Body
- **Approach**: Compute HMAC-SHA256 digest using `settings.GITHUB_WEBHOOK_SECRET` and compare against `X-Hub-Signature-256` header (format: `sha256=<hex_digest>`).
- **Rationale**: HMAC validation must be performed against the exact raw byte payload sent by GitHub before any JSON deserialization or whitespace alteration. Using `hmac.compare_digest()` prevents timing attacks.
- **Alternatives Considered**: Validating parsed JSON dictionary — rejected because JSON formatting variations break HMAC digest equality.

### Decision 2: Redis Streams for Async Messaging
- **Approach**: Implement `EventQueuePublisher` in `opencode/src/queue/publisher.py` using `redis.asyncio` `xadd()` to append event objects to stream `events:github:pull_request`.
- **Rationale**: Lightweight, high throughput, low latency (<5ms enqueueing), supported natively in Redis without extra infra overhead for MVP.
- **Alternatives Considered**: In-memory Python `asyncio.Queue` — rejected due to lack of persistence across process restarts.

### Decision 3: Explicit Payload Schemas (`GitHubPullRequestEvent`)
- **Approach**: Define clean Pydantic v2 schemas extracting essential fields (`action`, `number`, `pull_request.head.sha`, `pull_request.base.ref`, `repository.full_name`).
- **Rationale**: Isolates internal domain models from unexpected extra fields sent in GitHub's webhook payloads while enforcing data integrity.

## Risks / Trade-offs

- **[Timing attack vulnerability]** → Mitigation: Enforce `hmac.compare_digest()` for all signature comparisons.
- **[Redis connectivity failure]** → Mitigation: Catch connection errors, log error context with `request_id`, and return `HTTP 500 Internal Server Error`.
- **[Body stream consumption in FastAPI]** → Mitigation: Extract raw body bytes using `await request.body()` within an explicit dependency or router parameter.
