from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.schemas.forecasts import ForecastExecutionRequest, ForecastRunListFilters
from app.services.forecast_service import ForecastService
from app.services.forecast_client import ForecastClientResult, ForecastResultPoint
from tests.test_helpers import create_all_tables, populate_test_data


def build_session() -> Session:
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
    return session


def test_forecast_service_lists_and_loads_run_detail() -> None:
    session = build_session()
    service = ForecastService()

    listing = service.list_runs(session, ForecastRunListFilters())
    detail = service.get_run_detail(session, 1)

    assert len(listing.items) == 1
    assert listing.items[0].point_count == 24
    assert detail.id == 1
    assert detail.signal_type == "production"
    assert len(detail.values) == 24


class FakeForecastClient:
    def predict(
        self,
        *,
        model_name: str,
        signal_type: str,
        granularity: str,
        horizon: str,
        history,
        advanced_settings=None,
    ):
        base_timestamp = history[-1].timestamp + timedelta(hours=1)
        points = [
            ForecastResultPoint(timestamp=base_timestamp + timedelta(hours=index), value=200 + index)
            for index in range(24)
        ]
        return ForecastClientResult(
            model_name=model_name,
            fallback_used=False,
            generated_at=datetime(2026, 1, 3, tzinfo=UTC),
            processing_ms=840,
            points=points,
            metadata_json={"source": "test-double", "signal_type": signal_type},
        )


def test_forecast_service_runs_and_persists_requested_targets() -> None:
    session = build_session()
    service = ForecastService(forecast_client=FakeForecastClient())

    response = service.run_forecast(
        session,
        ForecastExecutionRequest(
            model_type="arima",
            target_kind="both",
            horizon="next_24h",
            granularity="1h",
        ),
    )

    assert response.requested_targets == ["price", "production"]
    assert len(response.runs) == 2
    assert {run.signal_type for run in response.runs} == {"price", "production"}
    assert all(run.status == "completed" for run in response.runs)
    assert response.processing_ms is not None
