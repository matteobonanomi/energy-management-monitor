from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.dependencies import get_db_session, get_user_action_service
from app.main import create_app
from app.schemas.forecasts import ForecastExecutionResponse, ForecastRunDetailResponse
from app.schemas.events import UserActionTrackingResponse
from app.schemas.shared import TimeSeriesPoint
from tests.test_helpers import create_all_tables, populate_test_data


def build_client() -> tuple[TestClient, Session]:
    engine = create_engine(
        "sqlite://",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    create_all_tables(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    session = session_factory()
    populate_test_data(session)

    app = create_app()

    def override_session() -> Iterator[Session]:
        yield session

    app.dependency_overrides[get_db_session] = override_session
    return TestClient(app), session


def test_health_and_ready_endpoints() -> None:
    client, _session = build_client()

    health_response = client.get("/health")
    ready_response = client.get("/ready")

    assert health_response.status_code == 200
    assert health_response.json()["status"] == "ok"
    assert "x-request-id" in health_response.headers
    assert ready_response.status_code == 200
    assert ready_response.json()["status"] == "ready"
    assert ready_response.json()["database"] == "ok"


def test_filters_and_dashboard_endpoints_return_data() -> None:
    client, _session = build_client()

    filters_response = client.get("/filters")
    summary_response = client.get("/dashboard/summary")
    production_response = client.get("/dashboard/production-series", params={"granularity": "1h", "breakdown_by": "technology"})
    price_response = client.get("/dashboard/price-series", params={"granularity": "1h"})
    comparison_response = client.get("/dashboard/actual-vs-forecast", params={"granularity": "1h"})

    assert filters_response.status_code == 200
    assert len(filters_response.json()["plants"]) == 75

    assert summary_response.status_code == 200
    assert summary_response.json()["active_plants"] == 75

    assert production_response.status_code == 200
    assert production_response.json()["series"]

    assert price_response.status_code == 200
    assert price_response.json()["series"]

    assert comparison_response.status_code == 200
    assert comparison_response.json()["selected_run"]["scope"] == "portfolio"


def test_forecast_run_endpoints_return_data() -> None:
    client, _session = build_client()

    list_response = client.get("/forecasts/runs")
    detail_response = client.get("/forecasts/runs/1")

    assert list_response.status_code == 200
    assert list_response.json()["items"][0]["point_count"] == 24
    assert list_response.json()["items"][0]["signal_type"] == "production"
    assert detail_response.status_code == 200
    assert detail_response.json()["signal_type"] == "production"
    assert len(detail_response.json()["values"]) == 24


def test_forecast_run_detail_returns_not_found_for_unknown_id() -> None:
    client, _session = build_client()

    detail_response = client.get("/forecasts/runs/999")

    assert detail_response.status_code == 404
    assert detail_response.json()["detail"] == "forecast run not found"


def test_forecast_run_execution_endpoint_returns_persisted_runs(monkeypatch) -> None:
    client, _session = build_client()

    def fake_run_forecast(self, session, request):
        return ForecastExecutionResponse(
            requested_targets=["price"],
            granularity="1h",
            horizon="next_24h",
            model_type="arima",
            processing_ms=1450,
            runs=[
                ForecastRunDetailResponse(
                    id=99,
                    scope="portfolio",
                    target_code=None,
                    granularity="1h",
                    horizon="next_24h",
                    signal_type="price",
                    model_name="arima",
                    fallback_used=False,
                    status="completed",
                    started_at=datetime(2026, 1, 2, tzinfo=UTC),
                    completed_at=datetime(2026, 1, 2, 1, tzinfo=UTC),
                    metadata_json={"source": "test"},
                    values=[
                        TimeSeriesPoint(
                            timestamp=datetime(2026, 1, 2, tzinfo=UTC) + timedelta(hours=index),
                            value=80 + index,
                        )
                        for index in range(24)
                    ],
                )
            ],
        )

    monkeypatch.setattr("app.services.forecast_service.ForecastService.run_forecast", fake_run_forecast)

    response = client.post(
        "/forecasts/runs",
        json={
            "model_type": "arima",
            "target_kind": "price",
            "horizon": "next_24h",
            "granularity": "1h",
        },
    )

    assert response.status_code == 200
    assert response.json()["requested_targets"] == ["price"]
    assert response.json()["runs"][0]["signal_type"] == "price"


def test_user_action_tracking_endpoint_returns_acknowledgement() -> None:
    client, _session = build_client()

    class FakeUserActionService:
        def track_events(self, payload, **kwargs):
            assert payload.events[0].event_name == "persona_changed"
            assert kwargs["path"] == "/events/actions"
            return UserActionTrackingResponse(
                accepted_count=1,
                stored_count=1,
                tracking_enabled=True,
                status="stored",
            )

    app = client.app
    app.dependency_overrides[get_user_action_service] = lambda: FakeUserActionService()

    response = client.post(
        "/events/actions",
        json={
            "events": [
                {
                    "event_name": "persona_changed",
                    "surface": "header",
                    "user_role": "portfolioManager",
                }
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "stored"
    assert response.json()["stored_count"] == 1
