import { useEffect, useMemo, useState } from "react";

import { energyApi } from "../api/client";
import { buildAllDefaultAdvancedSettings } from "../lib/forecastModelConfig";
import { trackUserAction } from "../lib/userActionTracking";
import type {
  ForecastAdvancedSettings,
  ForecastExecutionResponse,
  ForecastFormState,
  ForecastRunDetailResponse,
  ForecastModelType,
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
  const [errorProcessingMs, setErrorProcessingMs] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advancedSettingsByModel, setAdvancedSettingsByModel] = useState(
    buildAllDefaultAdvancedSettings(),
  );

  useEffect(() => {
    setResponse(null);
    setError(null);
    setErrorProcessingMs(null);
  }, [granularity]);

  const runsBySignal = useMemo(() => {
    const bySignal: Partial<Record<ForecastRunDetailResponse["signal_type"], ForecastRunDetailResponse>> = {};
    for (const run of response?.runs ?? []) {
      bySignal[run.signal_type] = run;
    }
    return bySignal;
  }, [response]);

  function setAdvancedSettings(
    modelType: ForecastModelType,
    nextSettings: ForecastAdvancedSettings,
  ) {
    setAdvancedSettingsByModel((current) => ({
      ...current,
      [modelType]: nextSettings,
    }));
  }

  async function runForecast(overrideSettings?: ForecastAdvancedSettings) {
    const startedAt = performance.now();
    setIsSubmitting(true);
    setError(null);
    setErrorProcessingMs(null);

    const activeAdvancedSettings =
      overrideSettings ?? advancedSettingsByModel[formState.modelType];

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
          advanced_settings_keys: Object.keys(activeAdvancedSettings ?? {}),
        },
      });
      const nextResponse = await energyApi.runForecast({
        model_type: formState.modelType,
        target_kind: formState.targetKind,
        horizon: formState.horizon,
        granularity,
        market_session: "MGP",
        advanced_settings: activeAdvancedSettings,
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
      setErrorProcessingMs(Math.round(performance.now() - startedAt));
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
    advancedSettingsByModel,
    setAdvancedSettings,
    response,
    runsBySignal,
    error,
    errorProcessingMs,
    isSubmitting,
    runForecast,
  };
}
