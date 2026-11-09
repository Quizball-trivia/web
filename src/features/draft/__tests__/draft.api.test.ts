import { beforeEach, describe, expect, it, vi } from "vitest";

const call = vi.hoisted(() => vi.fn(() => Promise.resolve({})));
vi.mock("@/lib/repositories/dailyGameApi", async (original) => ({
  ...(await original<typeof import("@/lib/repositories/dailyGameApi")>()),
  createDailyGameCall: () => call,
}));

import { draftApi } from "../draft.api";

const pathOf = () => (call.mock.calls[0] as unknown as [string])[0];

describe("draft addresses", () => {
  beforeEach(() => call.mockClear());

  it("a value from the address bar cannot add parameters", () => {
    void draftApi.today("budget", "en", "2026-11-06&x=1");
    expect(pathOf()).toBe("/budget/today?day=2026-11-06%26x%3D1");
  });

  it("a challenge code cannot walk to another path", () => {
    void draftApi.challengeRead("../../users/me?", "en");
    expect(pathOf()).toBe("/play/challenges/..%2F..%2Fusers%2Fme%3F");
  });

  it.each([".", ".."])("the code %s is refused before any request", (code) => {
    expect(() => draftApi.challengeRead(code, "en")).toThrow("not_found");
    expect(() => draftApi.challengeAccept(code, "en")).toThrow("not_found");
    expect(() => draftApi.challengeTie(code, "en")).toThrow("not_found");
    expect(call).not.toHaveBeenCalled();
  });
});
