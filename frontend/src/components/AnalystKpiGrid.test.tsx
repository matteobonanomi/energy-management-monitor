import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AnalystKpiGrid } from "./AnalystKpiGrid";

vi.mock("../lib/analystKpis", async () => {
  const actual = await vi.importActual<typeof import("../lib/analystKpis")>(
    "../lib/analystKpis",
  );

  return {
    ...actual,
    loadAnalystKpiValue: vi.fn().mockResolvedValue({
      value: "12.40",
      unit: "GWh/day",
    }),
  };
});

describe("AnalystKpiGrid", () => {
  it("lets the analyst add and remove a custom KPI slot", async () => {
    const user = userEvent.setup();

    render(
      <AnalystKpiGrid
        granularity="1h"
        maxTimestamp="2026-01-15T00:00:00Z"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add KPI to slot 1" }));
    await user.type(screen.getByLabelText("KPI search"), "east");
    await user.click(screen.getByRole("button", { name: /^Avg East Prod 24h$/i }));

    await waitFor(() => {
      expect(screen.getByText("Avg East Prod 24h")).toBeInTheDocument();
      expect(screen.getByText("12.40")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Clear slot 1" }));

    expect(screen.getByRole("button", { name: "Add KPI to slot 1" })).toBeInTheDocument();
  }, 20_000);
});
