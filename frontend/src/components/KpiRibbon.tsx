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

export function KpiRibbon({ summary, role }: KpiRibbonProps) {
  const strategistHint =
    role === "portfolioManager"
      ? "Vista sintetica per decisioni rapide di portafoglio."
      : "KPI coerenti con il drill-down analitico corrente.";

  return (
    <div className="kpi-grid">
      <KpiCard
        label="Produzione Totale"
        value={formatEnergy(summary?.total_energy_mwh)}
        hint={strategistHint}
        accent="linear-gradient(135deg, #16bdca, #0f766e)"
      />
      <KpiCard
        label="Prezzo Medio"
        value={formatPrice(summary?.average_price_eur_mwh)}
        hint={`Sessione di mercato ${summary?.market_session ?? "--"}`}
        accent="linear-gradient(135deg, #2563eb, #60a5fa)"
      />
      <KpiCard
        label="Capture Price"
        value={formatPrice(summary?.capture_price_eur_mwh)}
        hint="Calcolato sui filtri attivi e sui prezzi di mercato."
        accent="linear-gradient(135deg, #f97316, #facc15)"
      />
      <KpiCard
        label="Impianti Attivi"
        value={formatCompactNumber(summary?.active_plants)}
        hint="Cardinalita impianti coerente con il portfolio filtrato."
        accent="linear-gradient(135deg, #7c3aed, #c084fc)"
      />
    </div>
  );
}
