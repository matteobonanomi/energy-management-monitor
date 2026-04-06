import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { buildAllDefaultAdvancedSettings } from "../lib/forecastModelConfig";
import { ForecastEnginePanel } from "./ForecastEnginePanel";

describe("ForecastEnginePanel", () => {
  it("propagates basic form changes and submit for portfolio manager", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <ForecastEnginePanel
        role="portfolioManager"
        value={{
          modelType: "arima",
          targetKind: "both",
          horizon: "next_24h",
        }}
        advancedSettingsByModel={buildAllDefaultAdvancedSettings()}
        response={null}
        isSubmitting={false}
        error={null}
        errorProcessingMs={null}
        onChange={onChange}
        onAdvancedSettingsSave={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Model"), "prophet");
    await user.selectOptions(screen.getByLabelText("Forecast target"), "price");
    await user.click(screen.getByRole("button", { name: "RUN" }));

    expect(onChange).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  }, 20_000);

  it("shows short help text for forecast parameters", async () => {
    const user = userEvent.setup();

    render(
      <ForecastEnginePanel
        role="portfolioManager"
        value={{
          modelType: "arima",
          targetKind: "both",
          horizon: "next_24h",
        }}
        advancedSettingsByModel={buildAllDefaultAdvancedSettings()}
        response={null}
        isSubmitting={false}
        error={null}
        errorProcessingMs={null}
        onChange={vi.fn()}
        onAdvancedSettingsSave={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    await user.hover(screen.getByRole("button", { name: "Help Model" }));

    expect(
      screen.getByText(/ARIMA is fast and linear/i),
    ).toBeInTheDocument();
  }, 20_000);

  it("opens advanced settings for data analyst and saves custom parameters", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onSubmit = vi.fn();

    render(
      <ForecastEnginePanel
        role="dataAnalyst"
        value={{
          modelType: "random_forest",
          targetKind: "both",
          horizon: "next_24h",
        }}
        advancedSettingsByModel={buildAllDefaultAdvancedSettings()}
        response={null}
        isSubmitting={false}
        error={null}
        errorProcessingMs={null}
        onChange={vi.fn()}
        onAdvancedSettingsSave={onSave}
        onSubmit={onSubmit}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "ADVANCED SETTINGS" }),
    );
    await user.clear(screen.getByLabelText("n_estimators"));
    await user.type(screen.getByLabelText("n_estimators"), "150");
    await user.click(screen.getByRole("button", { name: "SAVE&RUN" }));

    expect(onSave).toHaveBeenCalledWith(
      "random_forest",
      expect.objectContaining({ n_estimators: 150 }),
    );
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        advancedSettings: expect.objectContaining({ n_estimators: 150 }),
      }),
    );
  }, 20_000);

  it("renders validation metrics after a completed run", () => {
    render(
      <ForecastEnginePanel
        role="portfolioManager"
        value={{
          modelType: "arima",
          targetKind: "both",
          horizon: "next_24h",
        }}
        advancedSettingsByModel={buildAllDefaultAdvancedSettings()}
        response={{
          requested_targets: ["price"],
          granularity: "1h",
          horizon: "next_24h",
          model_type: "arima",
          processing_ms: 1640,
          runs: [
            {
              id: 7,
              scope: "portfolio",
              target_code: null,
              granularity: "1h",
              horizon: "next_24h",
              signal_type: "price",
              model_name: "arima",
              fallback_used: false,
              status: "completed",
              started_at: "2026-01-01T00:00:00+00:00",
              completed_at: "2026-01-01T00:00:10+00:00",
              metadata_json: {
                validation_mae: 2.34,
                validation_mae_unit: "EUR/MWh",
                validation_mape_pct: 3.8,
                validation_start: "2026-01-01T00:00:00+00:00",
                validation_end: "2026-01-01T12:00:00+00:00",
              },
              values: [],
            },
          ],
        }}
        isSubmitting={false}
        error={null}
        errorProcessingMs={null}
        onChange={vi.fn()}
        onAdvancedSettingsSave={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("RESULTS")).toBeInTheDocument();
    expect(screen.getByText("MAE 2.34 €/MWh")).toBeInTheDocument();
    expect(screen.getByText(/MAPE 3.8%/i)).toBeInTheDocument();
  });
});
