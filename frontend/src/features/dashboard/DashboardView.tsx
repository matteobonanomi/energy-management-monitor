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
          title="Dashboard in caricamento"
          message="Sto raccogliendo KPI, serie di produzione, prezzi e confronto actual vs forecast."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-grid">
        <ErrorPanel
          title="Dashboard non disponibile"
          message={error}
          actionLabel="Riprova"
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
              ? "Produzione aggregata per tecnologia"
              : "Produzione filtrata per area di analisi"
          }
          subtitle={
            role === "portfolioManager"
              ? "Lettura compatta della curva di produzione del portfolio."
              : "Breakdown orientato al drill-down, coerente con i filtri attivi."
          }
        />
      ) : (
        <EmptyPanel
          title="Produzione non disponibile"
          message="Nessuna serie di produzione disponibile per i filtri correnti."
        />
      )}

      {priceData.length > 0 ? (
        <PriceChart
          data={priceData}
          seriesKeys={priceSeriesKeys}
          title="Prezzi di mercato"
          subtitle="Serie prezzi coerente con sessione selezionata e perimetro di portfolio."
        />
      ) : (
        <EmptyPanel
          title="Prezzi non disponibili"
          message="Nessun dato prezzo disponibile per i filtri correnti."
        />
      )}

      {comparisonData.length > 0 ? (
        <ActualForecastChart
          data={comparisonData}
          title="Actual vs forecast"
          subtitle={
            comparison?.selected_run
              ? `Run backend #${comparison.selected_run.id} · ${comparison.selected_run.model_name}`
              : "Serie actual disponibile. Nessun forecast persistito trovato nel backend."
          }
        />
      ) : (
        <EmptyPanel
          title="Confronto actual vs forecast"
          message="Non ci sono punti comparabili da mostrare. Usa Forecast Lab per generare una simulazione forecast on-demand."
        />
      )}

      <SectionCard
        eyebrow="Narrativa"
        title={
          role === "portfolioManager"
            ? "Executive readout del portafoglio"
            : "Analyst notes sui filtri correnti"
        }
        subtitle="Una vista testuale utile anche durante la demo live."
      >
        <div className="insight-grid">
          <div className="insight-card">
            <span className="insight-label">Energia osservata</span>
            <strong>{summary ? summary.total_energy_mwh.toFixed(1) : "--"} MWh</strong>
          </div>
          <div className="insight-card">
            <span className="insight-label">Capture price</span>
            <strong>{summary?.capture_price_eur_mwh?.toFixed(1) ?? "--"} EUR/MWh</strong>
          </div>
          <div className="insight-card">
            <span className="insight-label">Run forecast backend</span>
            <strong>{comparison?.selected_run ? comparison.selected_run.status : "assente"}</strong>
          </div>
          <div className="insight-card">
            <span className="insight-label">Ultimo completamento</span>
            <strong>{formatDateTime(comparison?.selected_run?.completed_at ?? null)}</strong>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
