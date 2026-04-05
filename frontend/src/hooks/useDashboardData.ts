import { useEffect, useReducer, useState } from "react";

import { energyApi } from "../api/client";
import type {
  ActualVsForecastResponse,
  DashboardFiltersState,
  DashboardSummaryResponse,
  Granularity,
  TimeSeriesResponse,
  UserRole,
} from "../types/api";

interface DashboardDataState {
  summary: DashboardSummaryResponse | null;
  production: TimeSeriesResponse | null;
  price: TimeSeriesResponse | null;
  comparison: ActualVsForecastResponse | null;
}

function resolveBreakdowns(
  role: UserRole,
  plantCode: string,
): { production: "technology" | "market_zone" | "plant_code"; price: "none" | "market_zone" } {
  if (role === "portfolioManager") {
    return {
      production: "technology",
      price: "none",
    };
  }

  return {
    production: plantCode ? "plant_code" : "market_zone",
    price: "market_zone",
  };
}

export function useDashboardData(
  filters: DashboardFiltersState,
  granularity: Granularity,
  role: UserRole,
) {
  const [data, setData] = useState<DashboardDataState>({
    summary: null,
    production: null,
    price: null,
    comparison: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, refresh] = useReducer((value: number) => value + 1, 0);

  useEffect(() => {
    const controller = new AbortController();
    const breakdowns = resolveBreakdowns(role, filters.plantCode);
    setLoading(true);
    setError(null);

    Promise.all([
      energyApi.getSummary(filters, granularity, controller.signal),
      energyApi.getProductionSeries(
        filters,
        granularity,
        breakdowns.production,
        controller.signal,
      ),
      energyApi.getPriceSeries(
        filters,
        granularity,
        breakdowns.price,
        controller.signal,
      ),
      energyApi.getActualVsForecast(filters, granularity, controller.signal),
    ])
      .then(([summary, production, price, comparison]) => {
        setData({ summary, production, price, comparison });
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossibile caricare la dashboard.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    filters.dateFrom,
    filters.dateTo,
    filters.forecastRunId,
    filters.marketSession,
    filters.marketZone.join("|"),
    filters.plantCode,
    filters.technology.join("|"),
    granularity,
    role,
    version,
  ]);

  return {
    ...data,
    error,
    loading,
    refresh,
  };
}
