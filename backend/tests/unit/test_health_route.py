from fastapi.testclient import TestClient

from src.main import app

SECRET_MARKERS = (
    "GEMINI_API_KEY",
    "GITHUB_TOKEN",
    "GITLAB_TOKEN",
    "test-gemini-key-c02",
)


def test_health_returns_200_with_required_fields() -> None:
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["version"]
    assert body["gemini_api"] == "reachable"
    assert body["timestamp"].endswith("Z")
    text = response.text
    for marker in SECRET_MARKERS:
        assert marker not in text
