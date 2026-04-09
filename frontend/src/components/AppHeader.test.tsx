import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("opens dashboard settings and notifies global switch changes", async () => {
    const user = userEvent.setup();
    const onRoleChange = vi.fn();
    const onThemeChange = vi.fn();
    const onGranularityChange = vi.fn();

    render(
      <AppHeader
        role="portfolioManager"
        theme="dark"
        granularity="15m"
        isPending={false}
        headerKpis={[
          { title: "Avg daily Price", value: "101.20", unit: "€/MWh" },
          { title: "Avg weekly Price", value: "96.40", unit: "€/MWh" },
          { title: "Avg Prod 24h", value: "42.10", unit: "GWh" },
        ]}
        onRoleChange={onRoleChange}
        onThemeChange={onThemeChange}
        onGranularityChange={onGranularityChange}
      />,
    );

    expect(screen.getByText("Avg daily Price")).toBeInTheDocument();
    expect(screen.getByText("101.20")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dashboard settings" }));
    await user.click(screen.getByRole("button", { name: "Data Analyst" }));
    await user.click(screen.getByRole("button", { name: "Light" }));
    await user.click(screen.getByRole("button", { name: "1h" }));

    expect(onRoleChange).toHaveBeenCalledWith("dataAnalyst");
    expect(onThemeChange).toHaveBeenCalledWith("light");
    expect(onGranularityChange).toHaveBeenCalledWith("1h");
  }, 20_000);

  it("shows contextual help for header controls", async () => {
    const user = userEvent.setup();

    render(
      <AppHeader
        role="portfolioManager"
        theme="dark"
        granularity="1h"
        isPending={false}
        headerKpis={[]}
        onRoleChange={vi.fn()}
        onThemeChange={vi.fn()}
        onGranularityChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Dashboard settings" }));
    await user.hover(screen.getByRole("button", { name: "Help Profile" }));

    expect(
      screen.getByText(/switch the dashboard perspective/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/what's new/i)).not.toBeInTheDocument();
  }, 20_000);
});
