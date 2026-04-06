import { HelpTooltip } from "./HelpTooltip";
import { LoadingBattery } from "./LoadingBattery";
import type { DashboardSummaryResponse } from "../types/api";
import { formatCompactNumber } from "../lib/format";

interface PortfolioKpiGridProps {
  summary: DashboardSummaryResponse | null;
  loading: boolean;
  error: string | null;
}

interface KpiValueParts {
  value: string;
  unit?: string;
}

function formatGwh(value: number | null | undefined): KpiValueParts {
  if (value === null || value === undefined) {
    return { value: "--" };
  }
  return {
    value: value.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    unit: "GWh",
  };
}

function formatPercent(value: number | null | undefined): KpiValueParts {
  if (value === null || value === undefined) {
    return { value: "--" };
  }
  return {
    value: value.toLocaleString("it-IT", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
    unit: "%",
  };
}

function formatCount(value: number | null | undefined): KpiValueParts {
  return { value: formatCompactNumber(value) };
}

function formatPriceParts(value: number | null | undefined): KpiValueParts {
  if (value === null || value === undefined) {
    return { value: "--" };
  }
  return {
    value: value.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    unit: "€/MWh",
  };
}

const metricDefinitions = [
  {
    title: "Avg daily Price",
    helpText: "Prezzo medio del mercato nelle ultime 24 ore. Ti aiuta a leggere il livello recente del mercato.",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatPriceParts(summary?.daily_avg_price_eur_mwh),
  },
  {
    title: "Avg weekly Price",
    helpText: "Prezzo medio sull'ultima settimana. Smorza il rumore giornaliero e mostra il contesto di breve periodo.",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatPriceParts(summary?.weekly_avg_price_eur_mwh),
  },
  {
    title: "Avg Prod 24h",
    helpText: "Produzione media aggregata del portfolio nelle ultime 24 ore. Serve per confrontare il ritmo operativo più recente.",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatGwh(summary?.daily_avg_production_gwh),
  },
  {
    title: "Active plants",
    helpText: "Numero di impianti che hanno prodotto almeno una volta nelle ultime 24 ore.",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatCount(summary?.active_plants_24h),
  },
  {
    title: "Inactive plants",
    helpText: "Numero di impianti senza produzione nelle ultime 24 ore. Aiuta a intercettare fermate o indisponibilità.",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatCount(summary?.inactive_plants_24h),
  },
  {
    title: "Renewables",
    helpText: "Quota percentuale della produzione portfolio coperta da fonti rinnovabili nelle ultime 24 ore.",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatPercent(summary?.renewables_share_pct_24h),
  },
];

export function PortfolioKpiGrid({
  summary,
  loading,
  error,
}: PortfolioKpiGridProps) {
  if (loading) {
    return (
      <div className="kpi-grid-state">
        <LoadingBattery label="Sto calcolando i KPI portfolio sulle ultime 24h e sull'ultima settimana." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="kpi-grid-state kpi-grid-state-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="kpi-grid-3x2">
      {metricDefinitions.map((metric) => {
        const value = metric.accessor(summary);
        return (
          <article key={metric.title} className="kpi-tile">
            <div className="kpi-heading">
              <span className="kpi-title">{metric.title}</span>
              <HelpTooltip label={`Aiuto ${metric.title}`} text={metric.helpText} />
            </div>
            <strong className="kpi-value">
              <span>{value.value}</span>
              {value.unit ? <span className="kpi-unit">{value.unit}</span> : null}
            </strong>
          </article>
        );
      })}
    </div>
  );
}
