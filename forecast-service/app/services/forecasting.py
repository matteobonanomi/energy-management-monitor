from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
import logging
from time import perf_counter
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from statsmodels.tsa.arima.model import ARIMA

try:
    from prophet import Prophet
except Exception:  # pragma: no cover - exercised through fallback path
    Prophet = None

logger = logging.getLogger(__name__)


Scalar = str | int | float | bool | None

ARIMA_DEFAULTS: dict[str, Scalar] = {
    "order_p": 2,
    "order_d": 1,
    "order_q": 2,
    "trend": "n",
    "enforce_stationarity": True,
    "enforce_invertibility": True,
    "maxiter": 50,
}

PROPHET_DEFAULTS: dict[str, Scalar] = {
    "changepoint_prior_scale": 0.05,
    "seasonality_prior_scale": 10.0,
    "holidays_prior_scale": 10.0,
    "seasonality_mode": "additive",
    "n_changepoints": 25,
    "interval_width": 0.8,
    "weekly_seasonality": True,
}

RANDOM_FOREST_DEFAULTS: dict[str, Scalar] = {
    "n_estimators": 100,
    "max_depth": None,
    "min_samples_split": 2,
    "min_samples_leaf": 1,
    "max_features": 1.0,
    "bootstrap": True,
    "random_state": 42,
}

GRADIENT_BOOSTING_DEFAULTS: dict[str, Scalar] = {
    "n_estimators": 100,
    "learning_rate": 0.1,
    "max_depth": 3,
    "min_samples_split": 2,
    "min_samples_leaf": 1,
    "subsample": 1.0,
    "random_state": 42,
}


@dataclass(slots=True)
class InputPoint:
    timestamp: datetime
    value: float


@dataclass(slots=True)
class OutputPoint:
    timestamp: datetime
    value: float


@dataclass(slots=True)
class ModelForecastResult:
    model_name: str
    fallback_used: bool
    raw_values: np.ndarray
    metadata_json: dict[str, Scalar]


@dataclass(slots=True)
class ForecastComputationResult:
    model_name: str
    fallback_used: bool
    generated_at: datetime
    processing_ms: int
    points: list[OutputPoint]
    metadata_json: dict[str, Scalar]


class ForecastingService:
    def predict(
        self,
        *,
        model_name: str,
        signal_type: str,
        granularity: str,
        horizon: str,
        series: list[InputPoint],
        advanced_settings: dict[str, Any] | None = None,
    ) -> ForecastComputationResult:
        started_at = perf_counter()
        history = self._normalize_series(series)
        steps = self._resolve_horizon_steps(granularity, horizon)
        seasonal_period = 96 if granularity == "15m" else 24
        parameters = self._resolve_model_parameters(model_name, advanced_settings)
        train_history, validation_history = self._split_history(history)

        validation_result = self._forecast_requested_model(
            requested_model_name=model_name,
            history=train_history,
            steps=len(validation_history),
            signal_type=signal_type,
            granularity=granularity,
            seasonal_period=seasonal_period,
            advanced_settings=parameters,
        )
        mae, mape = self._compute_validation_metrics(validation_history, validation_result.raw_values)
        future_result = self._forecast_requested_model(
            requested_model_name=validation_result.model_name,
            history=history,
            steps=steps,
            signal_type=signal_type,
            granularity=granularity,
            seasonal_period=seasonal_period,
            advanced_settings=parameters,
        )

        processing_ms = int((perf_counter() - started_at) * 1000)
        metadata_json: dict[str, Scalar] = {
            "signal_type": signal_type,
            "history_points": len(history),
            "training_points": len(train_history),
            "validation_points": len(validation_history),
            "steps": steps,
            "seasonal_period": seasonal_period,
            "requested_model_name": model_name,
            "resolved_model_name": future_result.model_name,
            "training_ratio": 0.8,
            "processing_ms": processing_ms,
            "validation_start": validation_history.index[0].isoformat() if len(validation_history) > 0 else None,
            "validation_end": validation_history.index[-1].isoformat() if len(validation_history) > 0 else None,
            "validation_mae": round(mae, 4) if mae is not None else None,
            "validation_mae_unit": "MWh" if signal_type == "production" else "EUR/MWh",
            "validation_mape_pct": round(mape, 2) if mape is not None else None,
            "parameter_count": len(parameters),
        }
        metadata_json.update(self._serialize_parameters(parameters))
        metadata_json.update(validation_result.metadata_json)
        metadata_json.update(
            {
                key: value
                for key, value in future_result.metadata_json.items()
                if key in {"error_summary", "feature_columns", "feature_span_hours", "used_week_of_year"}
            }
        )

        logger.info(
            "forecast_prediction_completed",
            extra={
                "requested_model_name": model_name,
                "resolved_model_name": future_result.model_name,
                "signal_type": signal_type,
                "granularity": granularity,
                "horizon": horizon,
                "history_points": len(history),
                "training_points": len(train_history),
                "validation_points": len(validation_history),
                "fallback_used": future_result.fallback_used,
                "processing_ms": processing_ms,
                "validation_mae": metadata_json["validation_mae"],
                "validation_mape_pct": metadata_json["validation_mape_pct"],
            },
        )

        return ForecastComputationResult(
            model_name=future_result.model_name,
            fallback_used=future_result.fallback_used,
            generated_at=datetime.now(UTC),
            processing_ms=processing_ms,
            points=self._build_output_points(history, granularity, future_result.raw_values),
            metadata_json=metadata_json,
        )

    def _forecast_requested_model(
        self,
        *,
        requested_model_name: str,
        history: pd.Series,
        steps: int,
        signal_type: str,
        granularity: str,
        seasonal_period: int,
        advanced_settings: dict[str, Scalar],
    ) -> ModelForecastResult:
        if steps <= 0:
            return ModelForecastResult(
                model_name=requested_model_name,
                fallback_used=False,
                raw_values=np.array([], dtype=float),
                metadata_json={},
            )

        try:
            if requested_model_name == "arima":
                return self._predict_with_arima(history, steps, granularity, seasonal_period, advanced_settings)
            if requested_model_name == "prophet":
                return self._predict_with_prophet(history, steps, granularity, seasonal_period, advanced_settings)
            if requested_model_name == "random_forest":
                return self._predict_with_random_forest(history, steps, granularity, advanced_settings)
            if requested_model_name == "gradient_boosting":
                return self._predict_with_gradient_boosting(history, steps, granularity, advanced_settings)
        except Exception as exc:  # pragma: no cover - exercised by degraded runtime paths
            logger.exception(
                "forecast_primary_model_failed",
                extra={
                    "requested_model_name": requested_model_name,
                    "history_points": len(history),
                    "steps": steps,
                    "error": str(exc),
                },
            )
            return self._predict_with_naive_seasonal(
                history=history,
                steps=steps,
                granularity=granularity,
                reason=f"{requested_model_name}_failed",
                error_summary=str(exc),
            )

        return self._predict_with_naive_seasonal(
            history=history,
            steps=steps,
            granularity=granularity,
            reason="unsupported_model",
            error_summary=f"unsupported model: {requested_model_name}",
        )

    def _predict_with_arima(
        self,
        history: pd.Series,
        steps: int,
        granularity: str,
        seasonal_period: int,
        advanced_settings: dict[str, Scalar],
    ) -> ModelForecastResult:
        required_history = max(seasonal_period * 2, 24)
        if len(history) < required_history:
            return self._predict_with_naive_seasonal(
                history=history,
                steps=steps,
                granularity=granularity,
                reason="insufficient_history_for_arima",
                error_summary=f"ARIMA richiede almeno {required_history} punti storici",
            )

        order = (
            int(advanced_settings["order_p"]),
            int(advanced_settings["order_d"]),
            int(advanced_settings["order_q"]),
        )
        trend = advanced_settings["trend"]
        model = ARIMA(
            history.astype(float),
            order=order,
            trend=None if trend == "n" else str(trend),
            enforce_stationarity=bool(advanced_settings["enforce_stationarity"]),
            enforce_invertibility=bool(advanced_settings["enforce_invertibility"]),
        )
        fitted = model.fit(method_kwargs={"maxiter": int(advanced_settings["maxiter"])})
        forecast = fitted.forecast(steps=steps)
        return ModelForecastResult(
            model_name="arima",
            fallback_used=False,
            raw_values=forecast.to_numpy(dtype=float),
            metadata_json={"reason": "arima"},
        )

    def _predict_with_prophet(
        self,
        history: pd.Series,
        steps: int,
        granularity: str,
        seasonal_period: int,
        advanced_settings: dict[str, Scalar],
    ) -> ModelForecastResult:
        if Prophet is None:
            return self._predict_with_naive_seasonal(
                history=history,
                steps=steps,
                granularity=granularity,
                reason="prophet_unavailable",
                error_summary="Prophet non e' disponibile nel runtime corrente",
            )

        required_history = max(seasonal_period * 2, 48)
        if len(history) < required_history:
            return self._predict_with_naive_seasonal(
                history=history,
                steps=steps,
                granularity=granularity,
                reason="insufficient_history_for_prophet",
                error_summary=f"Prophet richiede almeno {required_history} punti storici",
            )

        dataframe = pd.DataFrame(
            {
                "ds": history.index.tz_convert(UTC).tz_localize(None),
                "y": history.to_numpy(dtype=float),
            }
        )
        model = Prophet(
            daily_seasonality=True,
            weekly_seasonality=bool(advanced_settings["weekly_seasonality"]),
            yearly_seasonality=False,
            changepoint_prior_scale=float(advanced_settings["changepoint_prior_scale"]),
            seasonality_prior_scale=float(advanced_settings["seasonality_prior_scale"]),
            holidays_prior_scale=float(advanced_settings["holidays_prior_scale"]),
            seasonality_mode=str(advanced_settings["seasonality_mode"]),
            n_changepoints=int(advanced_settings["n_changepoints"]),
            interval_width=float(advanced_settings["interval_width"]),
        )
        model.fit(dataframe)
        future = model.make_future_dataframe(periods=steps, freq=self._resolve_frequency(granularity))
        forecast = model.predict(future).tail(steps)
        return ModelForecastResult(
            model_name="prophet",
            fallback_used=False,
            raw_values=forecast["yhat"].to_numpy(dtype=float),
            metadata_json={"reason": "prophet"},
        )

    def _predict_with_random_forest(
        self,
        history: pd.Series,
        steps: int,
        granularity: str,
        advanced_settings: dict[str, Scalar],
    ) -> ModelForecastResult:
        return self._predict_with_tree_regressor(
            history=history,
            steps=steps,
            granularity=granularity,
            advanced_settings=advanced_settings,
            model_name="random_forest",
        )

    def _predict_with_gradient_boosting(
        self,
        history: pd.Series,
        steps: int,
        granularity: str,
        advanced_settings: dict[str, Scalar],
    ) -> ModelForecastResult:
        return self._predict_with_tree_regressor(
            history=history,
            steps=steps,
            granularity=granularity,
            advanced_settings=advanced_settings,
            model_name="gradient_boosting",
        )

    def _predict_with_tree_regressor(
        self,
        *,
        history: pd.Series,
        steps: int,
        granularity: str,
        advanced_settings: dict[str, Scalar],
        model_name: str,
    ) -> ModelForecastResult:
        feature_frame, target, metadata = self._build_tree_training_frame(history, granularity)
        if len(feature_frame) < 12:
            return self._predict_with_naive_seasonal(
                history=history,
                steps=steps,
                granularity=granularity,
                reason=f"insufficient_history_for_{model_name}",
                error_summary=f"{model_name} richiede piu' storico per costruire le feature",
            )

        if model_name == "random_forest":
            model = RandomForestRegressor(
                n_estimators=int(advanced_settings["n_estimators"]),
                max_depth=self._nullable_int(advanced_settings["max_depth"]),
                min_samples_split=int(advanced_settings["min_samples_split"]),
                min_samples_leaf=int(advanced_settings["min_samples_leaf"]),
                max_features=float(advanced_settings["max_features"]),
                bootstrap=bool(advanced_settings["bootstrap"]),
                random_state=self._nullable_int(advanced_settings["random_state"]),
                n_jobs=-1,
            )
        else:
            model = GradientBoostingRegressor(
                n_estimators=int(advanced_settings["n_estimators"]),
                learning_rate=float(advanced_settings["learning_rate"]),
                max_depth=int(advanced_settings["max_depth"]),
                min_samples_split=int(advanced_settings["min_samples_split"]),
                min_samples_leaf=int(advanced_settings["min_samples_leaf"]),
                subsample=float(advanced_settings["subsample"]),
                random_state=self._nullable_int(advanced_settings["random_state"]),
            )

        model.fit(feature_frame, target)
        forecast_values = self._recursive_tree_forecast(
            history=history,
            granularity=granularity,
            steps=steps,
            model=model,
            feature_columns=list(feature_frame.columns),
            used_week_of_year=bool(metadata["used_week_of_year"]),
        )
        return ModelForecastResult(
            model_name=model_name,
            fallback_used=False,
            raw_values=forecast_values,
            metadata_json={
                "reason": model_name,
                "feature_columns": ", ".join(feature_frame.columns.tolist()),
                "feature_span_hours": metadata["feature_span_hours"],
                "used_week_of_year": bool(metadata["used_week_of_year"]),
            },
        )

    def _predict_with_naive_seasonal(
        self,
        *,
        history: pd.Series,
        steps: int,
        granularity: str,
        reason: str,
        error_summary: str | None = None,
    ) -> ModelForecastResult:
        seasonal_period = 96 if granularity == "15m" else 24
        values = history.to_numpy(dtype=float)
        if len(values) >= seasonal_period:
            template = values[-seasonal_period:]
        elif len(values) > 0:
            template = values[-1:]
        else:
            template = np.array([0.0])

        metadata_json: dict[str, Scalar] = {"reason": reason}
        if error_summary:
            metadata_json["error_summary"] = self._truncate_error(error_summary)

        return ModelForecastResult(
            model_name="naive_seasonal",
            fallback_used=True,
            raw_values=np.resize(template, steps).astype(float),
            metadata_json=metadata_json,
        )

    def _build_output_points(
        self,
        history: pd.Series,
        granularity: str,
        raw_values: np.ndarray,
    ) -> list[OutputPoint]:
        future_index = self._future_index(history, granularity, len(raw_values))
        return [
            OutputPoint(
                timestamp=timestamp.to_pydatetime().astimezone(UTC),
                value=round(max(float(value), 0.0), 4),
            )
            for timestamp, value in zip(future_index, raw_values, strict=True)
        ]

    def _normalize_series(self, series: list[InputPoint]) -> pd.Series:
        ordered = sorted(series, key=lambda point: point.timestamp)
        index = pd.DatetimeIndex([point.timestamp.astimezone(UTC) for point in ordered])
        values = [point.value for point in ordered]
        return pd.Series(values, index=index, dtype=float)

    def _split_history(self, history: pd.Series) -> tuple[pd.Series, pd.Series]:
        if len(history) < 2:
            return history, history.iloc[0:0]

        split_index = max(1, int(len(history) * 0.8))
        split_index = min(split_index, len(history) - 1)
        return history.iloc[:split_index], history.iloc[split_index:]

    def _build_tree_training_frame(
        self,
        history: pd.Series,
        granularity: str,
    ) -> tuple[pd.DataFrame, pd.Series, dict[str, Scalar]]:
        working_frame = pd.DataFrame({"target": history.astype(float)}, index=history.index)
        shifted = working_frame["target"].shift(1)
        rolling_periods = self._rolling_windows(granularity)

        working_frame["lag_1"] = shifted
        working_frame["rolling_mean_3h"] = shifted.rolling(rolling_periods["3h"], min_periods=1).mean()
        working_frame["rolling_mean_6h"] = shifted.rolling(rolling_periods["6h"], min_periods=1).mean()
        working_frame["rolling_mean_24h"] = shifted.rolling(rolling_periods["24h"], min_periods=1).mean()
        working_frame["hour_of_day"] = history.index.hour.astype(float)

        used_week_of_year = self._history_spans_more_than_one_year(history)
        feature_columns = [
            "lag_1",
            "rolling_mean_3h",
            "rolling_mean_6h",
            "rolling_mean_24h",
            "hour_of_day",
        ]
        if used_week_of_year:
            working_frame["week_of_year"] = history.index.isocalendar().week.astype(int).astype(float)
            feature_columns.append("week_of_year")

        working_frame = working_frame.dropna()
        return (
            working_frame[feature_columns],
            working_frame["target"],
            {
                "used_week_of_year": used_week_of_year,
                "feature_span_hours": 24,
            },
        )

    def _recursive_tree_forecast(
        self,
        *,
        history: pd.Series,
        granularity: str,
        steps: int,
        model: RandomForestRegressor | GradientBoostingRegressor,
        feature_columns: list[str],
        used_week_of_year: bool,
    ) -> np.ndarray:
        values = history.to_numpy(dtype=float).tolist()
        timestamps = history.index.to_list()
        step = timedelta(minutes=15 if granularity == "15m" else 60)
        rolling_periods = self._rolling_windows(granularity)
        predictions: list[float] = []

        for _ in range(steps):
            next_timestamp = timestamps[-1].to_pydatetime().astimezone(UTC) + step
            next_features: dict[str, float] = {
                "lag_1": float(values[-1]),
                "rolling_mean_3h": float(np.mean(values[-rolling_periods["3h"] :])),
                "rolling_mean_6h": float(np.mean(values[-rolling_periods["6h"] :])),
                "rolling_mean_24h": float(np.mean(values[-rolling_periods["24h"] :])),
                "hour_of_day": float(next_timestamp.hour),
            }
            if used_week_of_year:
                next_features["week_of_year"] = float(next_timestamp.isocalendar().week)

            feature_row = pd.DataFrame([[next_features[column] for column in feature_columns]], columns=feature_columns)
            prediction = max(float(model.predict(feature_row)[0]), 0.0)
            predictions.append(prediction)
            values.append(prediction)
            timestamps.append(pd.Timestamp(next_timestamp))

        return np.array(predictions, dtype=float)

    def _compute_validation_metrics(
        self,
        validation_history: pd.Series,
        predicted_values: np.ndarray,
    ) -> tuple[float | None, float | None]:
        if len(validation_history) == 0 or len(predicted_values) == 0:
            return None, None

        actual = validation_history.to_numpy(dtype=float)
        clipped_predictions = np.array(predicted_values[: len(actual)], dtype=float)
        mae = float(np.mean(np.abs(actual - clipped_predictions)))

        non_zero_mask = np.abs(actual) > 1e-8
        if not np.any(non_zero_mask):
            return mae, None

        mape = float(
            np.mean(np.abs((actual[non_zero_mask] - clipped_predictions[non_zero_mask]) / actual[non_zero_mask])) * 100.0
        )
        return mae, mape

    def _resolve_model_parameters(
        self,
        model_name: str,
        advanced_settings: dict[str, Any] | None,
    ) -> dict[str, Scalar]:
        raw = advanced_settings or {}
        if model_name == "prophet":
            return {
                "changepoint_prior_scale": self._coerce_float(raw.get("changepoint_prior_scale"), 0.05, minimum=0.0001),
                "seasonality_prior_scale": self._coerce_float(raw.get("seasonality_prior_scale"), 10.0, minimum=0.0001),
                "holidays_prior_scale": self._coerce_float(raw.get("holidays_prior_scale"), 10.0, minimum=0.0001),
                "seasonality_mode": self._coerce_choice(raw.get("seasonality_mode"), ("additive", "multiplicative"), "additive"),
                "n_changepoints": self._coerce_int(raw.get("n_changepoints"), 25, minimum=0),
                "interval_width": self._coerce_float(raw.get("interval_width"), 0.8, minimum=0.05, maximum=0.99),
                "weekly_seasonality": self._coerce_bool(raw.get("weekly_seasonality"), True),
            }
        if model_name == "random_forest":
            return {
                "n_estimators": self._coerce_int(raw.get("n_estimators"), 100, minimum=10),
                "max_depth": self._coerce_optional_int(raw.get("max_depth"), None, minimum=1),
                "min_samples_split": self._coerce_int(raw.get("min_samples_split"), 2, minimum=2),
                "min_samples_leaf": self._coerce_int(raw.get("min_samples_leaf"), 1, minimum=1),
                "max_features": self._coerce_float(raw.get("max_features"), 1.0, minimum=0.1, maximum=1.0),
                "bootstrap": self._coerce_bool(raw.get("bootstrap"), True),
                "random_state": self._coerce_optional_int(raw.get("random_state"), 42, minimum=0),
            }
        if model_name == "gradient_boosting":
            return {
                "n_estimators": self._coerce_int(raw.get("n_estimators"), 100, minimum=10),
                "learning_rate": self._coerce_float(raw.get("learning_rate"), 0.1, minimum=0.001, maximum=1.0),
                "max_depth": self._coerce_int(raw.get("max_depth"), 3, minimum=1),
                "min_samples_split": self._coerce_int(raw.get("min_samples_split"), 2, minimum=2),
                "min_samples_leaf": self._coerce_int(raw.get("min_samples_leaf"), 1, minimum=1),
                "subsample": self._coerce_float(raw.get("subsample"), 1.0, minimum=0.1, maximum=1.0),
                "random_state": self._coerce_optional_int(raw.get("random_state"), 42, minimum=0),
            }

        return {
            "order_p": self._coerce_int(raw.get("order_p"), 2, minimum=0),
            "order_d": self._coerce_int(raw.get("order_d"), 1, minimum=0),
            "order_q": self._coerce_int(raw.get("order_q"), 2, minimum=0),
            "trend": self._coerce_choice(raw.get("trend"), ("n", "c", "t", "ct"), "n"),
            "enforce_stationarity": self._coerce_bool(raw.get("enforce_stationarity"), True),
            "enforce_invertibility": self._coerce_bool(raw.get("enforce_invertibility"), True),
            "maxiter": self._coerce_int(raw.get("maxiter"), 50, minimum=10),
        }

    def _serialize_parameters(self, parameters: dict[str, Scalar]) -> dict[str, Scalar]:
        serialized: dict[str, Scalar] = {}
        for key, value in parameters.items():
            serialized[f"param_{key}"] = value
        return serialized

    def _rolling_windows(self, granularity: str) -> dict[str, int]:
        if granularity == "15m":
            return {"3h": 12, "6h": 24, "24h": 96}
        return {"3h": 3, "6h": 6, "24h": 24}

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

    def _history_spans_more_than_one_year(self, history: pd.Series) -> bool:
        if len(history) < 2:
            return False
        return (history.index[-1] - history.index[0]) >= timedelta(days=365)

    def _coerce_int(self, value: Any, default: int, *, minimum: int | None = None, maximum: int | None = None) -> int:
        try:
            resolved = int(value)
        except (TypeError, ValueError):
            resolved = default
        if minimum is not None:
            resolved = max(resolved, minimum)
        if maximum is not None:
            resolved = min(resolved, maximum)
        return resolved

    def _coerce_optional_int(
        self,
        value: Any,
        default: int | None,
        *,
        minimum: int | None = None,
        maximum: int | None = None,
    ) -> int | None:
        if value in (None, "", "null", "None"):
            return default
        return self._coerce_int(value, default or 0, minimum=minimum, maximum=maximum)

    def _coerce_float(
        self,
        value: Any,
        default: float,
        *,
        minimum: float | None = None,
        maximum: float | None = None,
    ) -> float:
        try:
            resolved = float(value)
        except (TypeError, ValueError):
            resolved = default
        if minimum is not None:
            resolved = max(resolved, minimum)
        if maximum is not None:
            resolved = min(resolved, maximum)
        return resolved

    def _coerce_bool(self, value: Any, default: bool) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered in {"true", "1", "yes", "on"}:
                return True
            if lowered in {"false", "0", "no", "off"}:
                return False
        return default

    def _coerce_choice(self, value: Any, allowed: tuple[str, ...], default: str) -> str:
        if isinstance(value, str) and value in allowed:
            return value
        return default

    def _nullable_int(self, value: Scalar) -> int | None:
        if value is None:
            return None
        return int(value)

    def _truncate_error(self, error_text: str, limit: int = 220) -> str:
        compact = " ".join(error_text.split())
        if len(compact) <= limit:
            return compact
        return f"{compact[: limit - 3]}..."
