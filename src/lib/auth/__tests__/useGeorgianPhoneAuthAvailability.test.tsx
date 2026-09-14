import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config", () => ({ PHONE_AUTH_ENABLED: true }));
const probe = vi.fn();
vi.mock("@/lib/auth/auth.service", () => ({ getGeorgianPhoneAuthAvailability: (signal?: AbortSignal) => probe(signal) }));

const { useGeorgianPhoneAuthAvailability } = await import("../useGeorgianPhoneAuthAvailability");
const resolver = await import("../phoneAuthAvailabilityResolver");

const deferred = <T,>() => { let resolve!: (v: T) => void; let reject!: (e: unknown) => void; const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; };

describe("useGeorgianPhoneAuthAvailability", () => {
  beforeEach(() => { resolver.__resetPhoneAuthAvailabilityForTests(); window.sessionStorage.clear(); probe.mockReset(); vi.spyOn(console, "warn").mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it("shares one request across concurrent mounts and keeps the loading state until it settles", async () => {
    const d = deferred<{ country: string; phone_auth_available: boolean }>();
    probe.mockReturnValue(d.promise);
    const a = renderHook(() => useGeorgianPhoneAuthAvailability());
    const b = renderHook(() => useGeorgianPhoneAuthAvailability());
    expect(a.result.current.isLoading).toBe(true);
    expect(probe).toHaveBeenCalledTimes(1);
    await act(async () => { d.resolve({ country: "GE", phone_auth_available: true }); });
    await waitFor(() => expect(a.result.current).toEqual({ country: "GE", isAvailable: true, isLoading: false }));
    expect(b.result.current.isAvailable).toBe(true);
  });

  it("unmounting one subscriber does not abort the shared request", async () => {
    const d = deferred<{ country: string; phone_auth_available: boolean }>();
    probe.mockReturnValue(d.promise);
    const a = renderHook(() => useGeorgianPhoneAuthAvailability());
    const b = renderHook(() => useGeorgianPhoneAuthAvailability());
    a.unmount();
    await act(async () => { d.resolve({ country: "GE", phone_auth_available: true }); });
    await waitFor(() => expect(b.result.current.isAvailable).toBe(true));
    expect((probe.mock.calls[0][0] as AbortSignal).aborted).toBe(false);
  });

  it("serves later mounts from memory, and a reload from sessionStorage, without a new request", async () => {
    probe.mockResolvedValue({ country: "GE", phone_auth_available: true });
    const a = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(a.result.current.isLoading).toBe(false));
    const b = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(b.result.current.isAvailable).toBe(true));
    expect(probe).toHaveBeenCalledTimes(1);
    // "Reload": module memory gone, storage kept.
    resolver.__resetPhoneAuthAvailabilityForTests();
    const c = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(c.result.current).toEqual({ country: "GE", isAvailable: true, isLoading: false }));
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it("ignores expired or malformed storage and probes again", async () => {
    window.sessionStorage.setItem("qb.phoneAuthAvailability.v1", JSON.stringify({ version: 1, country: "GE", isAvailable: true, resolvedAt: Date.now() - resolver.PHONE_AVAILABILITY_TTL_MS - 1 }));
    probe.mockResolvedValue({ country: "DE", phone_auth_available: false });
    const a = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(a.result.current).toEqual({ country: "DE", isAvailable: false, isLoading: false }));
    expect(probe).toHaveBeenCalledTimes(1);
    resolver.__resetPhoneAuthAvailabilityForTests();
    window.sessionStorage.setItem("qb.phoneAuthAvailability.v1", "{not json");
    const b = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(b.result.current.isLoading).toBe(false));
    expect(probe).toHaveBeenCalledTimes(2);
  });

  it("does not cache a failure: loading settles, the cooldown suppresses retries, then the next mount probes again", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    probe.mockRejectedValueOnce(new Error("network"));
    const a = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(a.result.current).toEqual({ country: null, isAvailable: false, isLoading: false }));
    expect(window.sessionStorage.getItem("qb.phoneAuthAvailability.v1")).toBeNull();
    const b = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(b.result.current.isLoading).toBe(false));
    expect(probe).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + resolver.PHONE_AVAILABILITY_FAILURE_COOLDOWN_MS + 1);
    probe.mockResolvedValueOnce({ country: "GE", phone_auth_available: true });
    const c = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(c.result.current.isAvailable).toBe(true));
    expect(probe).toHaveBeenCalledTimes(2);
  });

  it("a mounted screen never flips from available to unavailable (protects a phone flow in progress)", async () => {
    probe.mockResolvedValueOnce({ country: "GE", phone_auth_available: true });
    const a = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(a.result.current.isAvailable).toBe(true));
    // TTL expires; a new mount refetches and gets "false".
    resolver.__resetPhoneAuthAvailabilityForTests();
    window.sessionStorage.clear();
    probe.mockResolvedValueOnce({ country: "DE", phone_auth_available: false });
    const b = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(b.result.current.isAvailable).toBe(false));
    expect(a.result.current.isAvailable).toBe(true);
  });
});
