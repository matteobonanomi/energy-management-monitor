from datetime import datetime
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.settings import get_settings
from app.services.forecasting import ForecastingService, InputPoint

router = APIRouter()


class ForecastRequest(BaseModel):
    model_name: Literal["arima", "prophet"] = "arima"
    signal_type: Literal["production", "price"] = "production"
    granularity: Literal["15m", "1h"] = "1h"
    horizon: Literal["next_24h", "day_ahead"] = "next_24h"
    series: list[InputPoint]


class ForecastPoint(BaseModel):
    timestamp: str
    value: float


class ForecastResponse(BaseModel):
    status: str
    model_name: str
    fallback_used: bool
    generated_at: str
    points: list[ForecastPoint]
    metadata_json: dict | None


@router.get("/health")
def health() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "service": "forecast-service",
        "environment": settings.app_env,
    }


@router.post("/forecast/v1/predict", response_model=ForecastResponse)
def predict(request: ForecastRequest) -> ForecastResponse:
    result = ForecastingService().predict(
        model_name=request.model_name,
        signal_type=request.signal_type,
        granularity=request.granularity,
        horizon=request.horizon,
        series=request.series,
    )
    return ForecastResponse(
        status="ok",
        model_name=result.model_name,
        fallback_used=result.fallback_used,
        generated_at=result.generated_at.isoformat(),
        points=[
            ForecastPoint(timestamp=point.timestamp.isoformat(), value=point.value)
            for point in result.points
        ],
        metadata_json=result.metadata_json,
    )
