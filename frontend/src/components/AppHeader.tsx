import type { Granularity, ThemeMode, UserRole } from "../types/api";

type Option<T extends string> = {
  label: string;
  value: T;
};

interface SegmentedControlProps<T extends string> {
  label: string;
  options: Option<T>[];
  selectedValue: T;
  onChange: (value: T) => void;
}

function SegmentedControl<T extends string>({
  label,
  options,
  selectedValue,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="segment-card">
      <span className="segment-label">{label}</span>
      <div className="segment-control" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={
              option.value === selectedValue
                ? "segment-button is-active"
                : "segment-button"
            }
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface AppHeaderProps {
  role: UserRole;
  theme: ThemeMode;
  granularity: Granularity;
  isPending: boolean;
  onRoleChange: (role: UserRole) => void;
  onThemeChange: (theme: ThemeMode) => void;
  onGranularityChange: (granularity: Granularity) => void;
}

const roleOptions: Option<UserRole>[] = [
  { label: "Portfolio Manager", value: "portfolioManager" },
  { label: "Data Analyst", value: "dataAnalyst" },
];

const themeOptions: Option<ThemeMode>[] = [
  { label: "Dark", value: "dark" },
  { label: "Light", value: "light" },
];

const granularityOptions: Option<Granularity>[] = [
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
];

export function AppHeader({
  role,
  theme,
  granularity,
  isPending,
  onRoleChange,
  onThemeChange,
  onGranularityChange,
}: AppHeaderProps) {
  return (
    <header className="hero-shell card">
      <div className="hero-copy">
        <p className="eyebrow">BETA VERSION 0.1</p>
        <h1>EnergyMonitor</h1>
        <p className="lead">
          Monitor operativo dei prezzi e della produzione portfolio con temi
          Material Design, granularita reale e layout essenziale 2x2.
        </p>
        <div className="hero-meta">
          <span className="meta-pill">Portfolio Manager default</span>
          <span className="meta-pill">Analyst view allineata al beta</span>
          <span className="meta-pill">Serie 15m / 1h attive</span>
          {isPending ? <span className="meta-pill meta-pill-pending">Aggiornamento dati…</span> : null}
        </div>
      </div>

      <div className="hero-controls">
        <SegmentedControl
          label="Persona"
          options={roleOptions}
          selectedValue={role}
          onChange={onRoleChange}
        />
        <SegmentedControl
          label="Theme"
          options={themeOptions}
          selectedValue={theme}
          onChange={onThemeChange}
        />
        <SegmentedControl
          label="Granularity"
          options={granularityOptions}
          selectedValue={granularity}
          onChange={onGranularityChange}
        />
      </div>
    </header>
  );
}
