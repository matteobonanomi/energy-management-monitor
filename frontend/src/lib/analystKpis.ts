import { energyApi } from "../api/client";
import { isoToLocalInputValue } from "./dates";
import type { DashboardFiltersState, Granularity } from "../types/api";

export interface AnalystKpiDefinition {
  id: string;
  title: string;
  helpText: string;
}

export interface AnalystKpiValue {
  value: string;
  unit?: string;
}

type WindowKey = "24h" | "7d";
type ZoneCode = "EST" | "NORD" | "SUD" | "OVEST";
type TechCode = "pv" | "wind" | "hydro" | "gas";

function buildFilters(
  startIso: string,
  endIso: string,
  overrides?: Partial<DashboardFiltersState>,
): DashboardFiltersState {
  return {
    technology: overrides?.technology ?? [],
    marketZone: overrides?.marketZone ?? [],
    plantCode: overrides?.plantCode ?? "",
    marketSession: overrides?.marketSession ?? "MGP",
    dateFrom: isoToLocalInputValue(startIso),
    dateTo: isoToLocalInputValue(endIso),
    forecastRunId: "",
  };
}

function buildWindowBounds(
  maxTimestamp: string,
  windowKey: WindowKey,
): { startIso: string; endIso: string; dayCount: number } {
  const end = new Date(maxTimestamp);
  const start = new Date(maxTimestamp);
  if (windowKey === "24h") {
    start.setHours(start.getHours() - 24);
    return { startIso: start.toISOString(), endIso: end.toISOString(), dayCount: 1 };
  }
  start.setDate(start.getDate() - 7);
  return { startIso: start.toISOString(), endIso: end.toISOString(), dayCount: 7 };
}

function sumSeries(response: { series: Array<{ points: Array<{ value: number }> }> }): number {
  return response.series.flatMap((series) => series.points).reduce((sum, point) => sum + point.value, 0);
}

function averageSeries(response: { series: Array<{ points: Array<{ value: number }> }> }): number | null {
  const values = response.series.flatMap((series) => series.points).map((point) => point.value);
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatNumber(value: number, digits = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

async function loadAverageProduction(
  maxTimestamp: string,
  granularity: Granularity,
  windowKey: WindowKey,
  zone?: ZoneCode,
): Promise<AnalystKpiValue> {
  const bounds = buildWindowBounds(maxTimestamp, windowKey);
  const response = await energyApi.getProductionSeries(
    buildFilters(bounds.startIso, bounds.endIso, {
      marketZone: zone ? [zone] : [],
    }),
    granularity,
    "none",
  );
  const totalMwh = sumSeries(response);
  return {
    value: formatNumber(totalMwh / 1000 / bounds.dayCount, 2),
    unit: "GWh/day",
  };
}

async function loadAveragePrice(
  maxTimestamp: string,
  granularity: Granularity,
  windowKey: WindowKey,
  zone?: ZoneCode,
): Promise<AnalystKpiValue> {
  const bounds = buildWindowBounds(maxTimestamp, windowKey);
  const response = await energyApi.getPriceSeries(
    buildFilters(bounds.startIso, bounds.endIso, {
      marketZone: zone ? [zone] : [],
    }),
    granularity,
    "none",
  );
  const average = averageSeries(response);
  return {
    value: average === null ? "--" : formatNumber(average, 2),
    unit: "€/MWh",
  };
}

async function loadTechnologyShare(
  maxTimestamp: string,
  granularity: Granularity,
  windowKey: WindowKey,
  technologies: TechCode[],
): Promise<AnalystKpiValue> {
  const bounds = buildWindowBounds(maxTimestamp, windowKey);
  const [totalResponse, partialResponse] = await Promise.all([
    energyApi.getProductionSeries(
      buildFilters(bounds.startIso, bounds.endIso),
      granularity,
      "none",
    ),
    energyApi.getProductionSeries(
      buildFilters(bounds.startIso, bounds.endIso, {
        technology: technologies,
      }),
      granularity,
      "none",
    ),
  ]);

  const total = sumSeries(totalResponse);
  const partial = sumSeries(partialResponse);
  const share = total > 0 ? (partial / total) * 100 : 0;
  return {
    value: formatNumber(share, 1),
    unit: "%",
  };
}

export const analystKpiCatalog: AnalystKpiDefinition[] = [
  {
    id: "avg_total_prod_24h",
    title: "Avg Total Prod 24h",
    helpText: "Average portfolio production over the last 24 hours, normalized to one day.",
  },
  {
    id: "avg_east_prod_24h",
    title: "Avg East Prod 24h",
    helpText: "Average production over the last 24 hours for all plants in the East zone.",
  },
  {
    id: "avg_north_prod_24h",
    title: "Avg North Prod 24h",
    helpText: "Average production over the last 24 hours for all plants in the North zone.",
  },
  {
    id: "avg_south_prod_24h",
    title: "Avg South Prod 24h",
    helpText: "Average production over the last 24 hours for all plants in the South zone.",
  },
  {
    id: "avg_west_prod_24h",
    title: "Avg West Prod 24h",
    helpText: "Average production over the last 24 hours for all plants in the West zone.",
  },
  {
    id: "avg_total_price_24h",
    title: "Avg Total Price 24h",
    helpText: "Average market price over the last 24 hours across the filtered portfolio footprint.",
  },
  {
    id: "avg_east_price_24h",
    title: "Avg East Price 24h",
    helpText: "Average market price over the last 24 hours in the East zone.",
  },
  {
    id: "avg_north_price_24h",
    title: "Avg North Price 24h",
    helpText: "Average market price over the last 24 hours in the North zone.",
  },
  {
    id: "avg_south_price_24h",
    title: "Avg South Price 24h",
    helpText: "Average market price over the last 24 hours in the South zone.",
  },
  {
    id: "avg_west_price_24h",
    title: "Avg West Price 24h",
    helpText: "Average market price over the last 24 hours in the West zone.",
  },
  {
    id: "hydro_share_24h",
    title: "Hydro Share 24h",
    helpText: "Share of hydro production over total production in the last 24 hours.",
  },
  {
    id: "wind_share_24h",
    title: "Wind Share 24h",
    helpText: "Share of wind production over total production in the last 24 hours.",
  },
  {
    id: "pv_share_24h",
    title: "PV Share 24h",
    helpText: "Share of PV production over total production in the last 24 hours.",
  },
  {
    id: "gas_share_24h",
    title: "Gas Share 24h",
    helpText: "Share of gas production over total production in the last 24 hours.",
  },
  {
    id: "hydro_share_7d",
    title: "Hydro Share 7d",
    helpText: "Share of hydro production over total production in the last 7 days.",
  },
  {
    id: "wind_share_7d",
    title: "Wind Share 7d",
    helpText: "Share of wind production over total production in the last 7 days.",
  },
  {
    id: "pv_share_7d",
    title: "PV Share 7d",
    helpText: "Share of PV production over total production in the last 7 days.",
  },
  {
    id: "gas_share_7d",
    title: "Gas Share 7d",
    helpText: "Share of gas production over total production in the last 7 days.",
  },
  {
    id: "renewables_share_24h",
    title: "Renewables 24h",
    helpText: "Combined share of PV, wind and hydro production over the last 24 hours.",
  },
  {
    id: "renewables_share_7d",
    title: "Renewables 7d",
    helpText: "Combined share of PV, wind and hydro production over the last 7 days.",
  },
];

const analystKpiLoaders: Record<
  string,
  (maxTimestamp: string, granularity: Granularity) => Promise<AnalystKpiValue>
> = {
  avg_total_prod_24h: (maxTimestamp, granularity) =>
    loadAverageProduction(maxTimestamp, granularity, "24h"),
  avg_east_prod_24h: (maxTimestamp, granularity) =>
    loadAverageProduction(maxTimestamp, granularity, "24h", "EST"),
  avg_north_prod_24h: (maxTimestamp, granularity) =>
    loadAverageProduction(maxTimestamp, granularity, "24h", "NORD"),
  avg_south_prod_24h: (maxTimestamp, granularity) =>
    loadAverageProduction(maxTimestamp, granularity, "24h", "SUD"),
  avg_west_prod_24h: (maxTimestamp, granularity) =>
    loadAverageProduction(maxTimestamp, granularity, "24h", "OVEST"),
  avg_total_price_24h: (maxTimestamp, granularity) =>
    loadAveragePrice(maxTimestamp, granularity, "24h"),
  avg_east_price_24h: (maxTimestamp, granularity) =>
    loadAveragePrice(maxTimestamp, granularity, "24h", "EST"),
  avg_north_price_24h: (maxTimestamp, granularity) =>
    loadAveragePrice(maxTimestamp, granularity, "24h", "NORD"),
  avg_south_price_24h: (maxTimestamp, granularity) =>
    loadAveragePrice(maxTimestamp, granularity, "24h", "SUD"),
  avg_west_price_24h: (maxTimestamp, granularity) =>
    loadAveragePrice(maxTimestamp, granularity, "24h", "OVEST"),
  hydro_share_24h: (maxTimestamp, granularity) =>
    loadTechnologyShare(maxTimestamp, granularity, "24h", ["hydro"]),
  wind_share_24h: (maxTimestamp, granularity) =>
    loadTechnologyShare(maxTimestamp, granularity, "24h", ["wind"]),
  pv_share_24h: (maxTimestamp, granularity) =>
    loadTechnologyShare(maxTimestamp, granularity, "24h", ["pv"]),
  gas_share_24h: (maxTimestamp, granularity) =>
    loadTechnologyShare(maxTimestamp, granularity, "24h", ["gas"]),
  hydro_share_7d: (maxTimestamp, granularity) =>
    loadTechnologyShare(maxTimestamp, granularity, "7d", ["hydro"]),
  wind_share_7d: (maxTimestamp, granularity) =>
    loadTechnologyShare(maxTimestamp, granularity, "7d", ["wind"]),
  pv_share_7d: (maxTimestamp, granularity) =>
    loadTechnologyShare(maxTimestamp, granularity, "7d", ["pv"]),
  gas_share_7d: (maxTimestamp, granularity) =>
    loadTechnologyShare(maxTimestamp, granularity, "7d", ["gas"]),
  renewables_share_24h: (maxTimestamp, granularity) =>
    loadTechnologyShare(maxTimestamp, granularity, "24h", ["pv", "wind", "hydro"]),
  renewables_share_7d: (maxTimestamp, granularity) =>
    loadTechnologyShare(maxTimestamp, granularity, "7d", ["pv", "wind", "hydro"]),
};

export async function loadAnalystKpiValue(
  kpiId: string,
  maxTimestamp: string,
  granularity: Granularity,
): Promise<AnalystKpiValue> {
  const loader = analystKpiLoaders[kpiId];
  if (!loader) {
    return { value: "--" };
  }
  return loader(maxTimestamp, granularity);
}
