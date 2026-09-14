import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config", () => ({ PHONE_AUTH_ENABLED: true }));
const probe = vi.fn();
vi.mock("@/lib/auth/auth.service", () => ({ getGeorgianPhoneAuthAvailability: (signal?: AbortSignal) => probe(signal) }));

const { useGeorgianPhoneAuthAvailability } = await import("../useGeorgianPhoneAuthAvailability");
const resolver = await import("../phoneAuthAvailabilityResolver");
const STORAGE_KEY = "qb.phoneAuthAvailability.v1";

const deferred = <T,>() => { let resolve!: (v: T) => void; let reject!: (e: unknown) => void; const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; };
const GE = { country: "GE", phone_auth_available: true };
const DE = { country: "DE", phone_auth_available: false };

describe("useGeorgianPhoneAuthAvailability", () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); resolver.__resetPhoneAuthAvailabilityForTests(); window.sessionStorage.clear(); probe.mockReset(); vi.spyOn(console, "warn").mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it("shares one request across concurrent mounts and keeps the loading state until it settles", async () => {
    const d = deferred<typeof GE>();
    probe.mockReturnValue(d.promise);
    const a = renderHook(() => useGeorgianPhoneAuthAvailability());
    const b = renderHook(() => useGeorgianPhoneAuthAvailability());
    expect(a.result.current).toEqual({ country: null, isAvailable: false, isLoading: true });
    expect(probe).toHaveBeenCalledTimes(1);
    await act(async () => { d.resolve(GE); });
    await waitFor(() => expect(a.result.current).toEqual({ country: "GE", isAvailable: true, isLoading: false }));
    expect(b.result.current.isAvailable).toBe(true);
  });

  it("survives Strict Mode effect replay with a single request", async () => {
    probe.mockResolvedValue(GE);
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
    const a = renderHook(() => useGeorgianPhoneAuthAvailability(), { wrapper });
    await waitFor(() => expect(a.result.current.isAvailable).toBe(true));
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it("unmounting one subscriber neither aborts the shared request nor updates the unmounted hook", async () => {
    const d = deferred<typeof GE>();
    probe.mockReturnValue(d.promise);
    const a = renderHook(() => useGeorgianPhoneAuthAvailability());
    const b = renderHook(() => useGeorgianPhoneAuthAvailability());
    a.unmount();
    await act(async () => { d.resolve(GE); });
    await waitFor(() => expect(b.result.current.isAvailable).toBe(true));
    expect((probe.mock.calls[0][0] as AbortSignal).aborted).toBe(false);
    expect(a.result.current.isLoading).toBe(true); // frozen at unmount, no late update
  });

  it("serves later mounts from memory, and a reload from sessionStorage, without a new request", async () => {
    probe.mockResolvedValue(GE);
    const a = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(a.result.current.isLoading).toBe(false));
    const b = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(b.result.current.isAvailable).toBe(true));
    expect(probe).toHaveBeenCalledTimes(1);
    resolver.__resetPhoneAuthAvailabilityForTests(); // "reload": module memory gone, storage kept
    const c = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(c.result.current).toEqual({ country: "GE", isAvailable: true, isLoading: false }));
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it("probes again after the TTL expires, and ignores malformed storage or storage that throws", async () => {
    probe.mockResolvedValueOnce(GE);
    const a = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(a.result.current.isAvailable).toBe(true));
    vi.setSystemTime(Date.now() + resolver.PHONE_AVAILABILITY_TTL_MS + 1);
    probe.mockResolvedValueOnce(DE);
    const b = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(b.result.current).toEqual({ country: "DE", isAvailable: false, isLoading: false }));
    expect(probe).toHaveBeenCalledTimes(2);

    resolver.__resetPhoneAuthAvailabilityForTests();
    window.sessionStorage.setItem(STORAGE_KEY, "{not json");
    probe.mockResolvedValueOnce(GE);
    const c = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(c.result.current.isAvailable).toBe(true));
    expect(probe).toHaveBeenCalledTimes(3);

    resolver.__resetPhoneAuthAvailabilityForTests();
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    probe.mockResolvedValueOnce(GE);
    const d = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(d.result.current.isAvailable).toBe(true));
    getItem.mockRestore(); setItem.mockRestore();
  });

  it("never caches a failure: loading settles, the cooldown suppresses retries without serving an expired entry, then probes again", async () => {
    probe.mockResolvedValueOnce(GE);
    const a = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(a.result.current.isAvailable).toBe(true));
    // Expired + failed refresh: nobody gets the stale GE/true back.
    vi.setSystemTime(Date.now() + resolver.PHONE_AVAILABILITY_TTL_MS + 1);
    window.sessionStorage.clear();
    probe.mockRejectedValueOnce(new Error("network"));
    const b = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(b.result.current).toEqual({ country: null, isAvailable: false, isLoading: false }));
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    const c = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(c.result.current.isLoading).toBe(false));
    expect(c.result.current.isAvailable).toBe(false);
    expect(probe).toHaveBeenCalledTimes(2);
    // After the cooldown the next mount probes again, and the screens mounted during the failure recover.
    vi.setSystemTime(Date.now() + resolver.PHONE_AVAILABILITY_FAILURE_COOLDOWN_MS + 1);
    probe.mockResolvedValueOnce(GE);
    const d = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(d.result.current.isAvailable).toBe(true));
    expect(probe).toHaveBeenCalledTimes(3);
    await waitFor(() => expect(b.result.current.isAvailable).toBe(true));
    expect(c.result.current.isAvailable).toBe(true);
  });

  it("a mounted screen never flips from available to unavailable, while a screen mounted after the refresh sees the new answer", async () => {
    probe.mockResolvedValueOnce(GE);
    const a = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(a.result.current.isAvailable).toBe(true));
    vi.setSystemTime(Date.now() + resolver.PHONE_AVAILABILITY_TTL_MS + 1);
    window.sessionStorage.clear();
    probe.mockResolvedValueOnce(DE);
    const b = renderHook(() => useGeorgianPhoneAuthAvailability());
    await waitFor(() => expect(b.result.current).toEqual({ country: "DE", isAvailable: false, isLoading: false }));
    expect(probe).toHaveBeenCalledTimes(2);
    expect(a.result.current).toEqual({ country: "GE", isAvailable: true, isLoading: false });
  });

  it("times out a hanging probe so later mounts are not stranded", async () => {
    probe.mockImplementationOnce((signal: AbortSignal) => new Promise((_, reject) => { signal.addEventListener("abort", () => reject(new Error("aborted"))); }));
    const a = renderHook(() => useGeorgianPhoneAuthAvailability());
    await act(async () => { vi.advanceTimersByTime(resolver.PHONE_AVAILABILITY_TIMEOUT_MS + 10); });
    await waitFor(() => expect(a.result.current.isLoading).toBe(false));
    expect((probe.mock.calls[0][0] as AbortSignal).aborted).toBe(true);
  });
});
