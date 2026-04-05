import { HelpTooltip } from "./HelpTooltip";
import type { Granularity, ThemeMode, UserRole } from "../types/api";

type Option<T extends string> = {
  label: string;
  value: T;
};

interface SegmentedControlProps<T extends string> {
  label: string;
  helpText: string;
  options: Option<T>[];
  selectedValue: T;
  onChange: (value: T) => void;
  isWide?: boolean;
}

function SegmentedControl<T extends string>({
  label,
  helpText,
  options,
  selectedValue,
  onChange,
  isWide = false,
}: SegmentedControlProps<T>) {
  return (
    <div className={isWide ? "segment-card segment-card-wide" : "segment-card"}>
      <div className="segment-heading">
        <span className="segment-label">{label}</span>
        <HelpTooltip label={`Aiuto ${label}`} text={helpText} />
      </div>
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
          <strong>What&apos;s new:</strong> testa i nuovi modelli previsionali di
          prezzo e volumi.
        </p>
        {isPending ? <p className="hero-status">Aggiornamento dati in corso…</p> : null}
      </div>

      <div className="hero-controls">
        <SegmentedControl
          label="Profilo"
          helpText="Scegli il punto di vista della dashboard. Per ora Data Analyst usa la stessa vista del Portfolio Manager."
          isWide
          options={roleOptions}
          selectedValue={role}
          onChange={onRoleChange}
        />
        <SegmentedControl
          label="Theme"
          helpText="Cambia il contrasto visivo dell'app. Il tema Light usa una palette chiara con accenti blu."
          options={themeOptions}
          selectedValue={theme}
          onChange={onThemeChange}
        />
        <SegmentedControl
          label="Granularity"
          helpText="Decide il livello di dettaglio delle serie. 15m mostra più dettaglio, 1h una vista più sintetica."
          options={granularityOptions}
          selectedValue={granularity}
          onChange={onGranularityChange}
        />
      </div>
    </header>
  );
}
