import { afterEach, describe, expect, it, vi } from "vitest";

async function loadWith(rankedV2: string, zoneBot: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_RANKED_V2", rankedV2);
  vi.stubEnv("NEXT_PUBLIC_ZONE_BOT", zoneBot);
  return import("../tickets");
}

describe("STORE_SELLS_TICKETS", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("hides ticket packs when Ranked 2.0 (free) is what the Play page starts", async () => {
    expect((await loadWith("true", "true")).STORE_SELLS_TICKETS).toBe(false);
  });

  it("keeps ticket packs while the old ticketed ranked queue is still in use", async () => {
    expect((await loadWith("false", "true")).STORE_SELLS_TICKETS).toBe(true);
    expect((await loadWith("true", "false")).STORE_SELLS_TICKETS).toBe(true);
  });
});
