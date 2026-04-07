import { formatCompactNumber, formatEnergy, formatPrice } from "../lib/format";
import type { DashboardSummaryResponse, UserRole } from "../types/api";

interface KpiRibbonProps {
  summary: DashboardSummaryResponse | null;
  role: UserRole;
}

interface KpiCardProps {
  label: string;
  value: string;
  hint: string;
  accent: string;
}

function KpiCard({ label, value, hint, accent }: KpiCardProps) {
  return (
    <article className="card kpi-card">
      <span className="kpi-accent" style={{ background: accent }} />
      <p className="eyebrow">{label}</p>
      <p className="kpi-value">{value}</p>
      <p className="muted">{hint}</p>
    </article>
  );
}

/**
 * Packages a concise KPI strip for contexts that need a quick read before the
 * user drops into heavier charts or custom analyst tiles.
 */
export function KpiRibbon({ summary, role }: KpiRibbonProps) {
  const strategistHint =
    role === "portfolioManager"
      ? "Compact view for quick portfolio decisions."
      : "KPIs aligned with the current analytical drill-down.";

  return (
    <div className="kpi-grid">
      <KpiCard
        label="Total production"
        value={formatEnergy(summary?.total_energy_mwh)}
        hint={strategistHint}
        accent="linear-gradient(135deg, #16bdca, #0f766e)"
      />
      <KpiCard
        label="Average price"
        value={formatPrice(summary?.average_price_eur_mwh)}
        hint={`Market session ${summary?.market_session ?? "--"}`}
        accent="linear-gradient(135deg, #2563eb, #60a5fa)"
      />
      <KpiCard
        label="Capture Price"
        value={formatPrice(summary?.capture_price_eur_mwh)}
        hint="Calculated from the active filters and market prices."
        accent="linear-gradient(135deg, #f97316, #facc15)"
      />
      <KpiCard
        label="Active plants"
        value={formatCompactNumber(summary?.active_plants)}
        hint="Plant count aligned with the filtered portfolio."
        accent="linear-gradient(135deg, #7c3aed, #c084fc)"
      />
    </div>
  );
}
