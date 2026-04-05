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
}

function buildFilters(
  granularity: Granularity,
  range: { startIso: string; endIso: string } | null,
): DashboardFiltersState {
  return {
    technology: [],
    marketZone: [],
    plantCode: "",
    marketSession: "MGP",
    dateFrom: range ? isoToLocalInputValue(range.startIso) : "",
    dateTo: range ? isoToLocalInputValue(range.endIso) : "",
    forecastRunId: "",
  };
}

export function useMonitorSeries({
  kind,
  granularity,
  range,
  breakdownBy = "none",
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
    const filters = buildFilters(granularity, range);

    setLoading(true);
    setError(null);

    const request =
      kind === "price"
        ? energyApi.getPriceSeries(filters, granularity, breakdownBy, controller.signal)
        : energyApi.getProductionSeries(
            filters,
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
            : "Impossibile caricare il monitor selezionato.",
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
  }, [breakdownBy, granularity, kind, range?.endIso, range?.startIso, version]);

  return { data, error, loading, refresh };
}
