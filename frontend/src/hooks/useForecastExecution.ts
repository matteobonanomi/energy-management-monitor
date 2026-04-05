import { useEffect, useMemo, useState } from "react";

import { energyApi } from "../api/client";
import { trackUserAction } from "../lib/userActionTracking";
import type {
  ForecastExecutionResponse,
  ForecastFormState,
  ForecastRunDetailResponse,
  Granularity,
} from "../types/api";

const initialFormState: ForecastFormState = {
  modelType: "arima",
  targetKind: "both",
  horizon: "next_24h",
};

export function useForecastExecution(granularity: Granularity) {
  const [formState, setFormState] = useState<ForecastFormState>(initialFormState);
  const [response, setResponse] = useState<ForecastExecutionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setResponse(null);
    setError(null);
  }, [granularity]);

  const runsBySignal = useMemo(() => {
    const bySignal: Partial<Record<ForecastRunDetailResponse["signal_type"], ForecastRunDetailResponse>> = {};
    for (const run of response?.runs ?? []) {
      bySignal[run.signal_type] = run;
    }
    return bySignal;
  }, [response]);

  async function runForecast() {
    setIsSubmitting(true);
    setError(null);

    try {
      void trackUserAction({
        eventName: "forecast_run_requested",
        surface: "forecast_engine",
        outcome: "attempted",
        granularity,
        context: {
          model_type: formState.modelType,
          target_kind: formState.targetKind,
          horizon: formState.horizon,
        },
      });
      const nextResponse = await energyApi.runForecast({
        model_type: formState.modelType,
        target_kind: formState.targetKind,
        horizon: formState.horizon,
        granularity,
        market_session: "MGP",
      });
      setResponse(nextResponse);
      void trackUserAction({
        eventName: "forecast_run_completed",
        surface: "forecast_engine",
        outcome: "succeeded",
        granularity,
        context: {
          model_type: nextResponse.model_type,
          horizon: nextResponse.horizon,
          run_ids: nextResponse.runs.map((run) => run.id),
        },
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Impossibile eseguire il forecast richiesto.",
      );
      void trackUserAction({
        eventName: "forecast_run_completed",
        surface: "forecast_engine",
        outcome: "failed",
        granularity,
        context: {
          model_type: formState.modelType,
          target_kind: formState.targetKind,
          horizon: formState.horizon,
        },
        payload: {
          error:
            reason instanceof Error
              ? reason.message
              : "Impossibile eseguire il forecast richiesto.",
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    formState,
    setFormState,
    response,
    runsBySignal,
    error,
    isSubmitting,
    runForecast,
  };
}
