import { buildComparisonChartData, mergeNamedSeries } from "../../lib/charts";
import { formatDateTime } from "../../lib/format";
import type {
  ActualVsForecastResponse,
  DashboardSummaryResponse,
  TimeSeriesResponse,
  UserRole,
} from "../../types/api";
import { ActualForecastChart, PriceChart, ProductionChart } from "../../components/Charts";
import { ErrorPanel, EmptyPanel, LoadingPanel, SectionCard } from "../../components/Panel";

interface DashboardViewProps {
  role: UserRole;
  loading: boolean;
  error: string | null;
  summary: DashboardSummaryResponse | null;
  production: TimeSeriesResponse | null;
  price: TimeSeriesResponse | null;
  comparison: ActualVsForecastResponse | null;
  onRetry: () => void;
}

export function DashboardView({
  role,
  loading,
  error,
  summary,
  production,
  price,
  comparison,
  onRetry,
}: DashboardViewProps) {
  if (loading) {
    return (
      <div className="dashboard-grid">
        <LoadingPanel
          title="Loading dashboard"
          message="Collecting KPIs, production series, price series, and actual-vs-forecast comparison."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-grid">
        <ErrorPanel
          title="Dashboard unavailable"
          message={error}
          actionLabel="Retry"
          onAction={onRetry}
        />
      </div>
    );
  }

  const productionData = production ? mergeNamedSeries(production.series) : [];
  const priceData = price ? mergeNamedSeries(price.series) : [];
  const comparisonData = comparison
    ? buildComparisonChartData(comparison.comparison_points)
    : [];

  const productionSeriesKeys = production?.series.map((series) => series.key) ?? [];
  const priceSeriesKeys = price?.series.map((series) => series.key) ?? [];

  return (
    <div className="dashboard-grid">
      {productionData.length > 0 ? (
        <ProductionChart
          data={productionData}
          seriesKeys={productionSeriesKeys}
          title={
            role === "portfolioManager"
              ? "Production by technology"
              : "Production filtered by analysis area"
          }
          subtitle={
            role === "portfolioManager"
              ? "Compact view of the portfolio production curve."
              : "Drill-down oriented breakdown aligned with the active filters."
          }
        />
      ) : (
        <EmptyPanel
          title="Production unavailable"
          message="No production series is available for the current filters."
        />
      )}

      {priceData.length > 0 ? (
        <PriceChart
          data={priceData}
          seriesKeys={priceSeriesKeys}
          title="Market prices"
          subtitle="Price series aligned with the selected market session and portfolio scope."
        />
      ) : (
        <EmptyPanel
          title="Prices unavailable"
          message="No price data is available for the current filters."
        />
      )}

      {comparisonData.length > 0 ? (
        <ActualForecastChart
          data={comparisonData}
          title="Actual vs forecast"
          subtitle={
            comparison?.selected_run
              ? `Run backend #${comparison.selected_run.id} · ${comparison.selected_run.model_name}`
              : "Actual series available. No persisted forecast was found in the backend."
          }
        />
      ) : (
        <EmptyPanel
          title="Actual vs forecast comparison"
          message="There are no comparable points to display. Generate an on-demand forecast to populate this panel."
        />
      )}

      <SectionCard
        eyebrow="Narrative"
        title={
          role === "portfolioManager"
            ? "Executive portfolio readout"
            : "Analyst notes on current filters"
        }
        subtitle="A compact textual summary that also works well in live demos."
      >
        <div className="insight-grid">
          <div className="insight-card">
            <span className="insight-label">Observed energy</span>
            <strong>{summary ? summary.total_energy_mwh.toFixed(1) : "--"} MWh</strong>
          </div>
          <div className="insight-card">
            <span className="insight-label">Capture price</span>
            <strong>{summary?.capture_price_eur_mwh?.toFixed(1) ?? "--"} EUR/MWh</strong>
          </div>
          <div className="insight-card">
            <span className="insight-label">Backend forecast run</span>
            <strong>{comparison?.selected_run ? comparison.selected_run.status : "missing"}</strong>
          </div>
          <div className="insight-card">
            <span className="insight-label">Last completion</span>
            <strong>{formatDateTime(comparison?.selected_run?.completed_at ?? null)}</strong>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
