import { beforeEach, describe, expect, it, vi } from "vitest";

describe("loaded audio navigation control", () => {
  beforeEach(() => { vi.resetModules(); });

  it("does nothing on a fresh landing before an engine is loaded", async () => {
    const { stopLoadedBgm } = await import("../audioControl");
    expect(() => stopLoadedBgm()).not.toThrow();
  });

  it("stops the loaded engine synchronously and preserves the requested fade", async () => {
    const { registerBgmStop, stopLoadedBgm } = await import("../audioControl");
    const stop = vi.fn();
    registerBgmStop(stop);
    stopLoadedBgm();
    expect(stop).toHaveBeenLastCalledWith(0);
    stopLoadedBgm(250);
    expect(stop).toHaveBeenLastCalledWith(250);
  });
});
