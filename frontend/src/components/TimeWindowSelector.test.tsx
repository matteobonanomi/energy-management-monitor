import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TimeWindowSelector } from "./TimeWindowSelector";

describe("TimeWindowSelector", () => {
  it("changes the selected temporal depth", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<TimeWindowSelector value="1w" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "1 month" }));
    await user.click(screen.getByRole("button", { name: "max" }));

    expect(onChange).toHaveBeenNthCalledWith(1, "1m");
    expect(onChange).toHaveBeenNthCalledWith(2, "max");
  });
});
