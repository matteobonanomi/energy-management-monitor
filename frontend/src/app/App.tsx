import { useMemo, useState, useTransition } from "react";

import { AppHeader } from "../components/AppHeader";
import { MonitorLineChart } from "../components/Charts";
import { ForecastEnginePanel } from "../components/ForecastEnginePanel";
import { MonitorPanel } from "../components/MonitorPanel";
import { PortfolioKpiGrid } from "../components/PortfolioKpiGrid";
import { SectionCard } from "../components/Panel";
import { useForecastExecution } from "../hooks/useForecastExecution";
import { useFiltersData } from "../hooks/useFiltersData";
import { useMonitorSeries } from "../hooks/useMonitorSeries";
import { usePortfolioSummary } from "../hooks/usePortfolioSummary";
import { buildMonitorForecastChartData } from "../lib/charts";
import { buildRangeIsoBounds } from "../lib/dates";
import { trackUserAction } from "../lib/userActionTracking";
import type {
  DashboardFiltersState,
  ThemeMode,
  TimeWindow,
  UserRole,
} from "../types/api";

export function App() {
  const [role, setRole] = useState<UserRole>("portfolioManager");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [granularity, setGranularity] = useState<"15m" | "1h">("1h");
  const [priceWindow, setPriceWindow] = useState<TimeWindow>("1w");
  const [energyWindow, setEnergyWindow] = useState<TimeWindow>("1w");
  const [isPending, startNavigation] = useTransition();

  const filtersResource = useFiltersData();
  const portfolioFilters = useMemo<DashboardFiltersState>(
    () => ({
      technology: [],
      marketZone: [],
      plantCode: "",
      marketSession: "MGP",
      dateFrom: "",
      dateTo: "",
      forecastRunId: "",
    }),
    [],
  );
  const summaryResource = usePortfolioSummary(portfolioFilters, granularity);
  const forecastExecution = useForecastExecution(granularity);

  const timeBounds = useMemo(() => {
    if (!filtersResource.data) {
      return null;
    }

    return {
      minTimestamp: filtersResource.data.date_range.min_timestamp,
      maxTimestamp: filtersResource.data.date_range.max_timestamp,
    };
  }, [filtersResource.data]);

  const priceRange = useMemo(
    () =>
      buildRangeIsoBounds(
        priceWindow,
        timeBounds?.minTimestamp ?? null,
        timeBounds?.maxTimestamp ?? null,
      ),
    [priceWindow, timeBounds],
  );
  const energyRange = useMemo(
    () =>
      buildRangeIsoBounds(
        energyWindow,
        timeBounds?.minTimestamp ?? null,
        timeBounds?.maxTimestamp ?? null,
      ),
    [energyWindow, timeBounds],
  );

  const priceMonitor = useMonitorSeries({
    kind: "price",
    granularity,
    range: priceRange,
  });
  const energyMonitor = useMonitorSeries({
    kind: "production",
    granularity,
    range: energyRange,
  });

  const priceActualPoints = priceMonitor.data?.series[0]?.points ?? [];
  const energyActualPoints = energyMonitor.data?.series[0]?.points ?? [];
  const priceForecastPoints = forecastExecution.runsBySignal.price?.values ?? [];
  const energyForecastPoints = forecastExecution.runsBySignal.production?.values ?? [];
  const priceChartData = buildMonitorForecastChartData(priceActualPoints, priceForecastPoints);
  const energyChartData = buildMonitorForecastChartData(energyActualPoints, energyForecastPoints);

  const apiBootstrapError = filtersResource.error;

  function renderMonitorState(message: string, tone: "loading" | "error") {
    return (
      <div
        className={
          tone === "error"
            ? "monitor-inline-state monitor-inline-state-error"
            : "monitor-inline-state"
        }
      >
        <p>{message}</p>
      </div>
    );
  }

  return (
    <main className="page-shell" data-theme={theme}>
      <div className="backdrop-grid" />

      <AppHeader
        role={role}
        theme={theme}
        granularity={granularity}
        isPending={isPending}
        onRoleChange={(nextRole) => {
          setRole(nextRole);
          void trackUserAction({
            eventName: "persona_changed",
            surface: "header",
            role: nextRole,
            theme,
            granularity,
            payload: {
              previous_role: role,
              next_role: nextRole,
            },
          });
        }}
        onThemeChange={(nextTheme) => {
          setTheme(nextTheme);
          void trackUserAction({
            eventName: "theme_changed",
            surface: "header",
            role,
            theme: nextTheme,
            granularity,
            payload: {
              previous_theme: theme,
              next_theme: nextTheme,
            },
          });
        }}
        onGranularityChange={(nextGranularity) => {
          startNavigation(() => {
            setGranularity(nextGranularity);
          });
          void trackUserAction({
            eventName: "granularity_changed",
            surface: "header",
            role,
            theme,
            granularity: nextGranularity,
            payload: {
              previous_granularity: granularity,
              next_granularity: nextGranularity,
            },
          });
        }}
      />

      <div className="monitor-grid">
        <MonitorPanel
          title="Price monitor"
          subtitle="Andamento dei prezzi MGP sull'ultima finestra temporale selezionata."
          window={priceWindow}
          onWindowChange={(nextWindow) => {
            setPriceWindow(nextWindow);
            void trackUserAction({
              eventName: "time_window_changed",
              surface: "price_monitor",
              role,
              theme,
              granularity,
              context: { monitor: "price" },
              payload: {
                previous_window: priceWindow,
                next_window: nextWindow,
              },
            });
          }}
        >
          {filtersResource.loading ? (
            renderMonitorState(
              "Sto attendendo bootstrap e lettura della serie prezzi dal backend.",
              "loading",
            )
          ) : apiBootstrapError ? (
            renderMonitorState(apiBootstrapError, "error")
          ) : priceMonitor.loading ? (
            renderMonitorState(
              "Sto caricando la serie prezzi per la finestra selezionata.",
              "loading",
            )
          ) : priceMonitor.error ? (
            renderMonitorState(priceMonitor.error, "error")
          ) : (
            <MonitorLineChart
              data={priceChartData}
              seriesKeys={priceForecastPoints.length > 0 ? ["actual", "forecast"] : ["actual"]}
              forecastSeriesKeys={["forecast"]}
              labelMap={{ actual: "Actual", forecast: "Forecast" }}
            />
          )}
        </MonitorPanel>

        <MonitorPanel
          title="Energy monitor"
          subtitle="Energia prodotta complessivamente dal portfolio nella finestra temporale selezionata."
          window={energyWindow}
          onWindowChange={(nextWindow) => {
            setEnergyWindow(nextWindow);
            void trackUserAction({
              eventName: "time_window_changed",
              surface: "energy_monitor",
              role,
              theme,
              granularity,
              context: { monitor: "production" },
              payload: {
                previous_window: energyWindow,
                next_window: nextWindow,
              },
            });
          }}
        >
          {filtersResource.loading ? (
            renderMonitorState(
              "Sto attendendo bootstrap e lettura della serie energetica dal backend.",
              "loading",
            )
          ) : apiBootstrapError ? (
            renderMonitorState(apiBootstrapError, "error")
          ) : energyMonitor.loading ? (
            renderMonitorState(
              "Sto caricando la serie di produzione portfolio.",
              "loading",
            )
          ) : energyMonitor.error ? (
            renderMonitorState(energyMonitor.error, "error")
          ) : (
            <MonitorLineChart
              data={energyChartData}
              seriesKeys={energyForecastPoints.length > 0 ? ["actual", "forecast"] : ["actual"]}
              forecastSeriesKeys={["forecast"]}
              labelMap={{ actual: "Actual", forecast: "Forecast" }}
            />
          )}
        </MonitorPanel>

        <SectionCard
          title="Portfolio KPIs"
          subtitle="Snapshot di sintesi per il Portfolio Manager su prezzi, produzione e stato impianti."
        >
          <PortfolioKpiGrid
            summary={summaryResource.data}
            loading={summaryResource.loading}
            error={summaryResource.error}
          />
        </SectionCard>

        <SectionCard
          title="Forecast Engine"
          subtitle="Trigger on-demand su serie portfolio aggregate. Il forecast usa ARIMA o Prophet e si innesta nei grafici superiori."
        >
          <ForecastEnginePanel
            value={forecastExecution.formState}
            response={forecastExecution.response}
            isSubmitting={forecastExecution.isSubmitting}
            error={forecastExecution.error}
            onChange={forecastExecution.setFormState}
            onSubmit={forecastExecution.runForecast}
          />
        </SectionCard>
      </div>
    </main>
  );
}
