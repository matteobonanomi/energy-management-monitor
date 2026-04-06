from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.services.forecasting import ForecastingService, InputPoint


def build_series(count: int, step_minutes: int = 60) -> list[InputPoint]:
    start = datetime(2026, 1, 1, tzinfo=UTC)
    return [
        InputPoint(
            timestamp=start + timedelta(minutes=step_minutes * index),
            value=100 + ((index % 24) * 0.75) + ((index // 24) * 0.2),
        )
        for index in range(count)
    ]


def test_arima_forecast_returns_metrics_and_expected_points() -> None:
    service = ForecastingService()

    result = service.predict(
        model_name="arima",
        signal_type="production",
        granularity="1h",
        horizon="next_24h",
        series=build_series(240),
    )

    assert result.model_name in {"arima", "naive_seasonal"}
    assert len(result.points) == 24
    assert result.processing_ms >= 0
    assert result.metadata_json["training_points"] == 192
    assert result.metadata_json["validation_points"] == 48
    assert result.metadata_json["validation_mae"] is not None
    assert result.metadata_json["validation_mape_pct"] is not None


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
    assert result.metadata_json["reason"] in {
        "insufficient_history_for_prophet",
        "prophet_unavailable",
    }


def test_random_forest_forecast_uses_feature_metadata() -> None:
    service = ForecastingService()

    result = service.predict(
        model_name="random_forest",
        signal_type="production",
        granularity="1h",
        horizon="next_24h",
        series=build_series(300),
    )

    assert result.model_name == "random_forest"
    assert result.fallback_used is False
    assert len(result.points) == 24
    assert "rolling_mean_24h" in str(result.metadata_json["feature_columns"])
    assert result.metadata_json["validation_mae"] is not None


def test_gradient_boosting_accepts_advanced_settings_override() -> None:
    service = ForecastingService()

    result = service.predict(
        model_name="gradient_boosting",
        signal_type="price",
        granularity="1h",
        horizon="next_24h",
        series=build_series(300),
        advanced_settings={
            "n_estimators": 120,
            "learning_rate": 0.05,
            "subsample": 0.8,
        },
    )

    assert result.model_name == "gradient_boosting"
    assert result.metadata_json["param_n_estimators"] == 120
    assert result.metadata_json["param_learning_rate"] == 0.05
    assert result.metadata_json["param_subsample"] == 0.8
