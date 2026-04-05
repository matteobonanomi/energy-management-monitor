import type {
  ActualVsForecastResponse,
  ForecastExecutionRequest,
  ForecastExecutionResponse,
  DashboardFiltersState,
  DashboardSummaryResponse,
  FiltersResponse,
  ForecastPredictRequest,
  ForecastPredictResponse,
  ForecastRunDetailResponse,
  ForecastRunsResponse,
  Granularity,
  SeriesBreakdown,
  TimeSeriesResponse,
  UserActionEventsRequest,
  UserActionTrackingResponse,
} from "../types/api";
import { localInputToIso } from "../lib/dates";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const forecastBaseUrl =
  import.meta.env.VITE_FORECAST_API_BASE_URL ?? "http://localhost:8001";

type QueryValue = string | number | undefined | null | string[];

async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        "Backend API non raggiungibile. Verifica che docker compose abbia completato bootstrap, migrazioni e seed del database.",
      );
    }
    throw error;
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      body ||
        `Richiesta API fallita con stato ${response.status}. Controlla che il database demo sia inizializzato.`,
    );
  }
  return (await response.json()) as T;
}

function buildQuery(params: Record<string, QueryValue>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        searchParams.append(key, entry);
      }
      continue;
    }
    searchParams.append(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function buildDashboardQuery(
  filters: DashboardFiltersState,
  granularity: Granularity,
  breakdownBy?: SeriesBreakdown,
): string {
  return buildQuery({
    technology: filters.technology,
    plant_code: filters.plantCode ? [filters.plantCode] : [],
    market_zone: filters.marketZone,
    market_session: filters.marketSession,
    date_from: localInputToIso(filters.dateFrom),
    date_to: localInputToIso(filters.dateTo),
    granularity,
    breakdown_by: breakdownBy,
    forecast_run_id: filters.forecastRunId,
  });
}

export const energyApi = {
  getFilters(signal?: AbortSignal): Promise<FiltersResponse> {
    return fetchJson<FiltersResponse>(`${apiBaseUrl}/filters`, { signal });
  },
  getSummary(
    filters: DashboardFiltersState,
    granularity: Granularity,
    signal?: AbortSignal,
  ): Promise<DashboardSummaryResponse> {
    return fetchJson<DashboardSummaryResponse>(
      `${apiBaseUrl}/dashboard/summary${buildDashboardQuery(filters, granularity)}`,
      { signal },
    );
  },
  getProductionSeries(
    filters: DashboardFiltersState,
    granularity: Granularity,
    breakdownBy: SeriesBreakdown,
    signal?: AbortSignal,
  ): Promise<TimeSeriesResponse> {
    return fetchJson<TimeSeriesResponse>(
      `${apiBaseUrl}/dashboard/production-series${buildDashboardQuery(filters, granularity, breakdownBy)}`,
      { signal },
    );
  },
  getPriceSeries(
    filters: DashboardFiltersState,
    granularity: Granularity,
    breakdownBy: SeriesBreakdown,
    signal?: AbortSignal,
  ): Promise<TimeSeriesResponse> {
    return fetchJson<TimeSeriesResponse>(
      `${apiBaseUrl}/dashboard/price-series${buildDashboardQuery(filters, granularity, breakdownBy)}`,
      { signal },
    );
  },
  getActualVsForecast(
    filters: DashboardFiltersState,
    granularity: Granularity,
    signal?: AbortSignal,
  ): Promise<ActualVsForecastResponse> {
    return fetchJson<ActualVsForecastResponse>(
      `${apiBaseUrl}/dashboard/actual-vs-forecast${buildDashboardQuery(filters, granularity)}`,
      { signal },
    );
  },
  getForecastRuns(signal?: AbortSignal): Promise<ForecastRunsResponse> {
    return fetchJson<ForecastRunsResponse>(`${apiBaseUrl}/forecasts/runs`, {
      signal,
    });
  },
  getForecastRunDetail(
    runId: number,
    signal?: AbortSignal,
  ): Promise<ForecastRunDetailResponse> {
    return fetchJson<ForecastRunDetailResponse>(
      `${apiBaseUrl}/forecasts/runs/${runId}`,
      { signal },
    );
  },
  predictForecast(
    payload: ForecastPredictRequest,
  ): Promise<ForecastPredictResponse> {
    return fetchJson<ForecastPredictResponse>(
      `${forecastBaseUrl}/forecast/v1/predict`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
  },
  runForecast(
    payload: ForecastExecutionRequest,
    signal?: AbortSignal,
  ): Promise<ForecastExecutionResponse> {
    return fetchJson<ForecastExecutionResponse>(`${apiBaseUrl}/forecasts/runs`, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  trackUserActions(
    payload: UserActionEventsRequest,
    signal?: AbortSignal,
  ): Promise<UserActionTrackingResponse> {
    return fetchJson<UserActionTrackingResponse>(`${apiBaseUrl}/events/actions`, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
};
