import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PlantSelectorModal } from "./PlantSelectorModal";

describe("PlantSelectorModal", () => {
  it("filters plants by name and notifies selection", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <PlantSelectorModal
        plants={[
          {
            code: "PV001",
            name: "Avellino PV 001",
            technology: "pv",
            market_zone: "NORD",
            capacity_mw: 12,
          },
          {
            code: "WIND001",
            name: "Cagliari WIND 001",
            technology: "wind",
            market_zone: "SUD",
            capacity_mw: 24,
          },
        ]}
        onClose={vi.fn()}
        onSelect={onSelect}
      />,
    );

    await user.type(screen.getByLabelText("Plant search"), "Avellino");
    await user.click(screen.getByRole("button", { name: "Avellino PV 001" }));

    expect(screen.queryByRole("button", { name: "Cagliari WIND 001" })).not.toBeInTheDocument();
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ code: "PV001", name: "Avellino PV 001" }),
    );
  }, 20_000);
});
