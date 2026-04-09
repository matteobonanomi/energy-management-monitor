import { HelpTooltip } from "./HelpTooltip";
import { LoadingBattery } from "./LoadingBattery";
import { buildPortfolioKpiItems } from "../lib/portfolioKpis";
import type { DashboardSummaryResponse } from "../types/api";

interface PortfolioKpiGridProps {
  summary: DashboardSummaryResponse | null;
  loading: boolean;
  error: string | null;
}

/**
 * Keeps the portfolio persona focused on a fixed KPI set so the top-level
 * operating readout remains stable across demos and role switches.
 */
export function PortfolioKpiGrid({
  summary,
  loading,
  error,
}: PortfolioKpiGridProps) {
  const metrics = buildPortfolioKpiItems(summary);

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
      {metrics.map((metric) => (
        <article key={metric.title} className="kpi-tile">
          <div className="kpi-heading">
            <span className="kpi-title">{metric.title}</span>
            <HelpTooltip label={`Help ${metric.title}`} text={metric.helpText} />
          </div>
          <strong className="kpi-value">
            <span>{metric.value}</span>
            {metric.unit ? <span className="kpi-unit">{metric.unit}</span> : null}
          </strong>
        </article>
      ))}
    </div>
  );
}
