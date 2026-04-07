"""Forecast endpoints coordinating listing and execution flows.

The router delegates early so orchestration, error policy, and persistence
decisions stay centralized in the forecast service.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import DbSession, get_forecast_run_filters
from app.schemas.forecasts import (
    ForecastExecutionRequest,
    ForecastExecutionResponse,
    ForecastRunDetailResponse,
    ForecastRunListFilters,
    ForecastRunsResponse,
)
from app.services.forecast_service import ForecastService

router = APIRouter(prefix="/forecasts", tags=["forecasts"])


@router.get("/runs", response_model=ForecastRunsResponse)
def list_forecast_runs(
    session: DbSession,
    filters: Annotated[ForecastRunListFilters, Depends(get_forecast_run_filters)],
) -> ForecastRunsResponse:
    """Expose recent forecast runs for UI inspection and traceability."""
    return ForecastService().list_runs(session, filters)


@router.get("/runs/{run_id}", response_model=ForecastRunDetailResponse)
def get_forecast_run(session: DbSession, run_id: int) -> ForecastRunDetailResponse:
    """Return a single forecast run with persisted output points."""
    return ForecastService().get_run_detail(session, run_id)


@router.post("/runs", response_model=ForecastExecutionResponse)
def run_forecast(
    session: DbSession,
    payload: ForecastExecutionRequest,
) -> ForecastExecutionResponse:
    """Trigger forecast execution while keeping request orchestration outside HTTP code."""
    return ForecastService().run_forecast(session, payload)
