import { energyApi } from "../api/client";
import { getTrackingSessionId, trackUserAction } from "./userActionTracking";

vi.mock("../api/client", () => ({
  energyApi: {
    trackUserActions: vi.fn(),
  },
}));

describe("userActionTracking", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("reuses the same browser session id for subsequent events", () => {
    const first = getTrackingSessionId();
    const second = getTrackingSessionId();

    expect(first).toBe(second);
  });

  it("posts a normalized action payload and swallows tracking failures", async () => {
    vi.mocked(energyApi.trackUserActions).mockRejectedValueOnce(new Error("tracking down"));

    await expect(
      trackUserAction({
        eventName: "granularity_changed",
        surface: "header",
        granularity: "1h",
      }),
    ).resolves.toBeUndefined();

    expect(energyApi.trackUserActions).toHaveBeenCalledTimes(1);
    expect(energyApi.trackUserActions).toHaveBeenCalledWith(
      expect.objectContaining({
        events: [
          expect.objectContaining({
            event_name: "granularity_changed",
            surface: "header",
            granularity: "1h",
            session_id: expect.any(String),
          }),
        ],
      }),
    );
  });
});
