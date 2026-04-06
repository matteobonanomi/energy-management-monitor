from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

import httpx
import structlog

from app.core.settings import get_settings
from app.schemas.shared import TimeSeriesPoint

logger = structlog.get_logger(__name__)


@dataclass(slots=True)
class ForecastResultPoint:
    timestamp: datetime
    value: float


@dataclass(slots=True)
class ForecastClientResult:
    model_name: str
    fallback_used: bool
    generated_at: datetime
    processing_ms: int
    points: list[ForecastResultPoint]
    metadata_json: dict | None


class ForecastClient:
    def __init__(self, base_url: str | None = None, timeout_seconds: float = 120.0) -> None:
        settings = get_settings()
        self.base_url = (base_url or settings.forecast_service_url).rstrip("/")
        self.timeout_seconds = timeout_seconds

    def predict(
        self,
        *,
        model_name: str,
        signal_type: str,
        granularity: str,
        horizon: str,
        history: list[TimeSeriesPoint],
        advanced_settings: dict[str, Any] | None = None,
    ) -> ForecastClientResult:
        payload = {
            "model_name": model_name,
            "signal_type": signal_type,
            "granularity": granularity,
            "horizon": horizon,
            "advanced_settings": advanced_settings,
            "series": [
                {
                    "timestamp": point.timestamp.isoformat(),
                    "value": point.value,
                }
                for point in history
            ],
        }
        logger.info(
            "forecast_request_started",
            signal_type=signal_type,
            granularity=granularity,
            horizon=horizon,
            history_points=len(history),
            model_name=model_name,
        )
        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.post(f"{self.base_url}/forecast/v1/predict", json=payload)
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                response_body = exc.response.text.strip()
                detail = response_body or str(exc)
                raise httpx.HTTPStatusError(
                    f"forecast service error: {detail}",
                    request=exc.request,
                    response=exc.response,
                ) from exc

        data = response.json()
        logger.info(
            "forecast_request_completed",
            signal_type=signal_type,
            model_name=data["model_name"],
            points=len(data["points"]),
            fallback_used=data["fallback_used"],
            processing_ms=data.get("processing_ms"),
        )
        return ForecastClientResult(
            model_name=data["model_name"],
            fallback_used=bool(data["fallback_used"]),
            generated_at=datetime.fromisoformat(data["generated_at"]),
            processing_ms=int(data.get("processing_ms") or 0),
            points=[
                ForecastResultPoint(
                    timestamp=datetime.fromisoformat(point["timestamp"]),
                    value=float(point["value"]),
                )
                for point in data["points"]
            ],
            metadata_json=data.get("metadata_json"),
        )
