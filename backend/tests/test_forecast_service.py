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


def test_forecast_service_uses_zone_scope_for_production_when_requested() -> None:
    session = build_session()
    service = ForecastService(forecast_client=FakeForecastClient())

    response = service.run_forecast(
        session,
        ForecastExecutionRequest(
            model_type="arima",
            target_kind="volume",
            horizon="next_24h",
            granularity="1h",
            production_scope="zone",
            production_target_code="NORD",
        ),
    )

    assert response.requested_targets == ["production"]
    assert response.runs[0].scope == "zone"
    assert response.runs[0].target_code == "NORD"


def test_forecast_service_adds_technology_runs_for_portfolio_breakdowns() -> None:
    session = build_session()
    service = ForecastService(forecast_client=FakeForecastClient())

    response = service.run_forecast(
        session,
        ForecastExecutionRequest(
            model_type="arima",
            target_kind="volume",
            horizon="next_24h",
            granularity="1h",
            production_scope="portfolio",
            include_production_breakdowns=True,
        ),
    )

    assert response.requested_targets == ["production"]
    assert response.runs[0].scope == "portfolio"
    assert response.runs[0].target_code is None
    assert {(run.scope, run.target_code) for run in response.runs[1:]} == {
        ("technology", "pv"),
        ("technology", "wind"),
        ("technology", "hydro"),
        ("technology", "gas"),
    }


def test_forecast_service_adds_zone_filtered_technology_runs_for_breakdowns() -> None:
    session = build_session()
    service = ForecastService(forecast_client=FakeForecastClient())

    response = service.run_forecast(
        session,
        ForecastExecutionRequest(
            model_type="arima",
            target_kind="volume",
            horizon="next_24h",
            granularity="1h",
            production_scope="zone",
            production_target_code="NORD",
            include_production_breakdowns=True,
        ),
    )

    assert response.requested_targets == ["production"]
    assert response.runs[0].scope == "zone"
    assert response.runs[0].target_code == "NORD"

    technology_runs = response.runs[1:]
    assert technology_runs
    assert all(run.scope == "technology" for run in technology_runs)
    assert all(run.target_code in {"pv", "wind", "hydro", "gas"} for run in technology_runs)
    assert all(
        run.metadata_json and run.metadata_json.get("history_market_zone_filter") == "NORD"
        for run in technology_runs
    )
