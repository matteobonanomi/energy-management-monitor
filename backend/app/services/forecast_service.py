from __future__ import annotations

from datetime import datetime, timezone

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
    def __init__(
        self,
        repository: ForecastRepository | None = None,
        forecast_client: ForecastClient | None = None,
    ) -> None:
        self.repository = repository or ForecastRepository()
        self.forecast_client = forecast_client or ForecastClient()

    def list_runs(self, session: Session, filters) -> ForecastRunsResponse:
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
        requested_targets = self._resolve_requested_targets(request.target_kind)
        runs: list[ForecastRunDetailResponse] = []

        for signal_type in requested_targets:
            history_rows = self.repository.get_portfolio_history(
                session,
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
                signal_type=signal_type,
                granularity=request.granularity,
                horizon=request.horizon,
                model_name=request.model_type,
                metadata_json={
                    "market_session": request.market_session,
                    "history_points": len(history),
                    "signal_type": signal_type,
                },
            )

            try:
                result = self.forecast_client.predict(
                    model_name=request.model_type,
                    signal_type=signal_type,
                    granularity=request.granularity,
                    horizon=request.horizon,
                    history=history,
                )
            except httpx.HTTPError as exc:
                error_metadata = {
                    "market_session": request.market_session,
                    "history_points": len(history),
                    "signal_type": signal_type,
                    "error": str(exc),
                }
                self.repository.fail_run(
                    session,
                    run,
                    completed_at=datetime.now(timezone.utc),
                    metadata_json=error_metadata,
                )
                session.commit()
                logger.exception("forecast_execution_failed", run_id=run.id, signal_type=signal_type)
                raise HTTPException(status_code=502, detail="forecast service request failed") from exc

            metadata_json = {
                "market_session": request.market_session,
                "history_points": len(history),
                "signal_type": signal_type,
                "generated_at": result.generated_at.isoformat(),
                "first_target_timestamp": result.points[0].timestamp.isoformat() if result.points else None,
                "last_target_timestamp": result.points[-1].timestamp.isoformat() if result.points else None,
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
            runs=runs,
        )

    def _resolve_requested_targets(self, target_kind: str) -> list[str]:
        if target_kind == "price":
            return ["price"]
        if target_kind == "volume":
            return ["production"]
        return ["price", "production"]
