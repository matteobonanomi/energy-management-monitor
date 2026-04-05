from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard import ActualForecastQueryFilters, DashboardQueryFilters
from app.services.dashboard_service import DashboardService
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


def test_summary_service_returns_expected_shape() -> None:
    session = build_session()
    service = DashboardService(DashboardRepository())

    response = service.get_summary(session, DashboardQueryFilters(granularity="15m"))

    assert response.total_energy_mwh > 0
    assert response.active_plants == 75
    assert response.average_price_eur_mwh is not None
    assert response.capture_price_eur_mwh is not None
    assert response.daily_avg_price_eur_mwh is not None
    assert response.weekly_avg_price_eur_mwh is not None
    assert response.daily_avg_production_gwh > 0
    assert response.active_plants_24h >= 0
    assert response.inactive_plants_24h >= 0
    assert response.renewables_share_pct_24h is not None


def test_actual_vs_forecast_uses_latest_portfolio_run() -> None:
    session = build_session()
    service = DashboardService(DashboardRepository())

    response = service.get_actual_vs_forecast(session, ActualForecastQueryFilters(granularity="1h"))

    assert response.selected_run is not None
    assert response.selected_run.scope == "portfolio"
    assert len(response.forecast_points) == 24
    assert len(response.actual_points) > 0
