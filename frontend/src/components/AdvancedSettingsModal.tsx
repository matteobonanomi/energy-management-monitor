import type { MouseEvent } from "react";

import {
  hyperparametersByModel,
  type ForecastHyperparameterDefinition,
} from "../lib/forecastModelConfig";
import type {
  ForecastAdvancedSettings,
  ForecastModelType,
} from "../types/api";
import { HelpTooltip } from "./HelpTooltip";

interface AdvancedSettingsModalProps {
  modelType: ForecastModelType;
  values: ForecastAdvancedSettings;
  onChange: (key: string, value: string | number | boolean | null) => void;
  onClose: () => void;
  onSave: () => void;
  onSaveAndRun: () => void;
}

function renderField(
  definition: ForecastHyperparameterDefinition,
  value: string | number | boolean | null | undefined,
  onChange: (nextValue: string | number | boolean | null) => void,
) {
  if (definition.inputType === "boolean") {
    return (
      <select
        aria-label={definition.label}
        value={String(Boolean(value))}
        onChange={(event) => onChange(event.target.value === "true")}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  if (definition.inputType === "select") {
    return (
      <select
        aria-label={definition.label}
        value={String(value ?? definition.defaultValue)}
        onChange={(event) => onChange(event.target.value)}
      >
        {definition.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  const stringValue =
    value === null || value === undefined ? "" : String(value);

  return (
    <input
      aria-label={definition.label}
      type="number"
      value={stringValue}
      min={definition.min}
      max={definition.max}
      step={definition.step}
      placeholder={definition.inputType === "nullable-number" ? "default" : undefined}
      onChange={(event) => {
        if (definition.inputType === "nullable-number" && event.target.value === "") {
          onChange(null);
          return;
        }

        const nextValue = Number(event.target.value);
        onChange(Number.isNaN(nextValue) ? definition.defaultValue : nextValue);
      }}
    />
  );
}

export function AdvancedSettingsModal({
  modelType,
  values,
  onChange,
  onClose,
  onSave,
  onSaveAndRun,
}: AdvancedSettingsModalProps) {
  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div className="advanced-modal-backdrop" onClick={handleBackdropClick}>
      <div
        className="advanced-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="advanced-settings-title"
      >
        <button
          type="button"
          className="advanced-modal-close"
          aria-label="Chiudi impostazioni avanzate"
          onClick={onClose}
        >
          X
        </button>

        <div className="advanced-modal-header">
          <p className="advanced-modal-eyebrow">Impostazioni avanzate</p>
          <h3 id="advanced-settings-title">{modelType}</h3>
        </div>

        <div className="advanced-settings-grid">
          {hyperparametersByModel[modelType].map((definition) => (
            <div key={definition.key} className="advanced-settings-row">
              <span className="advanced-settings-name">{definition.label}</span>
              <HelpTooltip
                label={`Aiuto ${definition.label}`}
                text={definition.helpText}
              />
              <div className="advanced-settings-input">
                {renderField(definition, values[definition.key], (nextValue) =>
                  onChange(definition.key, nextValue),
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="advanced-modal-actions">
          <button type="button" className="ghost-button" onClick={onSave}>
            SAVE
          </button>
          <button type="button" className="primary-button" onClick={onSaveAndRun}>
            SAVE&RUN
          </button>
        </div>
      </div>
    </div>
  );
}
