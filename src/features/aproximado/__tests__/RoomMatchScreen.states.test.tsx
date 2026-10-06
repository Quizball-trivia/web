import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";

const room = vi.hoisted(() => ({ snapshot: null as unknown, error: null as string | null, fatal: null as string | null, resync: vi.fn(), leave: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "es", t: (k: string) => k }) }));
vi.mock("@/lib/realtime/realtime-principal", () => ({ useRealtimePrincipal: () => ({ kind: "guest", userId: "u1" }) }));
vi.mock("@/components/AvatarDisplay", () => ({ AvatarDisplay: () => <span /> }));
vi.mock("../useRoom", () => ({
  useRoom: () => ({
    snapshot: room.snapshot, error: room.error, fatal: room.fatal, clearError: vi.fn(), connected: true, inFlight: 0, retained: null,
    guess: vi.fn(), leave: room.leave, nowMs: () => Date.now(), principal: { kind: "guest", userId: "u1" }, guestStatus: "idle", resync: room.resync,
  }),
}));

import { RoomMatchScreen } from "../RoomMatchScreen";

const snap = (status: RoomStatePayload["status"], me: Partial<RoomStatePayload["me"]>, view: unknown = null): RoomStatePayload => ({
  matchId: "m1", lobbyId: "l1", game: "aproximado", stateVersion: 4, status, phaseToken: 1, phaseDeadlineAt: null, serverNow: new Date().toISOString(),
  me: { userId: "u1", admitted: true, active: true, left: false, seat: 0, slot: 0, ready: true, ...me },
  seats: [{ seat: 0, slot: 0, userId: "u1", username: "Yo", avatarUrl: null, avatarCustomization: null, isGuest: true, ready: true, connected: true, admitted: true, active: true }],
  view, result: null,
});

describe("RoomMatchScreen states", () => {
  beforeEach(() => { room.error = null; room.fatal = null; });

  it.each([
    ["a finished match whose questions were purged", snap("completed", { active: false }), /Partida terminada/],
    ["a player who left at the gate, after the others started", snap("active", { admitted: false, active: false, left: true, seat: null }), /Saliste de la partida/],
    ["a player left out at the gate", snap("active", { admitted: false, active: false, left: false, seat: null }), /arrancó sin vos/],
    ["a player who left the gate while it is still open", snap("ready", { admitted: false, active: false, left: true, seat: null }), /Saliste de la partida/],
    ["a cancelled match", snap("cancelled", {}), /Partida cancelada/],
  ])("%s", (_label, snapshot, text) => {
    room.snapshot = snapshot;
    render(<RoomMatchScreen matchId="m1" />);
    expect(screen.getByText(text)).toBeTruthy();
  });

  it("the gate lists who has joined and shows a refused leave", () => {
    room.snapshot = snap("ready", { admitted: false, ready: true, seat: null });
    room.error = "rate_limited";
    render(<RoomMatchScreen matchId="m1" />);
    expect(screen.getByText(/Esperando a que todos entren/)).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(/Demasiado rápido/);
  });

  it("an unconfirmed gate leave asks for the state, then frees the button", () => {
    vi.useFakeTimers();
    room.snapshot = snap("ready", { admitted: false, ready: true, seat: null });
    render(<RoomMatchScreen matchId="m1" />);
    fireEvent.click(screen.getByRole("button", { name: /^Salir$/ }));
    expect(room.leave).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { busy: true })).toBeTruthy();
    act(() => { vi.advanceTimersByTime(2_100); });
    expect(room.resync).toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(3_000); });
    expect(screen.getByRole("button", { name: /^Salir$/ })).toBeTruthy();
    vi.useRealTimers();
  });

  it("a match that became unavailable after it was on screen says so instead of leaving the old board up", () => {
    room.snapshot = snap("active", {}, { phase: "guess", round: 0, totalRounds: 10, scoring: "closest", mySeat: 0, myGuess: null, reveal: null, results: [], standings: null, deadline: null, question: { id: "q", kind: "goals", prompt: "Goles?", unit: "goles", precision: 0 }, seats: [{ seat: 0, status: "in", answered: false, idle: false, score: 0 }] });
    room.fatal = "room_not_found";
    render(<RoomMatchScreen matchId="m1" />);
    expect(screen.getByRole("alert").textContent).toMatch(/no existe o ya terminó/);
    expect(screen.queryByText(/Goles\?/)).toBeNull();
  });
});
