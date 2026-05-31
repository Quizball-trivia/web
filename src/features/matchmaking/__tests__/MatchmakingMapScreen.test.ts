import { describe, expect, it } from "vitest";

import { resolveSearchTimerStartedAt } from "../MatchmakingMapScreen";

describe("resolveSearchTimerStartedAt", () => {
  it("uses the local screen start before the server ack arrives", () => {
    expect(resolveSearchTimerStartedAt(null, 1_000)).toBe(1_000);
  });

  it("does not reset the visible timer when a delayed server ack arrives", () => {
    expect(resolveSearchTimerStartedAt(8_000, 1_000)).toBe(1_000);
  });

  it("keeps an earlier server start when it is older than the local fallback", () => {
    expect(resolveSearchTimerStartedAt(1_000, 8_000)).toBe(1_000);
  });
});
