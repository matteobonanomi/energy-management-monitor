import type {
  Granularity,
  ThemeMode,
  TimeWindow,
  UserRole,
} from "../types/api";

const shortDateTimeFormatter = new Intl.DateTimeFormat("it-IT", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const longDateTimeFormatter = new Intl.DateTimeFormat("it-IT", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatEnergy(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "--";
  }
  return `${value.toLocaleString("it-IT", {
    maximumFractionDigits: value >= 1000 ? 0 : 1,
  })} MWh`;
}

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "--";
  }
  return `${value.toLocaleString("it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} EUR/MWh`;
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "--";
  }
  return value.toLocaleString("it-IT");
}

export function formatChartLabel(timestamp: string): string {
  return shortDateTimeFormatter.format(new Date(timestamp));
}

export function formatDateTime(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return "--";
  }
  return longDateTimeFormatter.format(new Date(timestamp));
}

export function formatRoleLabel(role: UserRole): string {
  return role === "portfolioManager" ? "Portfolio Manager" : "Data Analyst";
}

export function formatThemeLabel(theme: ThemeMode): string {
  return theme === "dark" ? "Dark" : "Light";
}

export function formatGranularityLabel(granularity: Granularity): string {
  return granularity === "15m" ? "15m" : "1h";
}

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
