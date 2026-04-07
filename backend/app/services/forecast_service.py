"""Forecast orchestration for the backend API.

This service owns the workflow that bridges persisted history, remote model
execution, run tracking, and HTTP-friendly error semantics.
"""

from __future__ import annotations

from datetime import datetime, timezone
from time import perf_counter

import httpx
import structlog
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.common import normalize_timestamp
from app.repositories.forecast_repository import ForecastRepository
from app.schemas.forecasts import (
    ForecastExecutionRequest,
    ForecastExecutionResponse,
    ForecastRunDetailResponse,
    ForecastRunSummary,
    ForecastRunsResponse,
)
from app.schemas.shared import TimeSeriesPoint
from app.services.forecast_client import ForecastClient

logger = structlog.get_logger(__name__)


class ForecastService:
    """Coordinate forecast execution and retrieval without embedding SQL or HTTP details in routes."""

    def __init__(
        self,
        repository: ForecastRepository | None = None,
        forecast_client: ForecastClient | None = None,
    ) -> None:
        self.repository = repository or ForecastRepository()
        self.forecast_client = forecast_client or ForecastClient()

    def list_runs(self, session: Session, filters) -> ForecastRunsResponse:
        """List recent runs in a compact shape suitable for dashboard history panels."""
        runs = self.repository.list_runs(session, filters)
        logger.info("forecast_runs_listed", count=len(runs))
        return ForecastRunsResponse(
            items=[
                ForecastRunSummary(
                    id=run.id,
                    scope=run.scope,
                    target_code=run.target_code,
                    granularity=run.granularity,
                    horizon=run.horizon,
                    signal_type=run.signal_type,
                    model_name=run.model_name,
                    fallback_used=run.fallback_used,
                    status=run.status,
                    started_at=run.started_at,
                    completed_at=run.completed_at,
                    point_count=point_count,
                )
                for run, point_count in runs
            ]
        )

    def get_run_detail(self, session: Session, run_id: int) -> ForecastRunDetailResponse:
        """Return persisted forecast details or raise a route-friendly not-found error."""
        run = self.repository.get_run(session, run_id)
        if run is None:
            raise HTTPException(status_code=404, detail="forecast run not found")

        values = self.repository.get_run_values(session, run_id)
        logger.info("forecast_run_loaded", run_id=run_id, points=len(values))
        return ForecastRunDetailResponse(
            id=run.id,
            scope=run.scope,
            target_code=run.target_code,
            granularity=run.granularity,
            horizon=run.horizon,
            signal_type=run.signal_type,
            model_name=run.model_name,
            fallback_used=run.fallback_used,
            status=run.status,
            started_at=run.started_at,
            completed_at=run.completed_at,
            metadata_json=run.metadata_json,
            values=[
                TimeSeriesPoint(timestamp=value.target_timestamp, value=float(value.value_mwh))
                for value in values
            ],
        )

    def run_forecast(
        self,
        session: Session,
        request: ForecastExecutionRequest,
    ) -> ForecastExecutionResponse:
        """Execute the full forecast workflow while preserving run traceability on success and failure."""
        started_at = perf_counter()
        requested_targets = self._resolve_requested_targets(request.target_kind)
        runs: list[ForecastRunDetailResponse] = []

        for signal_type in requested_targets:
            scope, target_code = self._resolve_signal_scope(signal_type, request)
            history_rows = self.repository.get_history(
                session,
                scope=scope,
                target_code=target_code,
                signal_type=signal_type,
                granularity=request.granularity,
                market_session=request.market_session,
            )
            history = [
                TimeSeriesPoint(timestamp=normalize_timestamp(row.bucket), value=round(row.value, 4))
                for row in history_rows
            ]
            if request.history_points is not None:
                history = history[-request.history_points :]

            if not history:
                raise HTTPException(status_code=400, detail=f"no historical data available for {signal_type}")

            run = self.repository.create_run(
                session,
                scope=scope,
                target_code=target_code,
                signal_type=signal_type,
                granularity=request.granularity,
                horizon=request.horizon,
                model_name=request.model_type,
                metadata_json={
                    "market_session": request.market_session,
                    "history_points": len(history),
                    "signal_type": signal_type,
                    "requested_model_name": request.model_type,
                    "advanced_settings": request.advanced_settings,
                    "scope": scope,
                    "target_code": target_code,
                },
            )

            try:
                result = self.forecast_client.predict(
                    model_name=request.model_type,
                    signal_type=signal_type,
                    granularity=request.granularity,
                    horizon=request.horizon,
                    history=history,
                    advanced_settings=request.advanced_settings,
                )
            except httpx.HTTPError as exc:
                error_metadata = {
                    "market_session": request.market_session,
                    "history_points": len(history),
                    "signal_type": signal_type,
                    "error": str(exc),
                    "requested_model_name": request.model_type,
                    "advanced_settings": request.advanced_settings,
                    "scope": scope,
                    "target_code": target_code,
                }
                self.repository.fail_run(
                    session,
                    run,
                    completed_at=datetime.now(timezone.utc),
                    metadata_json=error_metadata,
                )
                session.commit()
                logger.exception("forecast_execution_failed", run_id=run.id, signal_type=signal_type)
                raise HTTPException(status_code=502, detail=f"forecast service request failed: {exc}") from exc

            metadata_json = {
                "market_session": request.market_session,
                "history_points": len(history),
                "signal_type": signal_type,
                "generated_at": result.generated_at.isoformat(),
                "first_target_timestamp": result.points[0].timestamp.isoformat() if result.points else None,
                "last_target_timestamp": result.points[-1].timestamp.isoformat() if result.points else None,
                "requested_model_name": request.model_type,
                "advanced_settings": request.advanced_settings,
                "processing_ms": result.processing_ms,
                "scope": scope,
                "target_code": target_code,
            }
            if result.metadata_json:
                metadata_json.update(result.metadata_json)

            self.repository.complete_run(
                session,
                run,
                points=result.points,
                resolved_model_name=result.model_name,
                fallback_used=result.fallback_used,
                completed_at=datetime.now(timezone.utc),
                metadata_json=metadata_json,
            )
            session.commit()
            runs.append(self.get_run_detail(session, run.id))

        logger.info(
            "forecast_execution_completed",
            run_count=len(runs),
            model_type=request.model_type,
            granularity=request.granularity,
            horizon=request.horizon,
            requested_targets=requested_targets,
        )
        return ForecastExecutionResponse(
            requested_targets=requested_targets,
            granularity=request.granularity,
            horizon=request.horizon,
            model_type=request.model_type,
            processing_ms=int((perf_counter() - started_at) * 1000),
            runs=runs,
        )

    def _resolve_requested_targets(self, target_kind: str) -> list[str]:
        if target_kind == "price":
            return ["price"]
        if target_kind == "volume":
            return ["production"]
        return ["price", "production"]

    def _resolve_signal_scope(
        self,
        signal_type: str,
        request: ForecastExecutionRequest,
    ) -> tuple[str, str | None]:
        if signal_type == "price":
            return "portfolio", None

        if request.production_scope == "zone":
            if not request.production_target_code:
                raise HTTPException(status_code=400, detail="production target code is required for zone scope")
            return "zone", request.production_target_code

        if request.production_scope == "plant":
            if not request.production_target_code:
                raise HTTPException(status_code=400, detail="production target code is required for plant scope")
            return "plant", request.production_target_code

        return "portfolio", None
