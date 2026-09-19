## 1. Pydantic Models & Message Publisher Setup

- [x] 1.1 Create `opencode/src/api/models.py` defining `GitHubPullRequestEvent` and `WebhookAckResponse` Pydantic models; verify by importing and instantiating models in pytest.
- [x] 1.2 Implement `opencode/src/queue/publisher.py` for publishing event payloads to Redis Streams; verify unit tests in `opencode/tests/unit/queue/test_publisher.py` pass with mock Redis client.

## 2. Webhook Receiver Endpoint & Security

- [x] 2.1 Implement HMAC-SHA256 signature verification helper using `hmac.compare_digest()` in `opencode/src/api/webhooks/github.py`; verify signature rejection tests pass.
- [x] 2.2 Implement `POST /webhooks/github` router in `opencode/src/api/webhooks/github.py` filtering for `opened` and `synchronize` actions, enqueueing valid events, and registering the router in `opencode/src/main.py`.
- [x] 2.3 Create comprehensive unit tests in `opencode/tests/unit/api/test_webhook_receiver.py` covering valid HMAC signature, invalid signature (401), missing header (401), unsupported actions (400), and valid 202 response; verify with `pytest opencode/tests/unit/api/test_webhook_receiver.py`.

## 3. Integration Testing & Quality Gates

- [x] 3.1 Create integration test `opencode/tests/integration/test_webhook_to_queue.py` verifying HTTP POST to `/webhooks/github` enqueues message to Redis Stream; verify with `pytest opencode/tests/integration`.
- [x] 3.2 Run static code analysis and format checks using `ruff check opencode/src/api opencode/src/queue` and `mypy opencode/src/api opencode/src/queue --strict`; verify command completes with zero errors.
