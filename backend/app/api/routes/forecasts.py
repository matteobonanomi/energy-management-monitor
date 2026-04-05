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
    return ForecastService().list_runs(session, filters)


@router.get("/runs/{run_id}", response_model=ForecastRunDetailResponse)
def get_forecast_run(session: DbSession, run_id: int) -> ForecastRunDetailResponse:
    return ForecastService().get_run_detail(session, run_id)


@router.post("/runs", response_model=ForecastExecutionResponse)
def run_forecast(
    session: DbSession,
    payload: ForecastExecutionRequest,
) -> ForecastExecutionResponse:
    return ForecastService().run_forecast(session, payload)
