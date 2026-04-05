import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ForecastEnginePanel } from "./ForecastEnginePanel";

describe("ForecastEnginePanel", () => {
  it("propagates form changes and submit", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <ForecastEnginePanel
        value={{
          modelType: "arima",
          targetKind: "both",
          horizon: "next_24h",
        }}
        response={null}
        isSubmitting={false}
        error={null}
        onChange={onChange}
        onSubmit={onSubmit}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Model"), "prophet");
    await user.selectOptions(screen.getByLabelText("Cosa prevedere"), "price");
    await user.click(screen.getByRole("button", { name: "RUN" }));

    expect(onChange).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  }, 20_000);
});
