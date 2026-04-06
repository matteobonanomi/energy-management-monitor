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
    value: value.toLocaleString("en-US", {
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
    value: value.toLocaleString("en-US", {
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
    value: value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    unit: "€/MWh",
  };
}

const metricDefinitions = [
  {
    title: "Avg daily Price",
    helpText: "Average market price over the last 24 hours. It gives a quick read of the most recent price level.",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatPriceParts(summary?.daily_avg_price_eur_mwh),
  },
  {
    title: "Avg weekly Price",
    helpText: "Average market price over the last week. It smooths daily noise and highlights the short-term context.",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatPriceParts(summary?.weekly_avg_price_eur_mwh),
  },
  {
    title: "Avg Prod 24h",
    helpText: "Average aggregated portfolio production over the last 24 hours. Use it to compare the latest operating pace.",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatGwh(summary?.daily_avg_production_gwh),
  },
  {
    title: "Active plants",
    helpText: "Number of plants that produced at least once during the last 24 hours.",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatCount(summary?.active_plants_24h),
  },
  {
    title: "Inactive plants",
    helpText: "Number of plants with no production during the last 24 hours. It helps spot outages or downtime.",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatCount(summary?.inactive_plants_24h),
  },
  {
    title: "Renewables",
    helpText: "Share of total portfolio production covered by renewable technologies in the last 24 hours.",
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
        <LoadingBattery label="Calculating the latest portfolio KPIs for the last 24 hours and the last week." />
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
              <HelpTooltip label={`Help ${metric.title}`} text={metric.helpText} />
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
