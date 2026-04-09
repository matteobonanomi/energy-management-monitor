import { formatCompactNumber } from "./format";
import type { DashboardSummaryResponse } from "../types/api";

export interface PortfolioKpiValueParts {
  value: string;
  unit?: string;
}

export interface PortfolioKpiDisplayItem extends PortfolioKpiValueParts {
  title: string;
  helpText: string;
}

interface PortfolioKpiMetricDefinition {
  title: string;
  helpText: string;
  accessor: (summary: DashboardSummaryResponse | null) => PortfolioKpiValueParts;
}

function formatGwh(value: number | null | undefined): PortfolioKpiValueParts {
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

function formatPercent(value: number | null | undefined): PortfolioKpiValueParts {
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

function formatCount(value: number | null | undefined): PortfolioKpiValueParts {
  return { value: formatCompactNumber(value) };
}

function formatPriceParts(
  value: number | null | undefined,
): PortfolioKpiValueParts {
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

/**
 * Centralizes portfolio KPI copy and formatting so header summaries and KPI
 * grids stay aligned when the fixed monitoring persona evolves.
 */
export const portfolioKpiMetrics: PortfolioKpiMetricDefinition[] = [
  {
    title: "Avg daily Price",
    helpText:
      "Average market price over the last 24 hours. It gives a quick read of the most recent price level.",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatPriceParts(summary?.daily_avg_price_eur_mwh),
  },
  {
    title: "Avg weekly Price",
    helpText:
      "Average market price over the last week. It smooths daily noise and highlights the short-term context.",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatPriceParts(summary?.weekly_avg_price_eur_mwh),
  },
  {
    title: "Avg Prod 24h",
    helpText:
      "Average aggregated portfolio production over the last 24 hours. Use it to compare the latest operating pace.",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatGwh(summary?.daily_avg_production_gwh),
  },
  {
    title: "Active plants",
    helpText:
      "Number of plants that produced at least once during the last 24 hours.",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatCount(summary?.active_plants_24h),
  },
  {
    title: "Inactive plants",
    helpText:
      "Number of plants with no production during the last 24 hours. It helps spot outages or downtime.",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatCount(summary?.inactive_plants_24h),
  },
  {
    title: "Renewables",
    helpText:
      "Share of total portfolio production covered by renewable technologies in the last 24 hours.",
    accessor: (summary: DashboardSummaryResponse | null) =>
      formatPercent(summary?.renewables_share_pct_24h),
  },
];

export function buildPortfolioKpiItems(
  summary: DashboardSummaryResponse | null,
): PortfolioKpiDisplayItem[] {
  return portfolioKpiMetrics.map((metric) => ({
    title: metric.title,
    helpText: metric.helpText,
    ...metric.accessor(summary),
  }));
}

export function buildPortfolioHeaderKpis(
  summary: DashboardSummaryResponse | null,
  count = 3,
): PortfolioKpiDisplayItem[] {
  return buildPortfolioKpiItems(summary).slice(0, count);
}
