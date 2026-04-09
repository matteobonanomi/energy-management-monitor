import { useEffect, useRef, useState } from "react";

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
  headerKpis?: HeaderKpiItem[];
  onRoleChange: (role: UserRole) => void;
  onThemeChange: (theme: ThemeMode) => void;
  onGranularityChange: (granularity: Granularity) => void;
}

interface HeaderKpiItem {
  title: string;
  value: string;
  unit?: string;
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

function SettingsGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="3.25" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2.75v2.2M12 19.05v2.2M5.46 5.46l1.56 1.56M16.98 16.98l1.56 1.56M2.75 12h2.2M19.05 12h2.2M5.46 18.54l1.56-1.56M16.98 7.02l1.56-1.56"
      />
    </svg>
  );
}

/**
 * Keeps global dashboard context available from one compact sticky header so
 * settings stay reachable without dominating the monitoring canvas.
 */
export function AppHeader({
  role,
  theme,
  granularity,
  isPending,
  headerKpis = [],
  onRoleChange,
  onThemeChange,
  onGranularityChange,
}: AppHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        settingsRef.current &&
        event.target instanceof Node &&
        !settingsRef.current.contains(event.target)
      ) {
        setIsSettingsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSettingsOpen]);

  return (
    <header className="hero-shell hero-shell-sticky card">
      <div className="hero-copy">
        <p className="eyebrow">BETA VERSION 0.3</p>
        <h1>EnergyMonitor</h1>
        {isPending ? <p className="hero-status">Refreshing data…</p> : null}
      </div>

      <div className="hero-actions">
        {headerKpis.length > 0 ? (
          <div className="hero-kpi-strip" aria-label="Header KPI summary">
            {headerKpis.map((kpi) => (
              <article key={kpi.title} className="hero-kpi-pill">
                <span className="hero-kpi-title">{kpi.title}</span>
                <strong className="hero-kpi-value">
                  <span>{kpi.value}</span>
                  {kpi.unit ? <span className="hero-kpi-unit">{kpi.unit}</span> : null}
                </strong>
              </article>
            ))}
          </div>
        ) : null}

        <div className="hero-settings-anchor" ref={settingsRef}>
          <button
            type="button"
            className="hero-settings-button"
            aria-label="Dashboard settings"
            aria-haspopup="dialog"
            aria-expanded={isSettingsOpen}
            onClick={() => setIsSettingsOpen((current) => !current)}
          >
            <SettingsGlyph />
          </button>

          {isSettingsOpen ? (
            <div
              className="settings-popover card"
              role="dialog"
              aria-modal="false"
              aria-label="Dashboard settings"
            >
              <div className="settings-popover-header">
                <p className="eyebrow">Settings</p>
                <p className="settings-popover-copy">
                  Adjust profile, theme, and granularity from a single control surface.
                </p>
              </div>
              <div className="settings-popover-controls">
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
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
