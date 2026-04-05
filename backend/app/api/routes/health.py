from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies import DbSession
from app.core.settings import Settings, get_settings
from app.schemas.health import HealthResponse, ReadyResponse
from app.services.health_service import HealthService

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthService().get_health()


@router.get("/ready", response_model=ReadyResponse)
def ready(
    session: DbSession,
    settings: Settings = Depends(get_settings),
) -> ReadyResponse:
    return HealthService().get_readiness(session=session, settings=settings)
