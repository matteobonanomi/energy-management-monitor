from __future__ import annotations

from datetime import datetime, timezone

import structlog
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.settings import Settings
from app.schemas.health import HealthResponse, ReadyResponse

logger = structlog.get_logger(__name__)


class HealthService:
    def get_health(self) -> HealthResponse:
        return HealthResponse(status="ok", service="api")

    def get_readiness(self, session: Session, settings: Settings) -> ReadyResponse:
        database_status = "ok"
        readiness_status = "ready"
        try:
            session.execute(text("SELECT 1"))
        except SQLAlchemyError as exc:
            database_status = "unavailable"
            readiness_status = "degraded"
            logger.warning("database_not_ready", error=str(exc))

        return ReadyResponse(
            status=readiness_status,
            service="api",
            environment=settings.app_env,
            database=database_status,
            forecast_service_url=settings.forecast_service_url,
            timestamp=datetime.now(timezone.utc),
        )
