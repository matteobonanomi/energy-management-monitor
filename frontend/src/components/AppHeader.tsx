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
        <HelpTooltip label={`Help ${label}`} text={helpText} />
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
        <p className="eyebrow">BETA VERSION 0.3</p>
        <h1>EnergyMonitor</h1>
        <p className="lead">
          <strong>What&apos;s new:</strong> test the new price and volume forecasting models.
        </p>
        {isPending ? <p className="hero-status">Refreshing data…</p> : null}
      </div>

      <div className="hero-controls">
        <SegmentedControl
          label="Profile"
          helpText="Switch the dashboard perspective. Portfolio Manager stays focused on operational monitoring, while Data Analyst unlocks deeper exploratory tools."
          isWide
          options={roleOptions}
          selectedValue={role}
          onChange={onRoleChange}
        />
        <SegmentedControl
          label="Theme"
          helpText="Change the app contrast and color mood. Light mode keeps a clean white surface with blue accents."
          options={themeOptions}
          selectedValue={theme}
          onChange={onThemeChange}
        />
        <SegmentedControl
          label="Granularity"
          helpText="Choose how detailed the time series should be. Use 15m for more resolution and 1h for a smoother overview."
          options={granularityOptions}
          selectedValue={granularity}
          onChange={onGranularityChange}
        />
      </div>
    </header>
  );
}
