import { useState } from "react";

import { energyApi } from "../../api/client";
import { EmptyPanel, SectionCard } from "../../components/Panel";
import type { DashboardFiltersState, FiltersResponse, ForecastFormState, Granularity } from "../../types/api";
import { ForecastComposer } from "./ForecastComposer";

interface ForecastLabViewProps {
  filtersData: FiltersResponse | null;
  filters: DashboardFiltersState;
  granularity: Granularity;
}

export function ForecastLabView({
  filtersData: _filtersData,
  filters: _filters,
  granularity,
}: ForecastLabViewProps) {
  const [formState, setFormState] = useState<ForecastFormState>({
    modelType: "arima",
    targetKind: "both",
    horizon: "next_24h",
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setStatusMessage(null);

    try {
      const response = await energyApi.runForecast({
        model_type: formState.modelType,
        target_kind: formState.targetKind,
        horizon: formState.horizon,
        granularity,
        market_session: "MGP",
      });
      setStatusMessage(`Run completati: ${response.runs.length}`);
    } catch (reason) {
      setStatusMessage(
        reason instanceof Error ? reason.message : "Errore durante l'esecuzione forecast.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="forecast-grid">
      <SectionCard
        eyebrow="Legacy view"
        title="Forecast Lab"
        subtitle="Vista legacy mantenuta per compatibilita interna. Il trigger principale ora vive nella griglia 2x2."
      >
        <ForecastComposer
          granularity={granularity}
          value={formState}
          isSubmitting={submitting}
          onChange={setFormState}
          onSubmit={handleSubmit}
        />
        {statusMessage ? <div className="callout">{statusMessage}</div> : null}
      </SectionCard>

      <EmptyPanel
        title="Forecast Lab"
        message="Usa il pannello Forecast Engine nella schermata principale per vedere il forecast direttamente sui grafici monitor."
      />
    </div>
  );
}
