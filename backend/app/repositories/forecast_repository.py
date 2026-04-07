"""Persistence helpers for forecast execution state.

Forecast runs are written and read here so orchestration code can stay focused
on model flow rather than SQL details.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import ForecastRun, ForecastValue
from app.repositories.dashboard_repository import SeriesRow
from app.services.forecast_client import ForecastResultPoint
from app.schemas.dashboard import DashboardQueryFilters
from app.schemas.forecasts import ForecastRunListFilters


class ForecastRepository:
    """Manage forecast run lifecycle and historical data retrieval."""

    def list_runs(self, session: Session, filters: ForecastRunListFilters) -> list[tuple[ForecastRun, int]]:
        """Return recent runs with point counts for lightweight UI inspection."""
        point_count = func.count(ForecastValue.id)
        stmt = (
            select(ForecastRun, point_count.label("point_count"))
            .outerjoin(ForecastValue, ForecastValue.forecast_run_id == ForecastRun.id)
            .group_by(ForecastRun.id)
            .order_by(ForecastRun.started_at.desc())
            .limit(filters.limit)
        )
        if filters.scope:
            stmt = stmt.where(ForecastRun.scope == filters.scope)
        if filters.status:
            stmt = stmt.where(ForecastRun.status == filters.status)
        if filters.signal_type:
            stmt = stmt.where(ForecastRun.signal_type == filters.signal_type)
        if filters.granularity:
            stmt = stmt.where(ForecastRun.granularity == filters.granularity)
        return [(row[0], int(row[1])) for row in session.execute(stmt).all()]

    def get_run(self, session: Session, run_id: int) -> ForecastRun | None:
        """Load a run by id so callers can decide how to handle absence."""
        return session.get(ForecastRun, run_id)

    def get_run_values(self, session: Session, run_id: int) -> list[ForecastValue]:
        """Return persisted forecast points in chronological order for plotting."""
        stmt = select(ForecastValue).where(ForecastValue.forecast_run_id == run_id).order_by(ForecastValue.target_timestamp)
        return session.execute(stmt).scalars().all()

    def create_run(
        self,
        session: Session,
        *,
        scope: str,
        target_code: str | None,
        signal_type: str,
        granularity: str,
        horizon: str,
        model_name: str,
        metadata_json: dict | None,
    ) -> ForecastRun:
        """Persist a run before execution so failures remain observable."""
        run = ForecastRun(
            scope=scope,
            target_code=target_code,
            granularity=granularity,
            horizon=horizon,
            signal_type=signal_type,
            model_name=model_name,
            fallback_used=False,
            status="running",
            metadata_json=metadata_json,
        )
        session.add(run)
        session.flush()
        return run

    def complete_run(
        self,
        session: Session,
        run: ForecastRun,
        *,
        points: list[ForecastResultPoint],
        resolved_model_name: str,
        fallback_used: bool,
        completed_at: datetime,
        metadata_json: dict | None,
    ) -> None:
        """Finalize a run atomically with its output points and resolved metadata."""
        for point in points:
            session.add(
                ForecastValue(
                    forecast_run_id=run.id,
                    target_timestamp=point.timestamp,
                    value_mwh=point.value,
                )
            )

        run.model_name = resolved_model_name
        run.fallback_used = fallback_used
        run.status = "completed"
        run.completed_at = completed_at
        run.metadata_json = metadata_json
        session.flush()

    def fail_run(
        self,
        session: Session,
        run: ForecastRun,
        *,
        completed_at: datetime,
        metadata_json: dict | None,
    ) -> None:
        """Persist failure details so operational troubleshooting has a source of truth."""
        run.status = "failed"
        run.completed_at = completed_at
        run.metadata_json = metadata_json
        session.flush()

    def get_history(
        self,
        session: Session,
        *,
        scope: str,
        target_code: str | None,
        signal_type: str,
        granularity: str,
        market_session: str,
    ) -> list[SeriesRow]:
        """Reuse dashboard aggregation logic to keep forecast history inputs aligned with the UI."""
        from app.repositories.dashboard_repository import DashboardRepository

        dashboard_repository = DashboardRepository()
        filters = DashboardQueryFilters(
            plant_code=[target_code] if scope == "plant" and target_code else [],
            market_zone=[target_code] if scope == "zone" and target_code else [],
            market_session=market_session,
            granularity=granularity,
            breakdown_by="none",
        )
        if signal_type == "price":
            return dashboard_repository.get_price_series(session, filters)
        return dashboard_repository.get_production_series(session, filters)
