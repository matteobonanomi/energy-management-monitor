import { useEffect, useMemo, useState, useTransition } from "react";

import { AppHeader } from "../components/AppHeader";
import {
  DualAxisProductionPriceChart,
  MonitorLineChart,
  MonitorStackedAreaChart,
} from "../components/Charts";
import { ForecastEnginePanel } from "../components/ForecastEnginePanel";
import { LoadingBattery } from "../components/LoadingBattery";
import { MonitorPanel } from "../components/MonitorPanel";
import { AnalystKpiGrid } from "../components/AnalystKpiGrid";
import { PlantSelectorModal } from "../components/PlantSelectorModal";
import { PortfolioKpiGrid } from "../components/PortfolioKpiGrid";
import { SectionCard } from "../components/Panel";
import { TimeWindowSelector } from "../components/TimeWindowSelector";
import { useForecastExecution } from "../hooks/useForecastExecution";
import { useFiltersData } from "../hooks/useFiltersData";
import { useMonitorSeries } from "../hooks/useMonitorSeries";
import { usePortfolioSummary } from "../hooks/usePortfolioSummary";
import { forecastModelOptionsByRole } from "../lib/forecastModelConfig";
import { buildPortfolioHeaderKpis } from "../lib/portfolioKpis";
import {
  buildProductionForecastSeriesKey,
  buildDualAxisChartData,
  buildMonitorForecastChartData,
  buildStackedMonitorChartData,
} from "../lib/charts";
import { buildRangeIsoBounds } from "../lib/dates";
import { trackUserAction } from "../lib/userActionTracking";
import type {
  AnalystProductionView,
  DashboardFiltersState,
  FilterPlantOption,
  ForecastProductionScope,
  ThemeMode,
  TimeWindow,
  UserRole,
} from "../types/api";

const EMPTY_FILTERS: DashboardFiltersState = {
  technology: [],
  marketZone: [],
  plantCode: "",
  marketSession: "MGP",
  dateFrom: "",
  dateTo: "",
  forecastRunId: "",
};

function sameScope(
  scope: string,
  targetCode: string | null,
  expectedScope: ForecastProductionScope,
  expectedTargetCode: string | null,
) {
  return scope === expectedScope && (targetCode ?? null) === (expectedTargetCode ?? null);
}

/**
 * Hosts the single-page dashboard shell so persona, theme, granularity, and
 * forecast state remain coordinated across panels and overlays.
 */
export function App() {
  const [role, setRole] = useState<UserRole>("portfolioManager");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [granularity, setGranularity] = useState<"15m" | "1h">("1h");
  const [priceWindow, setPriceWindow] = useState<TimeWindow>("1w");
  const [energyWindow, setEnergyWindow] = useState<TimeWindow>("1w");
  const [analystWindow, setAnalystWindow] = useState<TimeWindow>("1w");
  const [analystProductionView, setAnalystProductionView] =
    useState<AnalystProductionView>("total");
  const [selectedPlant, setSelectedPlant] = useState<FilterPlantOption | null>(null);
  const [isPlantModalOpen, setIsPlantModalOpen] = useState(false);
  const [isPending, startNavigation] = useTransition();

  const filtersResource = useFiltersData();
  const summaryResource = usePortfolioSummary(EMPTY_FILTERS, granularity);
  const forecastExecution = useForecastExecution(granularity);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (role !== "portfolioManager") {
      return;
    }

    const allowedModels = new Set(
      forecastModelOptionsByRole.portfolioManager.map((option) => option.value),
    );
    if (!allowedModels.has(forecastExecution.formState.modelType)) {
      forecastExecution.setFormState((current) => ({
        ...current,
        modelType: "arima",
      }));
    }
  }, [forecastExecution.formState.modelType, forecastExecution.setFormState, role]);

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
    () => buildRangeIsoBounds(priceWindow, timeBounds?.minTimestamp ?? null, timeBounds?.maxTimestamp ?? null),
    [priceWindow, timeBounds],
  );
  const energyRange = useMemo(
    () => buildRangeIsoBounds(energyWindow, timeBounds?.minTimestamp ?? null, timeBounds?.maxTimestamp ?? null),
    [energyWindow, timeBounds],
  );
  const analystRange = useMemo(
    () => buildRangeIsoBounds(analystWindow, timeBounds?.minTimestamp ?? null, timeBounds?.maxTimestamp ?? null),
    [analystWindow, timeBounds],
  );

  const analystProductionConfig = useMemo(() => {
    if (analystProductionView === "zoneEST") {
      return {
        filters: { marketZone: ["EST"] },
        breakdownBy: "technology" as const,
        scope: "zone" as const,
        targetCode: "EST",
        description: "East zone production",
      };
    }
    if (analystProductionView === "zoneNORD") {
      return {
        filters: { marketZone: ["NORD"] },
        breakdownBy: "technology" as const,
        scope: "zone" as const,
        targetCode: "NORD",
        description: "North zone production",
      };
    }
    if (analystProductionView === "zoneSUD") {
      return {
        filters: { marketZone: ["SUD"] },
        breakdownBy: "technology" as const,
        scope: "zone" as const,
        targetCode: "SUD",
        description: "South zone production",
      };
    }
    if (analystProductionView === "zoneOVEST") {
      return {
        filters: { marketZone: ["OVEST"] },
        breakdownBy: "technology" as const,
        scope: "zone" as const,
        targetCode: "OVEST",
        description: "West zone production",
      };
    }
    if (analystProductionView === "singlePlant" && selectedPlant) {
      return {
        filters: { plantCode: selectedPlant.code },
        breakdownBy: "none" as const,
        scope: "plant" as const,
        targetCode: selectedPlant.code,
        description: selectedPlant.name,
      };
    }
    return {
      filters: {},
      breakdownBy: "technology" as const,
      scope: "portfolio" as const,
      targetCode: null,
      description: "Total portfolio production",
    };
  }, [analystProductionView, selectedPlant]);

  const priceMonitor = useMonitorSeries({
    kind: "price",
    granularity,
    range: priceRange,
  });
  const energyMonitor = useMonitorSeries({
    kind: "production",
    granularity,
    range: energyRange,
    breakdownBy: "technology",
  });
  const analystPriceMonitor = useMonitorSeries({
    kind: "price",
    granularity,
    range: analystRange,
  });
  const analystProductionMonitor = useMonitorSeries({
    kind: "production",
    granularity,
    range: analystRange,
    breakdownBy: analystProductionConfig.breakdownBy,
    filters: {
      ...EMPTY_FILTERS,
      marketZone: analystProductionConfig.filters.marketZone ?? [],
      plantCode: analystProductionConfig.filters.plantCode ?? "",
    },
  });

  const forecastRuns = forecastExecution.response?.runs ?? [];
  const pmPriceRun = forecastExecution.runsBySignal.price ?? null;
  const analystPriceRun = forecastExecution.runsBySignal.price ?? null;
  const pmProductionRuns = useMemo(
    () =>
      forecastRuns.filter(
        (run) =>
          run.signal_type === "production" &&
          (run.scope === "portfolio" || run.scope === "technology"),
      ),
    [forecastRuns],
  );
  const analystProductionRun = useMemo(
    () =>
      forecastRuns.find(
        (run) =>
          run.signal_type === "production" &&
          sameScope(
            run.scope,
            run.target_code,
            analystProductionConfig.scope,
            analystProductionConfig.targetCode,
          ),
      ) ?? null,
    [analystProductionConfig.scope, analystProductionConfig.targetCode, forecastRuns],
  );
  const analystProductionForecastRuns = useMemo(() => {
    if (!analystProductionRun) {
      return [];
    }

    return forecastRuns.filter(
      (run) =>
        run.signal_type === "production" &&
        (sameScope(
          run.scope,
          run.target_code,
          analystProductionConfig.scope,
          analystProductionConfig.targetCode,
        ) ||
          run.scope === "technology"),
    );
  }, [
    analystProductionConfig.scope,
    analystProductionConfig.targetCode,
    analystProductionRun,
    forecastRuns,
  ]);

  const priceActualPoints = priceMonitor.data?.series[0]?.points ?? [];
  const energyActualSeries = energyMonitor.data?.series ?? [];
  const priceForecastPoints = pmPriceRun?.values ?? [];
  const priceChartData = buildMonitorForecastChartData(priceActualPoints, priceForecastPoints);
  const energySeriesKeys = useMemo(() => {
    const available = new Set(energyActualSeries.map((series) => series.key));
    return ["pv", "wind", "hydro", "gas"].filter((seriesKey) => available.has(seriesKey));
  }, [energyActualSeries]);
  const portfolioEnergyForecastRuns = useMemo(() => {
    const activeTechnologyKeys = new Set(energySeriesKeys);
    return pmProductionRuns.filter(
      (run) =>
        run.scope === "portfolio" ||
        (run.scope === "technology" &&
          Boolean(run.target_code) &&
          activeTechnologyKeys.has(run.target_code!)),
    );
  }, [energySeriesKeys, pmProductionRuns]);
  const energyChartData = buildStackedMonitorChartData(
    energyActualSeries,
    portfolioEnergyForecastRuns,
  );
  const energyForecastLineKeys = useMemo(
    () =>
      portfolioEnergyForecastRuns.map((run) =>
        buildProductionForecastSeriesKey(run.scope, run.target_code),
      ),
    [portfolioEnergyForecastRuns],
  );
  const energyLabelMap = useMemo(
    () => ({
      pv: "PV",
      wind: "WIND",
      hydro: "IDRO",
      gas: "GAS",
      forecast_total: "Total forecast",
      forecast_pv: "PV forecast",
      forecast_wind: "WIND forecast",
      forecast_hydro: "IDRO forecast",
      forecast_gas: "GAS forecast",
    }),
    [],
  );

  const analystPriceActualPoints = analystPriceMonitor.data?.series[0]?.points ?? [];
  const analystProductionSeries = analystProductionMonitor.data?.series ?? [];
  const analystChartData = buildDualAxisChartData(
    analystProductionSeries,
    analystPriceActualPoints,
    analystProductionForecastRuns,
    analystPriceRun?.values ?? [],
  );
  const analystForecastLineKeys = useMemo(
    () =>
      analystProductionForecastRuns.map((run) =>
        buildProductionForecastSeriesKey(run.scope, run.target_code),
      ),
    [analystProductionForecastRuns],
  );
  const analystSeriesKeys = useMemo(() => {
    const available = new Set(analystProductionSeries.map((series) => series.key));
    const preferred = ["pv", "wind", "hydro", "gas", "actual"];
    return preferred.filter((seriesKey) => available.has(seriesKey));
  }, [analystProductionSeries]);

  const apiBootstrapError = filtersResource.error;
  const headerKpis = useMemo(
    () => buildPortfolioHeaderKpis(summaryResource.data),
    [summaryResource.data],
  );

  function renderMonitorState(message: string, tone: "loading" | "error") {
    return (
      <div
        className={
          tone === "error"
            ? "monitor-inline-state monitor-inline-state-error"
            : "monitor-inline-state"
        }
      >
        {tone === "loading" ? <LoadingBattery label={message} /> : <p>{message}</p>}
      </div>
    );
  }

  function handleAnalystProductionSelection(nextValue: AnalystProductionView) {
    if (nextValue === "singlePlant") {
      setIsPlantModalOpen(true);
      if (selectedPlant) {
        setAnalystProductionView("singlePlant");
      }
      return;
    }

    setAnalystProductionView(nextValue);
    void trackUserAction({
      eventName: "analyst_production_view_changed",
      surface: "price_plant_chart",
      role,
      theme,
      granularity,
      payload: {
        next_view: nextValue,
      },
    });
  }

  function handlePlantSelect(plant: FilterPlantOption) {
    setSelectedPlant(plant);
    setAnalystProductionView("singlePlant");
    setIsPlantModalOpen(false);
    void trackUserAction({
      eventName: "analyst_plant_selected",
      surface: "plant_selector",
      role,
      theme,
      granularity,
      payload: {
        plant_code: plant.code,
        plant_name: plant.name,
      },
    });
  }

  return (
    <main className="page-shell" data-theme={theme}>
      <div className="backdrop-grid" />

      <AppHeader
        role={role}
        theme={theme}
        granularity={granularity}
        isPending={isPending}
        headerKpis={headerKpis}
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
        {role === "portfolioManager" ? (
          <>
            <MonitorPanel
              title="Price monitor"
              subtitle="MGP price trend across the selected historical window."
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
                  "Waiting for API bootstrap and price series loading from the backend.",
                  "loading",
                )
              ) : apiBootstrapError ? (
                renderMonitorState(apiBootstrapError, "error")
              ) : priceMonitor.loading ? (
                renderMonitorState(
                  "Loading the price series for the selected time window.",
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
              subtitle="Portfolio production stacked by technology, with dashed forecast overlays for total output and each active technology over the selected time window."
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
                  "Waiting for API bootstrap and production series loading from the backend.",
                  "loading",
                )
              ) : apiBootstrapError ? (
                renderMonitorState(apiBootstrapError, "error")
              ) : energyMonitor.loading ? (
                renderMonitorState(
                  "Loading the portfolio production series.",
                  "loading",
                )
              ) : energyMonitor.error ? (
                renderMonitorState(energyMonitor.error, "error")
              ) : (
                <MonitorStackedAreaChart
                  data={energyChartData}
                  areaSeriesKeys={energySeriesKeys}
                  forecastLineKeys={energyForecastLineKeys}
                  labelMap={energyLabelMap}
                />
              )}
            </MonitorPanel>
          </>
        ) : (
          <SectionCard
            className="panel-span-2"
            title="Price-Plant chart"
            subtitle={`${analystProductionConfig.description} on a dual-axis chart: production on the left, price on the right.`}
            actions={
              <div className="analyst-panel-actions">
                <select
                  aria-label="Analyst production selector"
                  value={analystProductionView}
                  onChange={(event) =>
                    handleAnalystProductionSelection(
                      event.target.value as AnalystProductionView,
                    )
                  }
                >
                  <option value="total">total production</option>
                  <option value="zoneEST">east zone production</option>
                  <option value="zoneNORD">north zone production</option>
                  <option value="zoneSUD">south zone production</option>
                  <option value="zoneOVEST">west zone production</option>
                  <option value="singlePlant">single plant</option>
                </select>
              </div>
            }
          >
            <div className="monitor-panel-body">
              {filtersResource.loading ? (
                renderMonitorState(
                  "Loading price and production data for the analyst panel.",
                  "loading",
                )
              ) : apiBootstrapError ? (
                renderMonitorState(apiBootstrapError, "error")
              ) : analystPriceMonitor.loading || analystProductionMonitor.loading ? (
                renderMonitorState(
                  "Loading the Price-Plant chart for the selected historical depth.",
                  "loading",
                )
              ) : analystPriceMonitor.error ? (
                renderMonitorState(analystPriceMonitor.error, "error")
              ) : analystProductionMonitor.error ? (
                renderMonitorState(analystProductionMonitor.error, "error")
              ) : (
                <DualAxisProductionPriceChart
                  data={analystChartData}
                  productionSeriesKeys={analystSeriesKeys}
                  productionForecastSeriesKeys={analystForecastLineKeys}
                  labelMap={{
                    pv: "PV",
                    wind: "WIND",
                    hydro: "IDRO",
                    gas: "GAS",
                    actual: selectedPlant?.name ?? "Plant output",
                    priceActual: "Price",
                    priceForecast: "Price forecast",
                    forecast_total: "Production forecast (total)",
                    forecast_pv: "Production forecast (PV)",
                    forecast_wind: "Production forecast (WIND)",
                    forecast_hydro: "Production forecast (IDRO)",
                    forecast_gas: "Production forecast (GAS)",
                  }}
                />
              )}
            </div>
            <div className="monitor-panel-footer">
              <TimeWindowSelector
                value={analystWindow}
                onChange={(nextWindow) => {
                  setAnalystWindow(nextWindow);
                  void trackUserAction({
                    eventName: "time_window_changed",
                    surface: "price_plant_chart",
                    role,
                    theme,
                    granularity,
                    payload: {
                      previous_window: analystWindow,
                      next_window: nextWindow,
                    },
                  });
                }}
              />
            </div>
          </SectionCard>
        )}

        <SectionCard
          title={role === "portfolioManager" ? "Portfolio KPIs" : "Custom KPIs"}
          subtitle={
            role === "portfolioManager"
              ? "Portfolio snapshot across prices, production, and plant operating status."
              : "Configure up to six custom KPI tiles for exploratory analysis."
          }
        >
          {role === "portfolioManager" ? (
            <PortfolioKpiGrid
              summary={summaryResource.data}
              loading={summaryResource.loading}
              error={summaryResource.error}
            />
          ) : (
            <AnalystKpiGrid
              granularity={granularity}
              maxTimestamp={filtersResource.data?.date_range.max_timestamp ?? null}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Forecast Engine"
          subtitle={
            role === "portfolioManager"
              ? "Run on-demand forecasts on aggregated portfolio series. Portfolio Manager uses ARIMA and Prophet with automatic validation."
              : "Run on-demand forecasts with statistical and machine-learning models, validation metrics, and editable hyperparameters."
          }
        >
          <ForecastEnginePanel
            role={role}
            value={forecastExecution.formState}
            advancedSettingsByModel={forecastExecution.advancedSettingsByModel}
            response={forecastExecution.response}
            isSubmitting={forecastExecution.isSubmitting}
            error={forecastExecution.error}
            errorProcessingMs={forecastExecution.errorProcessingMs}
            onChange={forecastExecution.setFormState}
            onAdvancedSettingsSave={forecastExecution.setAdvancedSettings}
            onSubmit={(options) =>
              forecastExecution.runForecast({
                ...options,
                includeProductionBreakdowns:
                  forecastExecution.formState.targetKind !== "price" &&
                  (role === "portfolioManager" ||
                    analystProductionConfig.scope !== "plant"),
                productionScope:
                  role === "dataAnalyst"
                    ? analystProductionConfig.scope
                    : "portfolio",
                productionTargetCode:
                  role === "dataAnalyst"
                    ? analystProductionConfig.targetCode
                    : null,
              })
            }
          />
        </SectionCard>
      </div>

      {isPlantModalOpen && filtersResource.data ? (
        <PlantSelectorModal
          plants={filtersResource.data.plants}
          onClose={() => setIsPlantModalOpen(false)}
          onSelect={handlePlantSelect}
        />
      ) : null}
    </main>
  );
}
