import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const setLocale = vi.fn();
const updateMe = vi.fn();
const setAuthenticated = vi.fn();
const toast = { success: vi.fn(), error: vi.fn() };
let currentLocale = "en";
let user: { id: string; preferred_language: string } | null = { id: "u1", preferred_language: "en" };

vi.mock("sonner", () => ({ toast }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: currentLocale, setLocale, t: (k: string) => k }) }));
vi.mock("@/lib/analytics/game-events", () => ({ trackLanguageSwitched: vi.fn() }));
vi.mock("@/lib/api/endpoints", () => ({ updateMe: (...a: unknown[]) => updateMe(...a) }));
const listeners = new Set<(s: { user: typeof user }) => void>();
const signIn = (next: typeof user) => { user = next; for (const l of Array.from(listeners)) l({ user }); };
vi.mock("@/stores/auth.store", () => {
  const useAuthStore = (sel?: (s: { user: typeof user; setAuthenticated: typeof setAuthenticated }) => unknown) => (sel ? sel({ user, setAuthenticated }) : { user, setAuthenticated });
  useAuthStore.getState = () => ({ user, setAuthenticated });
  useAuthStore.subscribe = (l: (s: { user: typeof user }) => void) => { listeners.add(l); return () => listeners.delete(l); };
  return { useAuthStore };
});

const { useChangeLanguage } = await import("../useChangeLanguage");
const deferred = <T,>() => { let resolve!: (v: T) => void; let reject!: (e: unknown) => void; const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; };

describe("useChangeLanguage", () => {
  beforeEach(() => { vi.clearAllMocks(); currentLocale = "en"; user = { id: "u1", preferred_language: "en" }; });

  it("switches in place, saves the preference, and reverts to the starting locale when the save fails", async () => {
    updateMe.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useChangeLanguage());
    await act(async () => { await result.current.changeLanguage("ka"); });
    expect(setLocale).toHaveBeenNthCalledWith(1, "ka");
    expect(setLocale).toHaveBeenNthCalledWith(2, "en");
    expect(toast.error).toHaveBeenCalledWith("settings.languageUpdateFailed");
  });

  it("allows one in-place change at a time across instances", async () => {
    const d = deferred<{ preferred_language: string }>();
    updateMe.mockReturnValueOnce(d.promise);
    const a = renderHook(() => useChangeLanguage());
    const b = renderHook(() => useChangeLanguage());
    let first!: Promise<void>;
    act(() => { first = a.result.current.changeLanguage("ka"); });
    await act(async () => { await b.result.current.changeLanguage("es"); });
    expect(setLocale).toHaveBeenCalledTimes(1); // the second change was dropped while the first saves
    await act(async () => { d.resolve({ preferred_language: "ka" }); await first; });
    expect(setAuthenticated).toHaveBeenCalledWith(expect.objectContaining({ preferred_language: "ka" }));
  });

  it("savePreference (navigating selections) never touches the UI locale, runs saves in order, and swallows failures", async () => {
    const first = deferred<{ preferred_language: string }>();
    updateMe.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ preferred_language: "ka" });
    const { result } = renderHook(() => useChangeLanguage());
    const p1 = result.current.savePreference("es");
    const p2 = result.current.savePreference("ka");
    await act(async () => { await Promise.resolve(); });
    expect(updateMe).toHaveBeenCalledTimes(1); // the second waits for the first
    await act(async () => { first.reject(new Error("offline")); await p1; await p2; });
    expect(updateMe).toHaveBeenNthCalledWith(2, { preferred_language: "ka" }, expect.any(AbortSignal));
    expect(setLocale).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(setAuthenticated).toHaveBeenLastCalledWith(expect.objectContaining({ preferred_language: "ka" }));
  });

  it("serialises saves across both paths: an in-place change waits behind a pending navigating save", async () => {
    const first = deferred<{ preferred_language: string }>();
    updateMe.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ preferred_language: "en" });
    const { result } = renderHook(() => useChangeLanguage());
    const nav = result.current.savePreference("es");
    let inPlace!: Promise<void>;
    act(() => { inPlace = result.current.changeLanguage("ka"); });
    await act(async () => { await Promise.resolve(); });
    expect(setLocale).toHaveBeenCalledWith("ka"); // the UI switches at once
    expect(updateMe).toHaveBeenCalledTimes(1); // but its save queues behind the pending one
    await act(async () => { first.resolve({ preferred_language: "es" }); await nav; await inPlace; });
    expect(updateMe).toHaveBeenNthCalledWith(2, { preferred_language: "ka" }, expect.any(AbortSignal));
  });

  it("drops queued saves when the account changes before they run, and never patches another account", async () => {
    const first = deferred<{ preferred_language: string }>();
    updateMe.mockReturnValueOnce(first.promise);
    const { result } = renderHook(() => useChangeLanguage());
    const p1 = result.current.savePreference("es");
    const p2 = result.current.savePreference("ka");
    await act(async () => { await Promise.resolve(); }); // the first save is dispatched…
    signIn({ id: "u2", preferred_language: "tr" }); // …then someone else signs in
    const signal = updateMe.mock.calls[0][1] as AbortSignal;
    expect(signal.aborted).toBe(true); // the in-flight request (and any refresh-retry) is cut off
    await act(async () => { first.reject(Object.assign(new Error("aborted"), { name: "AbortError" })); await p1; await p2; });
    expect(updateMe).toHaveBeenCalledTimes(1); // the second entry was skipped
    expect(setAuthenticated).not.toHaveBeenCalled(); // nothing patched u2's store
  });
});
