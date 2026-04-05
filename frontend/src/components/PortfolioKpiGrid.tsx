import type { DashboardSummaryResponse } from "../types/api";
import { formatCompactNumber, formatPrice } from "../lib/format";

interface PortfolioKpiGridProps {
  summary: DashboardSummaryResponse | null;
  loading: boolean;
  error: string | null;
}

function formatGwh(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "--";
  }
  return `${value.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} GWh`;
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "--";
  }
  return `${value.toLocaleString("it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

const metricDefinitions = [
  {
    title: "Avg daily Price",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatPrice(summary?.daily_avg_price_eur_mwh),
  },
  {
    title: "Avg weekly Price",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatPrice(summary?.weekly_avg_price_eur_mwh),
  },
  {
    title: "Avg Prod 24h",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatGwh(summary?.daily_avg_production_gwh),
  },
  {
    title: "Active plants",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatCompactNumber(summary?.active_plants_24h),
  },
  {
    title: "Inactive plants",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatCompactNumber(summary?.inactive_plants_24h),
  },
  {
    title: "Renewables",
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
        <p>Sto calcolando i KPI portfolio sulle ultime 24h e sull'ultima settimana.</p>
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
      {metricDefinitions.map((metric) => (
        <article key={metric.title} className="kpi-tile">
          <span className="kpi-title">{metric.title}</span>
          <strong className="kpi-value">{metric.accessor(summary)}</strong>
        </article>
      ))}
    </div>
  );
}
