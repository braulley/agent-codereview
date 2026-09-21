from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.main import unhandled_exception_handler


def test_unhandled_error_returns_envelope_without_secrets() -> None:
    app = FastAPI()
    app.add_exception_handler(Exception, unhandled_exception_handler)

    async def boom() -> None:
        raise RuntimeError("boom GEMINI_API_KEY=should-not-leak")

    app.add_api_route("/api/_test_boom", boom, methods=["GET"])
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/api/_test_boom")
    assert response.status_code == 500
    body = response.json()
    assert "error" in body
    assert "message" in body
    text = response.text
    assert "should-not-leak" not in text
    assert "GEMINI_API_KEY" not in text
