import { useEffect, useMemo, useState } from "react";

import {
  buildDefaultAdvancedSettings,
  forecastModelOptionsByRole,
  hyperparametersByModel,
} from "../lib/forecastModelConfig";
import { formatDateTime } from "../lib/format";
import type {
  ForecastAdvancedSettings,
  ForecastExecutionResponse,
  ForecastFormState,
  ForecastModelType,
  ForecastProductionScope,
  ForecastRunDetailResponse,
  UserRole,
} from "../types/api";
import { AdvancedSettingsModal } from "./AdvancedSettingsModal";
import { HelpTooltip } from "./HelpTooltip";
import { LoadingBattery } from "./LoadingBattery";

interface ForecastEnginePanelProps {
  role: UserRole;
  value: ForecastFormState;
  advancedSettingsByModel: Record<ForecastModelType, ForecastAdvancedSettings>;
  response: ForecastExecutionResponse | null;
  isSubmitting: boolean;
  error: string | null;
  errorProcessingMs: number | null;
  onChange: (nextValue: ForecastFormState) => void;
  onAdvancedSettingsSave: (
    modelType: ForecastModelType,
    nextSettings: ForecastAdvancedSettings,
  ) => void;
  onSubmit: (options?: {
    advancedSettings?: ForecastAdvancedSettings;
    productionScope?: ForecastProductionScope;
    productionTargetCode?: string | null;
  }) => void;
}

interface ResultSummary {
  label: string;
  mae: string;
  mape: string;
  validationPeriod: string;
  fallbackNote: string | null;
}

function readMetadataNumber(
  run: ForecastRunDetailResponse,
  key: string,
): number | null {
  const value = run.metadata_json?.[key];
  return typeof value === "number" ? value : null;
}

function readMetadataString(
  run: ForecastRunDetailResponse,
  key: string,
): string | null {
  const value = run.metadata_json?.[key];
  return typeof value === "string" ? value : null;
}

function formatMae(
  value: number | null,
  unit: string | null,
): string {
  if (value === null) {
    return "MAE n/a";
  }
  const normalizedUnit =
    unit === "EUR/MWh" ? "€/MWh" : unit === "MWh" ? "MWh" : unit ?? "";
  const suffix = normalizedUnit ? ` ${normalizedUnit}` : "";
  return `MAE ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}${suffix}`;
}

function formatMape(value: number | null): string {
  if (value === null) {
    return "MAPE n/a";
  }
  return `MAPE ${value.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function buildResultSummary(run: ForecastRunDetailResponse): ResultSummary {
  const mae = readMetadataNumber(run, "validation_mae");
  const mape = readMetadataNumber(run, "validation_mape_pct");
  const maeUnit = readMetadataString(run, "validation_mae_unit");
  const validationStart = readMetadataString(run, "validation_start");
  const validationEnd = readMetadataString(run, "validation_end");
  const fallbackReason = readMetadataString(run, "error_summary");

  return {
    label: run.signal_type === "price" ? "Price" : "Volume",
    mae: formatMae(mae, maeUnit),
    mape: formatMape(mape),
    validationPeriod:
      validationStart && validationEnd
        ? `Validation: ${formatDateTime(validationStart)} - ${formatDateTime(validationEnd)}`
        : "Validation: period unavailable",
    fallbackNote: run.fallback_used
      ? fallbackReason
        ? `Fallback active: ${fallbackReason}`
        : "Fallback active on the simple seasonal model."
      : null,
  };
}

export function ForecastEnginePanel({
  role,
  value,
  advancedSettingsByModel,
  response,
  isSubmitting,
  error,
  errorProcessingMs,
  onChange,
  onAdvancedSettingsSave,
  onSubmit,
}: ForecastEnginePanelProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [draftSettings, setDraftSettings] = useState<ForecastAdvancedSettings>(
    advancedSettingsByModel[value.modelType],
  );

  useEffect(() => {
    setDraftSettings(advancedSettingsByModel[value.modelType] ?? buildDefaultAdvancedSettings(value.modelType));
  }, [advancedSettingsByModel, value.modelType]);

  const availableModels = forecastModelOptionsByRole[role];
  const resultSummaries = useMemo(
    () => (response?.runs ?? []).map(buildResultSummary),
    [response],
  );
  const processingCopy = useMemo(() => {
    if (response?.processing_ms !== null && response?.processing_ms !== undefined) {
      return `${(response.processing_ms / 1000).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} s`;
    }
    if (errorProcessingMs !== null && errorProcessingMs !== undefined) {
      return `${(errorProcessingMs / 1000).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} s`;
    }
    return null;
  }, [errorProcessingMs, response]);

  function handleAdvancedSettingChange(
    key: string,
    nextValue: string | number | boolean | null,
  ) {
    setDraftSettings((current) => ({
      ...current,
      [key]: nextValue,
    }));
  }

  function handleSaveAdvanced() {
    onAdvancedSettingsSave(value.modelType, draftSettings);
    setIsAdvancedOpen(false);
  }

  function handleSaveAndRunAdvanced() {
    onAdvancedSettingsSave(value.modelType, draftSettings);
    setIsAdvancedOpen(false);
    onSubmit({ advancedSettings: draftSettings });
  }

  return (
    <>
      <div
        className={
          role === "dataAnalyst"
            ? "forecast-engine forecast-engine-analyst"
            : "forecast-engine"
        }
      >
        <div className="forecast-engine-form">
          <label className="field">
              <span className="field-heading">
                <span className="filter-label">Model</span>
                <HelpTooltip
                label="Help Model"
                text={
                  role === "portfolioManager"
                    ? "Choose the forecasting engine. ARIMA is fast and linear, while Prophet is better at handling trend and seasonality."
                    : "The Data Analyst profile can also use tree-based models with historical and calendar-derived features."
                }
              />
            </span>
            <select
              aria-label="Model"
              value={value.modelType}
              onChange={(event) =>
                onChange({
                  ...value,
                  modelType: event.target.value as ForecastModelType,
                })
              }
            >
              {availableModels.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-heading">
              <span className="filter-label">Horizon</span>
              <HelpTooltip
                label="Help Horizon"
                text="Defines how far the forecast extends. Intraday covers 24h, day-ahead covers 48h."
              />
            </span>
            <select
              aria-label="Horizon"
              value={value.horizon}
              onChange={(event) =>
                onChange({
                  ...value,
                  horizon: event.target.value as ForecastFormState["horizon"],
                })
              }
            >
              <option value="next_24h">intraday (next 24h)</option>
              <option value="day_ahead">day-ahead (next 48h)</option>
            </select>
          </label>

          <label className="field">
            <span className="field-heading">
              <span className="filter-label">Forecast target</span>
              <HelpTooltip
                label="Help Forecast target"
                text="Choose whether to project price, volume, or both. The result appears immediately on the upper charts."
              />
            </span>
            <select
              aria-label="Forecast target"
              value={value.targetKind}
              onChange={(event) =>
                onChange({
                  ...value,
                  targetKind: event.target.value as ForecastFormState["targetKind"],
                })
              }
            >
              <option value="price">price</option>
              <option value="volume">volume</option>
              <option value="both">price and volume</option>
            </select>
          </label>

          <div className="forecast-engine-actions">
              <button
              type="button"
              className="primary-button"
              disabled={isSubmitting}
              onClick={() => onSubmit()}
            >
              {isSubmitting ? "Forecast running..." : "RUN"}
            </button>

            {role === "dataAnalyst" ? (
              <button
                type="button"
                className="secondary-button"
                disabled={isSubmitting}
                onClick={() => setIsAdvancedOpen(true)}
              >
                ADVANCED SETTINGS
              </button>
            ) : null}
          </div>
        </div>

        <div className="forecast-engine-status">
          {isSubmitting ? (
            <div className="forecast-status-card">
              <div className="forecast-status-topline">
                <p className="forecast-status-title forecast-status-title-neutral">RESULTS</p>
              </div>
              <LoadingBattery label="Training, 80/20 validation, and inference are running on the requested signal." />
            </div>
          ) : error ? (
            <div className="forecast-status-card forecast-status-error">
              <div className="forecast-status-topline">
                <p className="forecast-status-title forecast-status-title-error">ERRORS</p>
                {processingCopy ? <span className="forecast-status-timing">{processingCopy}</span> : null}
              </div>
              <p className="forecast-status-copy">
                {error}
              </p>
            </div>
          ) : response ? (
            <div className="forecast-status-card">
              <div className="forecast-status-topline">
                <p className="forecast-status-title forecast-status-title-success">RESULTS</p>
                {processingCopy ? <span className="forecast-status-timing">{processingCopy}</span> : null}
              </div>
              <ul className="forecast-status-list forecast-status-list-compact">
                {resultSummaries.map((summary) => (
                  <li key={summary.label}>
                    <strong>{summary.label}</strong>
                    <span>{summary.mae}</span>
                    <span>{summary.mape}</span>
                    <span>{summary.validationPeriod}</span>
                    {summary.fallbackNote ? <span>{summary.fallbackNote}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="forecast-status-card">
              <div className="forecast-status-topline">
                <p className="forecast-status-title forecast-status-title-neutral">RESULTS</p>
              </div>
              <p className="forecast-status-copy">
                Press RUN to display validation metrics, total processing time, and the forecast overlay on the upper charts.
              </p>
              <p className="forecast-status-copy forecast-status-copy-secondary">
                {role === "dataAnalyst"
                  ? `For ${value.modelType}, you can open advanced settings and save ${hyperparametersByModel[value.modelType].length} hyperparameters.`
                  : "The Portfolio Manager profile focuses on the essential ARIMA and Prophet models."}
              </p>
            </div>
          )}
        </div>
      </div>

      {isAdvancedOpen ? (
        <AdvancedSettingsModal
          modelType={value.modelType}
          values={draftSettings}
          onChange={handleAdvancedSettingChange}
          onClose={() => setIsAdvancedOpen(false)}
          onSave={handleSaveAdvanced}
          onSaveAndRun={handleSaveAndRunAdvanced}
        />
      ) : null}
    </>
  );
}
