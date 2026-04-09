import {
  buildDualAxisChartData,
  buildProductionForecastSeriesKey,
  buildStackedMonitorChartData,
} from "./charts";

describe("charts helpers", () => {
  it("merges portfolio and technology forecast overlays on the stacked production dataset", () => {
    const chartData = buildStackedMonitorChartData(
      [
        {
          key: "pv",
          label: "PV",
          points: [{ timestamp: "2026-01-01T00:00:00Z", value: 10 }],
        },
        {
          key: "wind",
          label: "WIND",
          points: [{ timestamp: "2026-01-01T00:00:00Z", value: 6 }],
        },
      ],
      [
        {
          scope: "portfolio",
          target_code: null,
          values: [{ timestamp: "2026-01-01T01:00:00Z", value: 20 }],
        },
        {
          scope: "technology",
          target_code: "pv",
          values: [{ timestamp: "2026-01-01T01:00:00Z", value: 12 }],
        },
      ],
    );

    expect(buildProductionForecastSeriesKey("portfolio", null)).toBe(
      "forecast_total",
    );
    expect(buildProductionForecastSeriesKey("technology", "pv")).toBe(
      "forecast_pv",
    );
    expect(chartData[1]).toMatchObject({
      timestamp: "2026-01-01T01:00:00Z",
      forecast_total: 20,
      forecast_pv: 12,
    });
  });

  it("supports multiple production forecast overlays in the dual-axis analyst dataset", () => {
    const chartData = buildDualAxisChartData(
      [
        {
          key: "pv",
          label: "PV",
          points: [{ timestamp: "2026-01-01T00:00:00Z", value: 10 }],
        },
      ],
      [{ timestamp: "2026-01-01T00:00:00Z", value: 100 }],
      [
        {
          scope: "portfolio",
          target_code: null,
          values: [{ timestamp: "2026-01-01T01:00:00Z", value: 18 }],
        },
        {
          scope: "technology",
          target_code: "pv",
          values: [{ timestamp: "2026-01-01T01:00:00Z", value: 12 }],
        },
      ],
      [{ timestamp: "2026-01-01T01:00:00Z", value: 102 }],
    );

    expect(chartData[1]).toMatchObject({
      timestamp: "2026-01-01T01:00:00Z",
      forecast_total: 18,
      forecast_pv: 12,
      priceForecast: 102,
    });
  });
});
