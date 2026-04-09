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
  ForecastProductionScope,
  Granularity,
} from "../types/api";

const initialFormState: ForecastFormState = {
  modelType: "arima",
  targetKind: "both",
  horizon: "next_24h",
};

/**
 * Owns forecast form and run state so execution feedback, advanced settings,
 * and triggered overlays stay aligned after each request.
 */
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
      if (!bySignal[run.signal_type]) {
        bySignal[run.signal_type] = run;
      }
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

  async function runForecast(options?: {
    advancedSettings?: ForecastAdvancedSettings;
    productionScope?: ForecastProductionScope;
    productionTargetCode?: string | null;
    includeProductionBreakdowns?: boolean;
  }) {
    const startedAt = performance.now();
    setIsSubmitting(true);
    setError(null);
    setErrorProcessingMs(null);

    const activeAdvancedSettings =
      options?.advancedSettings ?? advancedSettingsByModel[formState.modelType];
    const productionScope = options?.productionScope ?? "portfolio";
    const productionTargetCode = options?.productionTargetCode ?? null;
    const includeProductionBreakdowns =
      options?.includeProductionBreakdowns ?? false;

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
          production_scope: productionScope,
          production_target_code: productionTargetCode,
          include_production_breakdowns: includeProductionBreakdowns,
        },
      });
      const nextResponse = await energyApi.runForecast({
        model_type: formState.modelType,
        target_kind: formState.targetKind,
        horizon: formState.horizon,
        granularity,
        market_session: "MGP",
        advanced_settings: activeAdvancedSettings,
        production_scope: productionScope,
        production_target_code: productionTargetCode,
        include_production_breakdowns: includeProductionBreakdowns,
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
          production_scope: productionScope,
          production_target_code: productionTargetCode,
          include_production_breakdowns: includeProductionBreakdowns,
        },
      });
    } catch (reason) {
      setErrorProcessingMs(Math.round(performance.now() - startedAt));
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to run the requested forecast.",
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
          production_scope: productionScope,
          production_target_code: productionTargetCode,
          include_production_breakdowns: includeProductionBreakdowns,
        },
        payload: {
          error:
            reason instanceof Error
              ? reason.message
              : "Unable to run the requested forecast.",
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
