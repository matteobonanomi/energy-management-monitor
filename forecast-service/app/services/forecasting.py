from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA

try:
    from prophet import Prophet
except Exception:  # pragma: no cover - exercised through fallback path
    Prophet = None


@dataclass(slots=True)
class InputPoint:
    timestamp: datetime
    value: float


@dataclass(slots=True)
class OutputPoint:
    timestamp: datetime
    value: float


@dataclass(slots=True)
class ForecastComputationResult:
    model_name: str
    fallback_used: bool
    generated_at: datetime
    points: list[OutputPoint]
    metadata_json: dict[str, int | str | float | bool | None]


class ForecastingService:
    def predict(
        self,
        *,
        model_name: str,
        signal_type: str,
        granularity: str,
        horizon: str,
        series: list[InputPoint],
    ) -> ForecastComputationResult:
        history = self._normalize_series(series)
        steps = self._resolve_horizon_steps(granularity, horizon)
        seasonal_period = 96 if granularity == "15m" else 24

        if model_name == "prophet":
            result = self._predict_with_prophet(history, granularity, steps, seasonal_period)
        else:
            result = self._predict_with_arima(history, granularity, steps, seasonal_period)

        metadata_json = {
            "signal_type": signal_type,
            "history_points": len(history),
            "steps": steps,
            "seasonal_period": seasonal_period,
            **result.metadata_json,
        }
        return ForecastComputationResult(
            model_name=result.model_name,
            fallback_used=result.fallback_used,
            generated_at=result.generated_at,
            points=result.points,
            metadata_json=metadata_json,
        )

    def _predict_with_arima(
        self,
        history: pd.Series,
        granularity: str,
        steps: int,
        seasonal_period: int,
    ) -> ForecastComputationResult:
        if len(history) < max(seasonal_period * 2, 16):
            return self._predict_with_naive_seasonal(history, granularity, steps, "insufficient_history_for_arima")

        try:
            model = ARIMA(history.astype(float), order=(2, 1, 2))
            fitted = model.fit()
            forecast = fitted.forecast(steps=steps)
            return self._build_result(
                model_name="arima",
                history=history,
                granularity=granularity,
                raw_values=forecast.to_numpy(),
                fallback_used=False,
                reason="arima",
            )
        except Exception:
            return self._predict_with_naive_seasonal(history, granularity, steps, "arima_failed")

    def _predict_with_prophet(
        self,
        history: pd.Series,
        granularity: str,
        steps: int,
        seasonal_period: int,
    ) -> ForecastComputationResult:
        if Prophet is None:
            return self._predict_with_naive_seasonal(history, granularity, steps, "prophet_unavailable")
        if len(history) < max(seasonal_period * 2, 48):
            return self._predict_with_naive_seasonal(history, granularity, steps, "insufficient_history_for_prophet")

        try:
            dataframe = pd.DataFrame(
                {
                    "ds": history.index.tz_convert(UTC).tz_localize(None),
                    "y": history.to_numpy(dtype=float),
                }
            )
            model = Prophet(
                daily_seasonality=True,
                weekly_seasonality=True,
                yearly_seasonality=False,
            )
            model.fit(dataframe)
            future = model.make_future_dataframe(periods=steps, freq=self._resolve_frequency(granularity))
            forecast = model.predict(future).tail(steps)
            future_index = pd.to_datetime(forecast["ds"], utc=True)
            future_values = forecast["yhat"].to_numpy(dtype=float)
            return self._build_result(
                model_name="prophet",
                history=history,
                granularity=granularity,
                raw_values=future_values,
                fallback_used=False,
                explicit_future_index=future_index,
                reason="prophet",
            )
        except Exception:
            return self._predict_with_naive_seasonal(history, granularity, steps, "prophet_failed")

    def _predict_with_naive_seasonal(
        self,
        history: pd.Series,
        granularity: str,
        steps: int,
        reason: str,
    ) -> ForecastComputationResult:
        seasonal_period = 96 if granularity == "15m" else 24
        values = history.to_numpy(dtype=float)
        if len(values) >= seasonal_period:
            template = values[-seasonal_period:]
        elif len(values) > 0:
            template = values[-1:]
        else:
            template = np.array([0.0])

        repeated = np.resize(template, steps)
        return self._build_result(
            model_name="naive_seasonal",
            history=history,
            granularity=granularity,
            raw_values=repeated,
            fallback_used=True,
            reason=reason,
        )

    def _build_result(
        self,
        *,
        model_name: str,
        history: pd.Series,
        granularity: str,
        raw_values: np.ndarray,
        fallback_used: bool,
        reason: str,
        explicit_future_index: pd.DatetimeIndex | None = None,
    ) -> ForecastComputationResult:
        future_index = explicit_future_index or self._future_index(history, granularity, len(raw_values))
        points = [
            OutputPoint(
                timestamp=timestamp.to_pydatetime().astimezone(UTC),
                value=round(max(float(value), 0.0), 4),
            )
            for timestamp, value in zip(future_index, raw_values, strict=True)
        ]
        return ForecastComputationResult(
            model_name=model_name,
            fallback_used=fallback_used,
            generated_at=datetime.now(UTC),
            points=points,
            metadata_json={"reason": reason},
        )

    def _normalize_series(self, series: list[InputPoint]) -> pd.Series:
        ordered = sorted(series, key=lambda point: point.timestamp)
        index = pd.DatetimeIndex([point.timestamp.astimezone(UTC) for point in ordered])
        values = [point.value for point in ordered]
        return pd.Series(values, index=index, dtype=float)

    def _resolve_horizon_steps(self, granularity: str, horizon: str) -> int:
        hourly_steps = 24 if horizon == "next_24h" else 48
        if granularity == "1h":
            return hourly_steps
        return hourly_steps * 4

    def _resolve_frequency(self, granularity: str) -> str:
        return "15min" if granularity == "15m" else "h"

    def _future_index(
        self,
        history: pd.Series,
        granularity: str,
        steps: int,
    ) -> pd.DatetimeIndex:
        step = timedelta(minutes=15 if granularity == "15m" else 60)
        start = history.index[-1].to_pydatetime().astimezone(UTC) + step
        return pd.DatetimeIndex([start + (step * index) for index in range(steps)], tz=UTC)
