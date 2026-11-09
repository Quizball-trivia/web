import { describe, expect, it } from "vitest";
import { nextTicketRefillAt, secondsUntilTicketRefill } from "../ticketRefill";

// Backend cron: UTC 00/04/08/12/16/20 (= Georgia 04/08/12/16/20/00).
describe("ticket refill schedule", () => {
  it("rounds up to the next 4-hour UTC tick", () => {
    expect(new Date(nextTicketRefillAt(Date.parse("2026-11-02T13:15:00Z"))).toISOString()).toBe("2026-11-02T16:00:00.000Z");
    expect(new Date(nextTicketRefillAt(Date.parse("2026-11-02T22:59:59Z"))).toISOString()).toBe("2026-11-03T00:00:00.000Z");
  });

  it("moves to the following tick when exactly on one", () => {
    expect(new Date(nextTicketRefillAt(Date.parse("2026-11-02T08:00:00Z"))).toISOString()).toBe("2026-11-02T12:00:00.000Z");
  });

  it("counts whole seconds until the tick", () => {
    expect(secondsUntilTicketRefill(Date.parse("2026-11-02T15:58:20Z"))).toBe(100);
  });
});
