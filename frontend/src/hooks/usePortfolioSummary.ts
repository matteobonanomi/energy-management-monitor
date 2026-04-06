import { useEffect, useReducer, useState } from "react";

import { energyApi } from "../api/client";
import type { DashboardFiltersState, DashboardSummaryResponse, Granularity } from "../types/api";

export function usePortfolioSummary(
  filters: DashboardFiltersState,
  granularity: Granularity,
) {
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, refresh] = useReducer((value: number) => value + 1, 0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    energyApi
      .getSummary(filters, granularity, controller.signal)
      .then((response) => {
        setData(response);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load portfolio KPIs.",
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
    version,
  ]);

  return { data, error, loading, refresh };
}
