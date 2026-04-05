from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.services.forecasting import ForecastingService, InputPoint


def build_series(count: int, step_minutes: int = 60) -> list[InputPoint]:
    start = datetime(2026, 1, 1, tzinfo=UTC)
    return [
        InputPoint(
            timestamp=start + timedelta(minutes=step_minutes * index),
            value=100 + ((index % 24) * 0.75),
        )
        for index in range(count)
    ]


def test_arima_forecast_returns_expected_number_of_points() -> None:
    service = ForecastingService()

    result = service.predict(
        model_name="arima",
        signal_type="production",
        granularity="1h",
        horizon="next_24h",
        series=build_series(96),
    )

    assert result.model_name in {"arima", "naive_seasonal"}
    assert len(result.points) == 24
    assert result.points[0].timestamp > build_series(96)[-1].timestamp


def test_prophet_request_falls_back_when_history_is_too_short() -> None:
    service = ForecastingService()

    result = service.predict(
        model_name="prophet",
        signal_type="price",
        granularity="1h",
        horizon="day_ahead",
        series=build_series(12),
    )

    assert result.fallback_used is True
    assert result.model_name == "naive_seasonal"
    assert len(result.points) == 48
