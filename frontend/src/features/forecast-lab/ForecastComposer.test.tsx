import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ForecastComposer } from "./ForecastComposer";

describe("ForecastComposer", () => {
  it("updates model and target selections", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ForecastComposer
        granularity="1h"
        value={{
          modelType: "arima",
          targetKind: "both",
          horizon: "next_24h",
        }}
        isSubmitting={false}
        onChange={onChange}
        onSubmit={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Model"), "prophet");
    await user.selectOptions(screen.getByLabelText("Forecast target"), "price");

    expect(onChange).toHaveBeenNthCalledWith(1, {
      modelType: "prophet",
      targetKind: "both",
      horizon: "next_24h",
    });
    expect(onChange).toHaveBeenNthCalledWith(2, {
      modelType: "arima",
      targetKind: "price",
      horizon: "next_24h",
    });
  }, 20_000);

  it("disables submit while running", () => {
    render(
      <ForecastComposer
        granularity="15m"
        value={{
          modelType: "arima",
          targetKind: "volume",
          horizon: "day_ahead",
        }}
        isSubmitting={true}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Forecast running..." }),
    ).toBeDisabled();
  });
});
