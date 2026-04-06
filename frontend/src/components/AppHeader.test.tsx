import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("notifies global switch changes", async () => {
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
        onRoleChange={onRoleChange}
        onThemeChange={onThemeChange}
        onGranularityChange={onGranularityChange}
      />,
    );

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
        onRoleChange={vi.fn()}
        onThemeChange={vi.fn()}
        onGranularityChange={vi.fn()}
      />,
    );

    await user.hover(screen.getByRole("button", { name: "Help Profile" }));

    expect(
      screen.getByText(/switch the dashboard perspective/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/what's new/i)).toBeInTheDocument();
  }, 20_000);
});
