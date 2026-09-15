import { renderHook } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// NODE_ENV is read once at module load (the development override), so stub it before the import;
// the feature flag is read at render time, so a live getter lets each case flip it without resetting modules.
vi.stubEnv("NODE_ENV", "development");
const config = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/lib/config", () => ({ get PHONE_AUTH_ENABLED() { return config.enabled; } }));
const probe = vi.fn();
vi.mock("@/lib/auth/auth.service", () => ({ getGeorgianPhoneAuthAvailability: () => probe() }));

const { useGeorgianPhoneAuthAvailability } = await import("../useGeorgianPhoneAuthAvailability");

describe("useGeorgianPhoneAuthAvailability precedence", () => {
  beforeEach(() => { probe.mockReset(); });
  afterAll(() => { vi.unstubAllEnvs(); });

  it("local development forces the phone option available without probing", async () => {
    config.enabled = true;
    const { result } = renderHook(() => useGeorgianPhoneAuthAvailability());
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current).toEqual({ country: "GE", isAvailable: true, isLoading: false });
    expect(probe).not.toHaveBeenCalled();
  });

  it("the feature flag being off wins over the development override", async () => {
    config.enabled = false;
    const { result } = renderHook(() => useGeorgianPhoneAuthAvailability());
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current).toEqual({ country: null, isAvailable: false, isLoading: false });
    expect(probe).not.toHaveBeenCalled();
  });
});
