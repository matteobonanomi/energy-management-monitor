import type {
  Granularity,
  ThemeMode,
  TimeWindow,
  UserRole,
} from "../types/api";

const shortDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const longDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Keeps energy labels consistent across KPI and narrative surfaces so the UI
 * does not drift into mixed precision or unit styles.
 */
export function formatEnergy(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "--";
  }
  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: value >= 1000 ? 0 : 1,
  })} MWh`;
}

/**
 * Applies one price format policy so market-facing values read like part of
 * the same trading-style product language.
 */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "--";
  }
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} EUR/MWh`;
}

/**
 * Prevents lightweight counters from inventing their own presentation rules
 * in every KPI tile.
 */
export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "--";
  }
  return value.toLocaleString("en-US");
}

/**
 * Produces compact chart labels so dense time-series views stay readable even
 * when the selected window expands.
 */
export function formatChartLabel(timestamp: string): string {
  return shortDateTimeFormatter.format(new Date(timestamp));
}

/**
 * Gives longer timestamps a single display style for status cards, run history,
 * and textual summaries.
 */
export function formatDateTime(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return "--";
  }
  return longDateTimeFormatter.format(new Date(timestamp));
}

/**
 * Centralizes persona naming so product copy does not diverge across screens.
 */
export function formatRoleLabel(role: UserRole): string {
  return role === "portfolioManager" ? "Portfolio Manager" : "Data Analyst";
}

/**
 * Keeps theme labels trivial at the call site and stable in UI copy.
 */
export function formatThemeLabel(theme: ThemeMode): string {
  return theme === "dark" ? "Dark" : "Light";
}

/**
 * Preserves one granularity vocabulary between controls and supporting text.
 */
export function formatGranularityLabel(granularity: Granularity): string {
  return granularity === "15m" ? "15m" : "1h";
}

/**
 * Avoids repeated window-copy branching in monitor controls and related docs.
 */
export function formatTimeWindowLabel(window: TimeWindow): string {
  if (window === "1w") {
    return "1 week";
  }
  if (window === "2w") {
    return "2 weeks";
  }
  if (window === "1m") {
    return "1 month";
  }
  return "max";
}
