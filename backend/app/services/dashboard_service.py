from __future__ import annotations

from collections import defaultdict
from datetime import datetime

import structlog
from sqlalchemy.orm import Session

from app.repositories.common import normalize_timestamp
from app.repositories.dashboard_repository import DashboardRepository, ForecastRunSnapshot, SeriesRow
from app.schemas.dashboard import (
    ActualForecastQueryFilters,
    ActualVsForecastResponse,
    ComparisonPoint,
    DashboardQueryFilters,
    DashboardSummaryResponse,
    ForecastRunReference,
    TimeSeriesResponse,
)
from app.schemas.shared import NamedSeries, TimeSeriesPoint

logger = structlog.get_logger(__name__)


class DashboardService:
    def __init__(self, repository: DashboardRepository | None = None) -> None:
        self.repository = repository or DashboardRepository()

    def get_summary(self, session: Session, filters: DashboardQueryFilters) -> DashboardSummaryResponse:
        metrics = self.repository.get_summary_metrics(session, filters)
        logger.info(
            "dashboard_summary_loaded",
            total_energy_mwh=metrics.total_energy_mwh,
            active_plants=metrics.active_plants,
        )
        return DashboardSummaryResponse(
            total_energy_mwh=round(metrics.total_energy_mwh, 4),
            average_price_eur_mwh=round(metrics.average_price_eur_mwh, 4) if metrics.average_price_eur_mwh is not None else None,
            active_plants=metrics.active_plants,
            capture_price_eur_mwh=round(metrics.capture_price_eur_mwh, 4) if metrics.capture_price_eur_mwh is not None else None,
            market_session=filters.market_session,
            daily_avg_price_eur_mwh=round(metrics.daily_avg_price_eur_mwh, 4)
            if metrics.daily_avg_price_eur_mwh is not None
            else None,
            weekly_avg_price_eur_mwh=round(metrics.weekly_avg_price_eur_mwh, 4)
            if metrics.weekly_avg_price_eur_mwh is not None
            else None,
            daily_avg_production_gwh=round(metrics.daily_avg_production_gwh, 4),
            active_plants_24h=metrics.active_plants_24h,
            inactive_plants_24h=metrics.inactive_plants_24h,
            renewables_share_pct_24h=round(metrics.renewables_share_pct_24h, 4)
            if metrics.renewables_share_pct_24h is not None
            else None,
        )

    def get_production_series(self, session: Session, filters: DashboardQueryFilters) -> TimeSeriesResponse:
        rows = self.repository.get_production_series(session, filters)
        return self._build_series_response(filters.granularity, filters.breakdown_by, rows)

    def get_price_series(self, session: Session, filters: DashboardQueryFilters) -> TimeSeriesResponse:
        rows = self.repository.get_price_series(session, filters)
        return self._build_series_response(filters.granularity, filters.breakdown_by, rows)

    def get_actual_vs_forecast(
        self,
        session: Session,
        filters: ActualForecastQueryFilters,
    ) -> ActualVsForecastResponse:
        run = self.repository.get_latest_matching_run(session, filters)
        actual_rows = self.repository.get_actual_series_for_forecast(session, filters, run)
        forecast_rows = self.repository.get_forecast_series(session, run, filters.granularity) if run else []

        actual_points = self._rows_to_points(actual_rows)
        forecast_points = self._rows_to_points(forecast_rows)
        comparison_points = self._merge_comparison_points(actual_points, forecast_points)

        logger.info(
            "actual_vs_forecast_loaded",
            actual_points=len(actual_points),
            forecast_points=len(forecast_points),
            run_id=run.id if run else None,
        )
        return ActualVsForecastResponse(
            granularity=filters.granularity,
            actual_points=actual_points,
            forecast_points=forecast_points,
            comparison_points=comparison_points,
            selected_run=self._to_run_reference(run),
        )

    def _build_series_response(
        self,
        granularity: str,
        breakdown_by: str,
        rows: list[SeriesRow],
    ) -> TimeSeriesResponse:
        grouped: dict[str, list[TimeSeriesPoint]] = defaultdict(list)
        for row in rows:
            grouped[row.series_key].append(
                TimeSeriesPoint(timestamp=normalize_timestamp(row.bucket), value=round(row.value, 4))
            )

        series = [
            NamedSeries(key=key, label=key.upper() if key.islower() else key, points=points)
            for key, points in grouped.items()
        ]
        return TimeSeriesResponse(granularity=granularity, breakdown_by=breakdown_by, series=series)

    def _rows_to_points(self, rows: list[SeriesRow]) -> list[TimeSeriesPoint]:
        return [TimeSeriesPoint(timestamp=normalize_timestamp(row.bucket), value=round(row.value, 4)) for row in rows]

    def _merge_comparison_points(
        self,
        actual_points: list[TimeSeriesPoint],
        forecast_points: list[TimeSeriesPoint],
    ) -> list[ComparisonPoint]:
        by_timestamp: dict[datetime, ComparisonPoint] = {}
        for point in actual_points:
            by_timestamp[point.timestamp] = ComparisonPoint(timestamp=point.timestamp, actual_mwh=point.value)
        for point in forecast_points:
            existing = by_timestamp.get(point.timestamp)
            if existing:
                existing.forecast_mwh = point.value
            else:
                by_timestamp[point.timestamp] = ComparisonPoint(timestamp=point.timestamp, forecast_mwh=point.value)
        return [by_timestamp[key] for key in sorted(by_timestamp)]

    def _to_run_reference(self, run: ForecastRunSnapshot | None) -> ForecastRunReference | None:
        if run is None:
            return None
        return ForecastRunReference(
            id=run.id,
            scope=run.scope,
            target_code=run.target_code,
            model_name=run.model_name,
            fallback_used=run.fallback_used,
            status=run.status,
            started_at=run.started_at,
            completed_at=run.completed_at,
        )
