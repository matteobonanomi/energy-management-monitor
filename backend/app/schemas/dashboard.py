from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.shared import NamedSeries, TimeSeriesPoint

SeriesBreakdown = Literal["none", "technology", "market_zone", "plant_code"]


class DashboardQueryFilters(BaseModel):
    technology: list[str] = Field(default_factory=list)
    plant_code: list[str] = Field(default_factory=list)
    market_zone: list[str] = Field(default_factory=list)
    market_session: str = "MGP"
    date_from: datetime | None = None
    date_to: datetime | None = None
    granularity: Literal["15m", "1h"] = "15m"
    breakdown_by: SeriesBreakdown = "none"

    @model_validator(mode="after")
    def validate_dates(self) -> "DashboardQueryFilters":
        if self.date_from and self.date_to and self.date_from > self.date_to:
            raise ValueError("date_from must be earlier than or equal to date_to")
        return self


class DashboardSummaryResponse(BaseModel):
    total_energy_mwh: float
    average_price_eur_mwh: float | None
    active_plants: int
    capture_price_eur_mwh: float | None
    market_session: str
    daily_avg_price_eur_mwh: float | None
    weekly_avg_price_eur_mwh: float | None
    daily_avg_production_gwh: float
    active_plants_24h: int
    inactive_plants_24h: int
    renewables_share_pct_24h: float | None


class TimeSeriesResponse(BaseModel):
    granularity: Literal["15m", "1h"]
    breakdown_by: SeriesBreakdown
    series: list[NamedSeries]


class ForecastRunReference(BaseModel):
    id: int
    scope: str
    target_code: str | None
    model_name: str
    fallback_used: bool
    status: str
    started_at: datetime
    completed_at: datetime | None


class ComparisonPoint(BaseModel):
    timestamp: datetime
    actual_mwh: float | None = None
    forecast_mwh: float | None = None


class ActualForecastQueryFilters(DashboardQueryFilters):
    forecast_run_id: int | None = None


class ActualVsForecastResponse(BaseModel):
    granularity: Literal["15m", "1h"]
    actual_points: list[TimeSeriesPoint]
    forecast_points: list[TimeSeriesPoint]
    comparison_points: list[ComparisonPoint]
    selected_run: ForecastRunReference | None
