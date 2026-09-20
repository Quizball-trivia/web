import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config", () => ({ PHONE_AUTH_ENABLED: false }));
const probe = vi.fn();
vi.mock("@/lib/auth/auth.service", () => ({ getGeorgianPhoneAuthAvailability: () => probe() }));

const { useGeorgianPhoneAuthAvailability } = await import("../useGeorgianPhoneAuthAvailability");

describe("useGeorgianPhoneAuthAvailability (feature off)", () => {
  it("never probes and never surfaces the phone option", async () => {
    window.sessionStorage.setItem("qb.phoneAuthAvailability.v1", JSON.stringify({ version: 1, country: "GE", isAvailable: true, resolvedAt: Date.now() }));
    const { result } = renderHook(() => useGeorgianPhoneAuthAvailability());
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current).toEqual({ country: null, isAvailable: false, isLoading: false });
    expect(probe).not.toHaveBeenCalled();
  });
});
