import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  buildDefaultAdvancedSettings,
  forecastModelOptionsByRole,
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
  id: number;
  title: string;
  recap: string;
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

function formatRunTitle(run: ForecastRunDetailResponse): string {
  if (run.signal_type === "price") {
    return "Modello di prezzo";
  }
  if (run.scope === "technology" && run.target_code) {
    return `Modello di produzione - ${run.target_code.toUpperCase()}`;
  }
  if (run.scope === "zone" && run.target_code) {
    return `Modello di produzione - Zona ${run.target_code}`;
  }
  if (run.scope === "plant" && run.target_code) {
    return `Modello di produzione - Impianto ${run.target_code}`;
  }
  return "Modello di produzione - Totale";
}

function formatRunRecap(run: ForecastRunDetailResponse): string {
  const parameter =
    run.signal_type === "price"
      ? "price"
      : run.scope === "technology" && run.target_code
      ? `production ${run.target_code.toUpperCase()}`
      : "production total";
  return `${run.model_name.toUpperCase()} · ${run.horizon} · ${parameter}`;
}

function buildResultSummary(run: ForecastRunDetailResponse): ResultSummary {
  const mae = readMetadataNumber(run, "validation_mae");
  const mape = readMetadataNumber(run, "validation_mape_pct");
  const maeUnit = readMetadataString(run, "validation_mae_unit");
  const validationStart = readMetadataString(run, "validation_start");
  const validationEnd = readMetadataString(run, "validation_end");
  const fallbackReason = readMetadataString(run, "error_summary");

  return {
    id: run.id,
    title: formatRunTitle(run),
    recap: formatRunRecap(run),
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

interface ForecastResultDetailsModalProps {
  summaries: ResultSummary[];
  onClose: () => void;
}

function ForecastResultDetailsModal({
  summaries,
  onClose,
}: ForecastResultDetailsModalProps) {
  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  const modalContent = (
    <div className="advanced-modal-backdrop" onClick={handleBackdropClick}>
      <div
        className="advanced-modal-card forecast-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forecast-details-title"
      >
        <button
          type="button"
          className="advanced-modal-close"
          aria-label="Close forecast details"
          onClick={onClose}
        >
          X
        </button>
        <div className="advanced-modal-header">
          <p className="advanced-modal-eyebrow">Forecast details</p>
          <h3 id="forecast-details-title">Model metrics</h3>
        </div>
        <div className="forecast-details-list">
          {summaries.map((summary) => (
            <article key={summary.id} className="forecast-details-item">
              <h4>{summary.title}</h4>
              <p>{summary.recap}</p>
              <p>{summary.mae}</p>
              <p>{summary.mape}</p>
              <p>{summary.validationPeriod}</p>
              {summary.fallbackNote ? <p>{summary.fallbackNote}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

/**
 * Concentrates forecast controls and execution feedback so model selection,
 * advanced settings, and run outcomes stay in one decision-making surface.
 */
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
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [draftSettings, setDraftSettings] = useState<ForecastAdvancedSettings>(
    advancedSettingsByModel[value.modelType],
  );

  useEffect(() => {
    setDraftSettings(advancedSettingsByModel[value.modelType] ?? buildDefaultAdvancedSettings(value.modelType));
  }, [advancedSettingsByModel, value.modelType]);

  useEffect(() => {
    if (isSubmitting) {
      setIsDetailsOpen(false);
    }
  }, [isSubmitting]);

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
  const executionStatus = useMemo(() => {
    if (error) {
      return "FAIL";
    }
    if (response) {
      return "SUCCEED";
    }
    return "--";
  }, [error, response]);
  const modelRecapRows = useMemo(() => {
    if (resultSummaries.length > 0) {
      return resultSummaries.map((summary) => summary.recap);
    }
    if (error) {
      const requestedParameter =
        value.targetKind === "both"
          ? "price + production"
          : value.targetKind === "price"
          ? "price"
          : "production";
      return [`${value.modelType.toUpperCase()} · ${value.horizon} · ${requestedParameter}`];
    }
    return [];
  }, [error, resultSummaries, value.horizon, value.modelType, value.targetKind]);

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
          ) : (
            <div className={error ? "forecast-status-card forecast-status-error" : "forecast-status-card"}>
              <div className="forecast-status-topline">
                <p
                  className={
                    response
                      ? "forecast-status-title forecast-status-title-success"
                      : error
                      ? "forecast-status-title forecast-status-title-error"
                      : "forecast-status-title forecast-status-title-neutral"
                  }
                >
                  RESULTS
                </p>
              </div>
              <div className="forecast-status-summary">
                <p>
                  <span>Status:</span>
                  <strong>{executionStatus}</strong>
                </p>
                <p>
                  <span>Durata:</span>
                  <strong>{processingCopy ?? "--"}</strong>
                </p>
                <div className="forecast-status-models-row">
                  <span>Modelli:</span>
                  {modelRecapRows.length > 0 ? (
                    <ul className="forecast-status-models-list">
                      {modelRecapRows.map((row) => (
                        <li key={row}>{row}</li>
                      ))}
                    </ul>
                  ) : (
                    <strong>--</strong>
                  )}
                </div>
              </div>
              {resultSummaries.length > 0 ? (
                <button
                  type="button"
                  className="ghost-button forecast-more-details-button"
                  onClick={() => setIsDetailsOpen(true)}
                >
                  MORE DETAILS
                </button>
              ) : null}
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
      {isDetailsOpen && resultSummaries.length > 0 ? (
        <ForecastResultDetailsModal
          summaries={resultSummaries}
          onClose={() => setIsDetailsOpen(false)}
        />
      ) : null}
    </>
  );
}
