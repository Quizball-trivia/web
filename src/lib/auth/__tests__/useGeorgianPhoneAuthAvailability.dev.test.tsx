import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The hook reads NODE_ENV at module load, so each case imports a fresh module.
const probe = vi.fn();
vi.mock("@/lib/auth/auth.service", () => ({ getGeorgianPhoneAuthAvailability: () => probe() }));

describe("useGeorgianPhoneAuthAvailability precedence", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.doUnmock("@/lib/config"); probe.mockReset(); });

  it("local development forces the phone option available without probing", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.doMock("@/lib/config", () => ({ PHONE_AUTH_ENABLED: true }));
    const { useGeorgianPhoneAuthAvailability } = await import("../useGeorgianPhoneAuthAvailability");
    const { result } = renderHook(() => useGeorgianPhoneAuthAvailability());
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current).toEqual({ country: "GE", isAvailable: true, isLoading: false });
    expect(probe).not.toHaveBeenCalled();
  });

  it("the feature flag being off wins over the development override", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.doMock("@/lib/config", () => ({ PHONE_AUTH_ENABLED: false }));
    const { useGeorgianPhoneAuthAvailability } = await import("../useGeorgianPhoneAuthAvailability");
    const { result } = renderHook(() => useGeorgianPhoneAuthAvailability());
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current).toEqual({ country: null, isAvailable: false, isLoading: false });
    expect(probe).not.toHaveBeenCalled();
  });
});
