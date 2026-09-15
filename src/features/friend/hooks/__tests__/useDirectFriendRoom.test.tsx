import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const createLobby = vi.fn();
const ensureGuestPrincipal = vi.fn();
const openAuthPrompt = vi.fn();
const toast = { info: vi.fn(() => "t1"), dismiss: vi.fn(), error: vi.fn() };
const beginLobbyHandoff = vi.fn();
const calls: string[] = [];
let isGuest = false;
let isBusy = false;

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ t: (k: string) => k, locale: "en" }) }));
vi.mock("@/lib/auth/useIsGuest", () => ({ useIsGuest: () => isGuest }));
vi.mock("@/lib/realtime/realtime-principal", () => ({ ensureGuestPrincipal: (...a: unknown[]) => ensureGuestPrincipal(...a) }));
vi.mock("@/stores/authPrompt.store", () => ({ useAuthPromptStore: (sel: (s: { open: () => void }) => unknown) => sel({ open: openAuthPrompt }) }));
vi.mock("../useLobbyCommandMachine", () => ({ useLobbyCommandMachine: () => ({ createLobby, isBusy }) }));
vi.mock("@/stores/realtimeMatch.store", () => ({ useRealtimeMatchStore: (sel: (s: { beginLobbyHandoff: (c: string) => void }) => unknown) => sel({ beginLobbyHandoff: (c: string) => { calls.push("handoff"); beginLobbyHandoff(c); } }) }));

const { useDirectFriendRoom } = await import("../useDirectFriendRoom");

describe("useDirectFriendRoom", () => {
  beforeEach(() => { vi.clearAllMocks(); isGuest = false; isBusy = false; calls.length = 0; push.mockImplementation(() => { calls.push("push"); }); });

  it("creates a private room already in the requested mode and goes straight to it", async () => {
    createLobby.mockResolvedValue({ ok: true, lobbyId: "l1", inviteCode: "ABC123", correlationId: "c" });
    const onFallback = vi.fn();
    const { result } = renderHook(() => useDirectFriendRoom({ onFallback }));
    await act(async () => { await result.current.startFriendRoom("auction"); });
    expect(createLobby).toHaveBeenCalledWith({ mode: "friendly", isPublic: false, gameMode: "auction" });
    expect(push).toHaveBeenCalledWith("/friend/room/ABC123?source=create");
    // The handoff is marked before navigating, so the room page waits for the pushed lobby state instead of joining by code.
    expect(beginLobbyHandoff).toHaveBeenCalledWith("ABC123");
    expect(calls).toEqual(["handoff", "push"]);
    expect(toast.dismiss).toHaveBeenCalledWith("t1");
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("falls back to the friend hub with the error when the room cannot be created", async () => {
    createLobby.mockResolvedValue({ ok: false, code: "ALREADY_IN_LOBBY", message: "You are already in a room", retryable: false, correlationId: "c" });
    const onFallback = vi.fn();
    const { result } = renderHook(() => useDirectFriendRoom({ onFallback }));
    await act(async () => { await result.current.startFriendRoom("football_grid"); });
    expect(push).not.toHaveBeenCalled();
    expect(beginLobbyHandoff).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("You are already in a room");
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it("guests get a principal first; without one the sign-in prompt opens and nothing is created", async () => {
    isGuest = true;
    ensureGuestPrincipal.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useDirectFriendRoom({ onFallback: vi.fn() }));
    await act(async () => { await result.current.startFriendRoom("auction"); });
    expect(ensureGuestPrincipal).toHaveBeenCalledWith("en");
    expect(openAuthPrompt).toHaveBeenCalled();
    expect(createLobby).not.toHaveBeenCalled();
    ensureGuestPrincipal.mockResolvedValueOnce({ kind: "guest" });
    createLobby.mockResolvedValue({ ok: true, lobbyId: "l2", inviteCode: "XYZ789", correlationId: "c" });
    await act(async () => { await result.current.startFriendRoom("auction"); });
    expect(push).toHaveBeenCalledWith("/friend/room/XYZ789?source=create");
  });

  it("ignores a press while a lobby command is already in flight", async () => {
    isBusy = true;
    const { result } = renderHook(() => useDirectFriendRoom({ onFallback: vi.fn() }));
    await act(async () => { await result.current.startFriendRoom("auction"); });
    expect(createLobby).not.toHaveBeenCalled();
  });
});
