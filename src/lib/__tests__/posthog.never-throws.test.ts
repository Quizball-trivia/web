import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/guest/guestJourney", () => ({ recordGuestJourney: vi.fn(() => { throw new Error("journey recorder failed"); }) }));

import { trackEvent } from "../posthog";

describe("trackEvent", () => {
  it("never interrupts the caller when the guest journey recorder fails", () => {
    expect(() => trackEvent("game_start", { mode_id: "buscaminas", access_type: "guest" })).not.toThrow();
  });
});
