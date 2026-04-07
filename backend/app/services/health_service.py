"""Service logic for health and readiness probes.

Health endpoints remain simple on purpose, but isolating them here keeps probe
policy testable and out of HTTP route functions.
"""

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
    """Encapsulate probe semantics for liveness and dependency readiness."""

    def get_health(self) -> HealthResponse:
        """Expose a stable liveness contract with no downstream dependency checks."""
        return HealthResponse(status="ok", service="api")

    def get_readiness(self, session: Session, settings: Settings) -> ReadyResponse:
        """Report dependency readiness without leaking SQL exceptions to clients."""
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
