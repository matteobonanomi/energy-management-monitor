from __future__ import annotations

from sqlalchemy.exc import SQLAlchemyError

from app.core.settings import Settings
from app.services.health_service import HealthService


class FailingSession:
    def execute(self, _query):
        raise SQLAlchemyError("database offline")


def test_health_service_reports_ok() -> None:
    response = HealthService().get_health()

    assert response.status == "ok"
    assert response.service == "api"


def test_readiness_degrades_when_database_is_unavailable() -> None:
    settings = Settings(app_env="test", forecast_service_url="http://forecast-service:8001")

    response = HealthService().get_readiness(FailingSession(), settings)

    assert response.status == "degraded"
    assert response.database == "unavailable"
    assert response.environment == "test"
    assert response.forecast_service_url == "http://forecast-service:8001"
