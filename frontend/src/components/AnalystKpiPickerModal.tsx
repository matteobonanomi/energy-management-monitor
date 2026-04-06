import { useMemo, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";

import { analystKpiCatalog, type AnalystKpiDefinition } from "../lib/analystKpis";
import { HelpTooltip } from "./HelpTooltip";

interface AnalystKpiPickerModalProps {
  onClose: () => void;
  onSelect: (definition: AnalystKpiDefinition) => void;
}

export function AnalystKpiPickerModal({
  onClose,
  onSelect,
}: AnalystKpiPickerModalProps) {
  const [query, setQuery] = useState("");

  const filteredKpis = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return analystKpiCatalog;
    }
    return analystKpiCatalog.filter((definition) =>
      `${definition.title} ${definition.helpText}`.toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  const modalContent = (
    <div className="advanced-modal-backdrop" onClick={handleBackdropClick}>
      <div
        className="advanced-modal-card analyst-kpi-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="analyst-kpi-modal-title"
      >
        <button
          type="button"
          className="advanced-modal-close"
          aria-label="Close KPI picker"
          onClick={onClose}
        >
          X
        </button>

        <div className="advanced-modal-header">
          <p className="advanced-modal-eyebrow">KPI selector</p>
          <h3 id="analyst-kpi-modal-title">Choose a KPI</h3>
        </div>

        <div className="plant-selector-body">
          <input
            type="search"
            aria-label="KPI search"
            className="plant-selector-search"
            placeholder="Search by KPI name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="analyst-kpi-picker-grid">
            {filteredKpis.map((definition) => (
              <div key={definition.id} className="analyst-kpi-picker-item">
                <button
                  type="button"
                  className="analyst-kpi-picker-select"
                  onClick={() => onSelect(definition)}
                >
                  <span className="analyst-kpi-picker-copy">
                    <strong>{definition.title}</strong>
                  </span>
                </button>
                <HelpTooltip
                  label={`Help ${definition.title}`}
                  text={definition.helpText}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
