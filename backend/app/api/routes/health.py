"""Health and readiness endpoints.

These endpoints stay intentionally thin so infrastructure checks reflect the
same service behavior exposed elsewhere in the backend.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies import DbSession
from app.core.settings import Settings, get_settings
from app.schemas.health import HealthResponse, ReadyResponse
from app.services.health_service import HealthService

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Expose a lightweight liveness probe without touching external systems."""
    return HealthService().get_health()


@router.get("/ready", response_model=ReadyResponse)
def ready(
    session: DbSession,
    settings: Settings = Depends(get_settings),
) -> ReadyResponse:
    """Expose a readiness probe that reflects current backend dependencies."""
    return HealthService().get_readiness(session=session, settings=settings)
