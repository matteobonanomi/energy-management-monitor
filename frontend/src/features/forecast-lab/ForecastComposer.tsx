import type { ForecastFormState, Granularity } from "../../types/api";

interface ForecastComposerProps {
  granularity: Granularity;
  value: ForecastFormState;
  isSubmitting: boolean;
  onChange: (nextValue: ForecastFormState) => void;
  onSubmit: () => void;
}

export function ForecastComposer({
  granularity,
  value,
  isSubmitting,
  onChange,
  onSubmit,
}: ForecastComposerProps) {
  return (
    <div className="forecast-form">
      <label className="field">
        <span className="filter-label">Model</span>
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
        <span className="filter-label">Granularity</span>
        <input type="text" value={granularity} disabled />
      </label>

      <label className="field">
        <span className="filter-label">Horizon</span>
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
        <span className="filter-label">Forecast target</span>
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

      <button type="button" className="primary-button" disabled={isSubmitting} onClick={onSubmit}>
        {isSubmitting ? "Forecast running..." : "Run forecast"}
      </button>
    </div>
  );
}
