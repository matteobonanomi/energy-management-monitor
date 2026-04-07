"""Dependency helpers that translate HTTP input into domain-friendly objects.

Keeping this mapping outside route handlers helps routers stay declarative and
ensures filters are constructed the same way everywhere they are reused.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.repositories.user_action_repository import get_user_action_repository
from app.schemas.dashboard import ActualForecastQueryFilters, DashboardQueryFilters, SeriesBreakdown
from app.schemas.forecasts import ForecastRunListFilters
from app.services.user_action_service import UserActionService

DbSession = Annotated[Session, Depends(get_db_session)]


def get_dashboard_filters(
    technology: Annotated[list[str] | None, Query()] = None,
    plant_code: Annotated[list[str] | None, Query()] = None,
    market_zone: Annotated[list[str] | None, Query()] = None,
    market_session: Annotated[str, Query()] = "MGP",
    date_from: Annotated[datetime | None, Query()] = None,
    date_to: Annotated[datetime | None, Query()] = None,
    granularity: Annotated[str, Query(pattern="^(15m|1h)$")] = "15m",
    breakdown_by: Annotated[SeriesBreakdown, Query()] = "none",
) -> DashboardQueryFilters:
    """Collect dashboard query parameters into one validated filter object."""
    return DashboardQueryFilters(
        technology=technology or [],
        plant_code=plant_code or [],
        market_zone=market_zone or [],
        market_session=market_session,
        date_from=date_from,
        date_to=date_to,
        granularity=granularity,
        breakdown_by=breakdown_by,
    )


def get_actual_forecast_filters(
    technology: Annotated[list[str] | None, Query()] = None,
    plant_code: Annotated[list[str] | None, Query()] = None,
    market_zone: Annotated[list[str] | None, Query()] = None,
    market_session: Annotated[str, Query()] = "MGP",
    date_from: Annotated[datetime | None, Query()] = None,
    date_to: Annotated[datetime | None, Query()] = None,
    granularity: Annotated[str, Query(pattern="^(15m|1h)$")] = "15m",
    forecast_run_id: Annotated[int | None, Query()] = None,
) -> ActualForecastQueryFilters:
    """Keep actual-vs-forecast selection rules consistent with dashboard filters."""
    return ActualForecastQueryFilters(
        technology=technology or [],
        plant_code=plant_code or [],
        market_zone=market_zone or [],
        market_session=market_session,
        date_from=date_from,
        date_to=date_to,
        granularity=granularity,
        forecast_run_id=forecast_run_id,
    )


def get_forecast_run_filters(
    scope: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    signal_type: Annotated[str | None, Query(pattern="^(production|price)$")] = None,
    granularity: Annotated[str | None, Query(pattern="^(15m|1h)$")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 20,
) -> ForecastRunListFilters:
    """Normalize list-query inputs before they reach the forecast service layer."""
    return ForecastRunListFilters(
        scope=scope,
        status=status,
        signal_type=signal_type,
        granularity=granularity,
        limit=limit,
    )


def get_user_action_service() -> UserActionService:
    """Construct the tracker service behind one dependency for easier swapping in tests."""
    repository = get_user_action_repository()
    return UserActionService(repository)


UserActionTracker = Annotated[UserActionService, Depends(get_user_action_service)]
