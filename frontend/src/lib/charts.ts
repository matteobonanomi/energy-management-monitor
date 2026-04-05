import type {
  ComparisonPoint,
  ForecastPoint,
  NamedSeries,
  TimeSeriesPoint,
} from "../types/api";
import { formatChartLabel } from "./format";

export type ChartDatum = {
  timestamp: string;
  label: string;
  [key: string]: number | string | null;
};

export function mergeNamedSeries(series: NamedSeries[]): ChartDatum[] {
  const rows = new Map<string, ChartDatum>();

  for (const namedSeries of series) {
    for (const point of namedSeries.points) {
      const existing = rows.get(point.timestamp) ?? {
        timestamp: point.timestamp,
        label: formatChartLabel(point.timestamp),
      };
      existing[namedSeries.key] = point.value;
      rows.set(point.timestamp, existing);
    }
  }

  return [...rows.values()].sort(sortByTimestamp);
}

export function buildComparisonChartData(
  comparisonPoints: ComparisonPoint[],
): ChartDatum[] {
  return comparisonPoints
    .map((point) => ({
      timestamp: point.timestamp,
      label: formatChartLabel(point.timestamp),
      actual: point.actual_mwh,
      forecast: point.forecast_mwh,
    }))
    .sort(sortByTimestamp);
}

export function buildSingleSeriesChartData(
  points: TimeSeriesPoint[],
  key: string,
): ChartDatum[] {
  return points
    .map((point) => ({
      timestamp: point.timestamp,
      label: formatChartLabel(point.timestamp),
      [key]: point.value,
    }))
    .sort(sortByTimestamp);
}

export function buildTriggeredForecastChartData(
  actualPoints: TimeSeriesPoint[],
  forecastPoints: ForecastPoint[],
): ChartDatum[] {
  const rows = new Map<string, ChartDatum>();

  for (const point of actualPoints) {
    rows.set(point.timestamp, {
      timestamp: point.timestamp,
      label: formatChartLabel(point.timestamp),
      actual: point.value,
      forecast: null,
    });
  }

  for (const point of forecastPoints) {
    const existing = rows.get(point.timestamp) ?? {
      timestamp: point.timestamp,
      label: formatChartLabel(point.timestamp),
      actual: null,
      forecast: null,
    };
    existing.forecast = point.value;
    rows.set(point.timestamp, existing);
  }

  return [...rows.values()].sort(sortByTimestamp);
}

export function buildMonitorForecastChartData(
  actualPoints: TimeSeriesPoint[],
  forecastPoints: ForecastPoint[],
): ChartDatum[] {
  const rows = new Map<string, ChartDatum>();

  for (const point of actualPoints) {
    rows.set(point.timestamp, {
      timestamp: point.timestamp,
      label: formatChartLabel(point.timestamp),
      actual: point.value,
      forecast: null,
    });
  }

  for (const point of forecastPoints) {
    const existing = rows.get(point.timestamp) ?? {
      timestamp: point.timestamp,
      label: formatChartLabel(point.timestamp),
      actual: null,
      forecast: null,
    };
    existing.forecast = point.value;
    rows.set(point.timestamp, existing);
  }

  return [...rows.values()].sort(sortByTimestamp);
}

function sortByTimestamp(left: ChartDatum, right: ChartDatum): number {
  return new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime();
}
