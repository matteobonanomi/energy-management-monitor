import type {
  ForecastExecutionResponse,
  ForecastFormState,
} from "../types/api";
import { formatDateTime } from "../lib/format";
import { HelpTooltip } from "./HelpTooltip";

interface ForecastEnginePanelProps {
  value: ForecastFormState;
  response: ForecastExecutionResponse | null;
  isSubmitting: boolean;
  error: string | null;
  onChange: (nextValue: ForecastFormState) => void;
  onSubmit: () => void;
}

export function ForecastEnginePanel({
  value,
  response,
  isSubmitting,
  error,
  onChange,
  onSubmit,
}: ForecastEnginePanelProps) {
  return (
    <div className="forecast-engine">
      <div className="forecast-engine-form">
        <label className="field">
          <span className="field-heading">
            <span className="filter-label">Model</span>
            <HelpTooltip
              label="Aiuto Model"
              text="Scegli il motore previsionale. ARIMA è rapido e lineare, Prophet gestisce meglio trend e stagionalità."
            />
          </span>
          <select
            aria-label="Model"
            value={value.modelType}
            onChange={(event) =>
              onChange({
                ...value,
                modelType: event.target.value as ForecastFormState["modelType"],
              })
            }
          >
            <option value="arima">statistico (ARIMA)</option>
            <option value="prophet">avanzato (Prophet)</option>
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

        <button
          type="button"
          className="primary-button"
          disabled={isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? "Forecast in esecuzione..." : "RUN"}
        </button>
      </div>

      <div className="forecast-engine-status">
        {error ? (
          <div className="forecast-status-card forecast-status-error">
            <p>{error}</p>
          </div>
        ) : response ? (
          <div className="forecast-status-card">
            <p className="forecast-status-title">Forecast guide</p>
            <p className="forecast-status-copy">
              Configura il motore a sinistra e premi RUN. Il forecast viene
              calcolato sul portfolio aggregato e disegnato con linea
              tratteggiata sopra lo storico.
            </p>
            <p className="forecast-status-title forecast-status-title-secondary">
              Ultimo run completato
            </p>
            <p>
              {response.model_type.toUpperCase()} · {response.granularity} ·{" "}
              {response.horizon === "next_24h" ? "intraday" : "day-ahead"}
            </p>
            <ul className="forecast-status-list">
              {response.runs.map((run) => (
                <li key={run.id}>
                  {run.signal_type === "price" ? "Price" : "Energy"} ·{" "}
                  {run.model_name}
                  {run.fallback_used ? " (fallback)" : ""} ·{" "}
                  {formatDateTime(run.completed_at)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="forecast-status-card">
            <p className="forecast-status-title">Forecast guide</p>
            <p className="forecast-status-copy">
              Seleziona modello, orizzonte e target. Il forecast completato viene
              mostrato subito nei due grafici superiori con linea tratteggiata.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
