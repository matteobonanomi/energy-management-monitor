from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import DbSession, get_actual_forecast_filters, get_dashboard_filters
from app.schemas.dashboard import (
    ActualForecastQueryFilters,
    ActualVsForecastResponse,
    DashboardQueryFilters,
    DashboardSummaryResponse,
    TimeSeriesResponse,
)
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_summary(
    session: DbSession,
    filters: Annotated[DashboardQueryFilters, Depends(get_dashboard_filters)],
) -> DashboardSummaryResponse:
    return DashboardService().get_summary(session, filters)


@router.get("/production-series", response_model=TimeSeriesResponse)
def get_production_series(
    session: DbSession,
    filters: Annotated[DashboardQueryFilters, Depends(get_dashboard_filters)],
) -> TimeSeriesResponse:
    return DashboardService().get_production_series(session, filters)


@router.get("/price-series", response_model=TimeSeriesResponse)
def get_price_series(
    session: DbSession,
    filters: Annotated[DashboardQueryFilters, Depends(get_dashboard_filters)],
) -> TimeSeriesResponse:
    return DashboardService().get_price_series(session, filters)


@router.get("/actual-vs-forecast", response_model=ActualVsForecastResponse)
def get_actual_vs_forecast(
    session: DbSession,
    filters: Annotated[ActualForecastQueryFilters, Depends(get_actual_forecast_filters)],
) -> ActualVsForecastResponse:
    return DashboardService().get_actual_vs_forecast(session, filters)
