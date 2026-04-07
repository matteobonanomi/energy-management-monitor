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

/**
 * Flattens backend series into chart rows so presentational components can
 * focus on visual grammar instead of timestamp reconciliation.
 */
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

/**
 * Aligns actual-vs-forecast comparison points into one chart contract tailored
 * to the dedicated comparison panel.
 */
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

/**
 * Creates a predictable chart shape for simple single-signal views and tests.
 */
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

/**
 * Merges historical and forecast points so triggered runs can be overlaid
 * without teaching chart components about backend response nuances.
 */
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

/**
 * Keeps monitor overlays explicit by giving actual and forecast separate keys
 * on the same timestamp axis.
 */
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

/**
 * Preserves stacked production breakdowns while reserving a dedicated channel
 * for total forecast output on top of the composition view.
 */
export function buildStackedMonitorChartData(
  actualSeries: NamedSeries[],
  forecastPoints: ForecastPoint[],
): ChartDatum[] {
  const rows = new Map<string, ChartDatum>();

  for (const series of actualSeries) {
    for (const point of series.points) {
      const existing = rows.get(point.timestamp) ?? {
        timestamp: point.timestamp,
        label: formatChartLabel(point.timestamp),
        forecast: null,
      };
      existing[series.key] = point.value;
      rows.set(point.timestamp, existing);
    }
  }

  for (const point of forecastPoints) {
    const existing = rows.get(point.timestamp) ?? {
      timestamp: point.timestamp,
      label: formatChartLabel(point.timestamp),
      forecast: null,
    };
    existing.forecast = point.value;
    rows.set(point.timestamp, existing);
  }

  return [...rows.values()].sort(sortByTimestamp);
}

/**
 * Builds the combined analyst dataset so production composition and market
 * price can be inspected together without extra chart-specific glue code.
 */
export function buildDualAxisChartData(
  productionSeries: NamedSeries[],
  priceActualPoints: TimeSeriesPoint[],
  productionForecastPoints: ForecastPoint[],
  priceForecastPoints: ForecastPoint[],
): ChartDatum[] {
  const rows = new Map<string, ChartDatum>();

  for (const series of productionSeries) {
    for (const point of series.points) {
      const existing = rows.get(point.timestamp) ?? {
        timestamp: point.timestamp,
        label: formatChartLabel(point.timestamp),
        productionForecast: null,
        priceActual: null,
        priceForecast: null,
      };
      existing[series.key] = point.value;
      rows.set(point.timestamp, existing);
    }
  }

  for (const point of priceActualPoints) {
    const existing = rows.get(point.timestamp) ?? {
      timestamp: point.timestamp,
      label: formatChartLabel(point.timestamp),
      productionForecast: null,
      priceActual: null,
      priceForecast: null,
    };
    existing.priceActual = point.value;
    rows.set(point.timestamp, existing);
  }

  for (const point of productionForecastPoints) {
    const existing = rows.get(point.timestamp) ?? {
      timestamp: point.timestamp,
      label: formatChartLabel(point.timestamp),
      productionForecast: null,
      priceActual: null,
      priceForecast: null,
    };
    existing.productionForecast = point.value;
    rows.set(point.timestamp, existing);
  }

  for (const point of priceForecastPoints) {
    const existing = rows.get(point.timestamp) ?? {
      timestamp: point.timestamp,
      label: formatChartLabel(point.timestamp),
      productionForecast: null,
      priceActual: null,
      priceForecast: null,
    };
    existing.priceForecast = point.value;
    rows.set(point.timestamp, existing);
  }

  return [...rows.values()].sort(sortByTimestamp);
}

function sortByTimestamp(left: ChartDatum, right: ChartDatum): number {
  return new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime();
}
