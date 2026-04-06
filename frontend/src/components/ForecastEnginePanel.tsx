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
  onSubmit: (overrideSettings?: ForecastAdvancedSettings) => void;
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
    return "MAE n/d";
  }
  const normalizedUnit =
    unit === "EUR/MWh" ? "€/MWh" : unit === "MWh" ? "MWh" : unit ?? "";
  const suffix = normalizedUnit ? ` ${normalizedUnit}` : "";
  return `MAE ${value.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}${suffix}`;
}

function formatMape(value: number | null): string {
  if (value === null) {
    return "MAPE n/d";
  }
  return `MAPE ${value.toLocaleString("it-IT", {
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
    label: run.signal_type === "price" ? "Prezzo" : "Volume",
    mae: formatMae(mae, maeUnit),
    mape: formatMape(mape),
    validationPeriod:
      validationStart && validationEnd
        ? `Validazione: ${formatDateTime(validationStart)} - ${formatDateTime(validationEnd)}`
        : "Validazione: periodo non disponibile",
    fallbackNote: run.fallback_used
      ? fallbackReason
        ? `Fallback attivo: ${fallbackReason}`
        : "Fallback attivo sul modello stagionale semplice."
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
      return `${(response.processing_ms / 1000).toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} s`;
    }
    if (errorProcessingMs !== null && errorProcessingMs !== undefined) {
      return `${(errorProcessingMs / 1000).toLocaleString("it-IT", {
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
    onSubmit(draftSettings);
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
                label="Aiuto Model"
                text={
                  role === "portfolioManager"
                    ? "Scegli il motore previsionale. ARIMA e' rapido e lineare, Prophet gestisce meglio trend e stagionalita'."
                    : "Il Profilo Analyst puo' attivare anche modelli ad alberi con feature derivate da storico e calendario."
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
              <span className="filter-label">Orizzonte</span>
              <HelpTooltip
                label="Aiuto Orizzonte"
                text="Definisce quanto avanti si estende la previsione. Intraday copre 24h, day-ahead copre 48h."
              />
            </span>
            <select
              aria-label="Orizzonte"
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
              <span className="filter-label">Cosa prevedere</span>
              <HelpTooltip
                label="Aiuto Cosa prevedere"
                text="Scegli se proiettare prezzi, volumi o entrambi. Il risultato compare subito nei due grafici in alto."
              />
            </span>
            <select
              aria-label="Cosa prevedere"
              value={value.targetKind}
              onChange={(event) =>
                onChange({
                  ...value,
                  targetKind: event.target.value as ForecastFormState["targetKind"],
                })
              }
            >
              <option value="price">prezzo</option>
              <option value="volume">volume</option>
              <option value="both">prezzo e volume</option>
            </select>
          </label>

          <div className="forecast-engine-actions">
            <button
              type="button"
              className="primary-button"
              disabled={isSubmitting}
              onClick={() => onSubmit()}
            >
              {isSubmitting ? "Forecast in esecuzione..." : "RUN"}
            </button>

            {role === "dataAnalyst" ? (
              <button
                type="button"
                className="secondary-button"
                disabled={isSubmitting}
                onClick={() => setIsAdvancedOpen(true)}
              >
                IMPOSTAZIONI AVANZATE
              </button>
            ) : null}
          </div>
        </div>

        <div className="forecast-engine-status">
          {isSubmitting ? (
            <div className="forecast-status-card">
              <div className="forecast-status-topline">
                <p className="forecast-status-title forecast-status-title-neutral">RISULTATI</p>
              </div>
              <LoadingBattery label="Training, validazione 80/20 e inferenza in corso sul portfolio aggregato." />
            </div>
          ) : error ? (
            <div className="forecast-status-card forecast-status-error">
              <div className="forecast-status-topline">
                <p className="forecast-status-title forecast-status-title-error">ERRORI</p>
                {processingCopy ? <span className="forecast-status-timing">{processingCopy}</span> : null}
              </div>
              <p className="forecast-status-copy">
                {error}
              </p>
            </div>
          ) : response ? (
            <div className="forecast-status-card">
              <div className="forecast-status-topline">
                <p className="forecast-status-title forecast-status-title-success">RISULTATI</p>
                {processingCopy ? <span className="forecast-status-timing">{processingCopy}</span> : null}
              </div>
              <p className="forecast-status-copy">
                Split cronologico 80/20 completato. Di seguito trovi MAE, MAPE e periodo di validazione per ogni segnale eseguito.
              </p>
              <ul className="forecast-status-list">
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
                <p className="forecast-status-title forecast-status-title-neutral">RISULTATI</p>
              </div>
              <p className="forecast-status-copy">
                Premi RUN per vedere metriche di validazione, tempo totale di processamento e overlay forecast nei grafici superiori.
              </p>
              <p className="forecast-status-copy forecast-status-copy-secondary">
                {role === "dataAnalyst"
                  ? `Per ${value.modelType} puoi aprire le impostazioni avanzate e salvare ${hyperparametersByModel[value.modelType].length} iperparametri.`
                  : "Il Profilo Portfolio Manager espone i modelli essenziali ARIMA e Prophet."}
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
