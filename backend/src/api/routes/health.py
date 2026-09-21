from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from src.api.dependencies import Settings, get_settings

router = APIRouter(prefix="/api", tags=["health"])


class HealthResponse(BaseModel):
    status: Literal["healthy"]
    version: str
    gemini_api: Literal["reachable", "unreachable"]
    timestamp: str


@router.get("/health", response_model=HealthResponse)
def get_health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    key = settings.gemini_api_key.get_secret_value().strip()
    gemini_api: Literal["reachable", "unreachable"] = (
        "reachable" if key else "unreachable"
    )
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        gemini_api=gemini_api,
        timestamp=datetime.now(UTC).isoformat().replace("+00:00", "Z"),
    )
