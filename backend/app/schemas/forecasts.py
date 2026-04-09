"""Schemas for forecast execution and inspection.

These contracts separate backend orchestration concerns from the forecast
microservice transport while keeping the UI-facing API stable.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.shared import TimeSeriesPoint

ForecastModelType = Literal["arima", "prophet", "random_forest", "gradient_boosting"]
ForecastSignalType = Literal["production", "price"]
ForecastTargetKind = Literal["price", "volume", "both"]
ForecastProductionScope = Literal["portfolio", "zone", "plant"]


class ForecastRunListFilters(BaseModel):
    """Collect forecast run list filters so querying remains explicit and testable."""

    scope: str | None = None
    status: str | None = None
    signal_type: ForecastSignalType | None = None
    granularity: Literal["15m", "1h"] | None = None
    limit: int = 20


class ForecastRunSummary(BaseModel):
    """Expose compact run metadata for list views and recent-history panels."""

    id: int
    scope: str
    target_code: str | None
    granularity: str
    horizon: str
    signal_type: ForecastSignalType
    model_name: str
    fallback_used: bool
    status: str
    started_at: datetime
    completed_at: datetime | None
    point_count: int


class ForecastRunsResponse(BaseModel):
    """Wrap forecast run lists in a stable top-level response contract."""

    items: list[ForecastRunSummary]


class ForecastRunDetailResponse(BaseModel):
    """Expose one persisted forecast run with enough detail for inspection and overlays."""

    id: int
    scope: str
    target_code: str | None
    granularity: str
    horizon: str
    signal_type: ForecastSignalType
    model_name: str
    fallback_used: bool
    status: str
    started_at: datetime
    completed_at: datetime | None
    metadata_json: dict | None
    values: list[TimeSeriesPoint]


class ForecastExecutionRequest(BaseModel):
    """Capture forecast intent in one payload before orchestration begins."""

    model_type: ForecastModelType
    target_kind: ForecastTargetKind
    horizon: Literal["next_24h", "day_ahead"] = "next_24h"
    granularity: Literal["15m", "1h"] = "1h"
    market_session: str = "MGP"
    history_points: int | None = Field(default=None, ge=1)
    advanced_settings: dict | None = None
    production_scope: ForecastProductionScope = "portfolio"
    production_target_code: str | None = None
    include_production_breakdowns: bool = False


class ForecastExecutionResponse(BaseModel):
    """Return execution metadata together with the created forecast runs."""

    requested_targets: list[ForecastSignalType]
    granularity: Literal["15m", "1h"]
    horizon: Literal["next_24h", "day_ahead"]
    model_type: ForecastModelType
    processing_ms: int | None = None
    runs: list[ForecastRunDetailResponse]
