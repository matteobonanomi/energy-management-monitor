import { useEffect, useReducer, useState } from "react";

import { energyApi } from "../api/client";
import { isoToLocalInputValue } from "../lib/dates";
import type {
  DashboardFiltersState,
  Granularity,
  SeriesBreakdown,
  TimeSeriesResponse,
} from "../types/api";

interface UseMonitorSeriesOptions {
  kind: "price" | "production";
  granularity: Granularity;
  range: { startIso: string; endIso: string } | null;
  breakdownBy?: SeriesBreakdown;
  filters?: Partial<DashboardFiltersState>;
}

function buildFilters(
  granularity: Granularity,
  range: { startIso: string; endIso: string } | null,
  filters?: Partial<DashboardFiltersState>,
): DashboardFiltersState {
  return {
    technology: filters?.technology ?? [],
    marketZone: filters?.marketZone ?? [],
    plantCode: filters?.plantCode ?? "",
    marketSession: filters?.marketSession ?? "MGP",
    dateFrom: range ? isoToLocalInputValue(range.startIso) : "",
    dateTo: range ? isoToLocalInputValue(range.endIso) : "",
    forecastRunId: filters?.forecastRunId ?? "",
  };
}

export function useMonitorSeries({
  kind,
  granularity,
  range,
  breakdownBy = "none",
  filters,
}: UseMonitorSeriesOptions) {
  const [data, setData] = useState<TimeSeriesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, refresh] = useReducer((value: number) => value + 1, 0);

  useEffect(() => {
    if (!range) {
      setLoading(true);
      return;
    }

    const controller = new AbortController();
    const requestFilters = buildFilters(granularity, range, filters);

    setLoading(true);
    setError(null);

    const request =
      kind === "price"
        ? energyApi.getPriceSeries(requestFilters, granularity, breakdownBy, controller.signal)
        : energyApi.getProductionSeries(
            requestFilters,
            granularity,
            breakdownBy,
            controller.signal,
          );

    request
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
            : "Unable to load the selected monitor.",
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
    breakdownBy,
    filters?.forecastRunId,
    filters?.marketSession,
    filters?.marketZone?.join("|"),
    filters?.plantCode,
    filters?.technology?.join("|"),
    granularity,
    kind,
    range?.endIso,
    range?.startIso,
    version,
  ]);

  return { data, error, loading, refresh };
}
