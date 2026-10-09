import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";

const connection = vi.hoisted(() => ({ calls: [] as unknown[][], snapshot: null as unknown, principal: { kind: "guest", userId: "u1" } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "es", t: (k: string) => k }) }));
vi.mock("@/lib/realtime/realtime-principal", () => ({ useRealtimePrincipal: () => connection.principal }));
vi.mock("@/components/AvatarDisplay", () => ({ AvatarDisplay: () => <span /> }));
vi.mock("../useRoomConnection", () => ({
  useRoomConnection: (...args: unknown[]) => {
    connection.calls.push(args);
    return {
      snapshot: connection.snapshot, error: null, fatal: null, clearError: vi.fn(), connected: true, inFlight: 0, retained: null, send: vi.fn(), leave: vi.fn(),
      nowMs: () => Date.now(), principal: connection.principal, guestStatus: "idle", resync: vi.fn(),
    };
  },
}));

import { aproximadoCopy } from "@/features/aproximado/aproximado.copy";
import { RoomScreen } from "../RoomScreen";

const snapshot = (game: string): RoomStatePayload => ({
  matchId: "m1", lobbyId: "l1", game: game as RoomStatePayload["game"], stateVersion: 1, status: "ready", phaseToken: 1, phaseDeadlineAt: new Date(Date.now() + 20_000).toISOString(),
  serverNow: new Date().toISOString(), me: { userId: "u1", admitted: false, active: true, seat: null, slot: 0, ready: false },
  seats: [{ seat: null, slot: 0, userId: "u1", username: "Ana", avatarUrl: null, avatarCustomization: null, isGuest: true, ready: false, connected: true, admitted: false, active: true }],
  view: null, result: null,
});
const copy = aproximadoCopy("es");

describe("RoomScreen (the /sala route)", () => {
  beforeEach(() => { connection.calls = []; connection.snapshot = null; });

  it("holds one connection for the match and lists the games this build draws", () => {
    render(<RoomScreen matchId="m1" />);
    expect(connection.calls.length).toBeGreaterThan(0);
    expect(connection.calls.every(([matchId, games]) => matchId === "m1" && (games as string[]).includes("aproximado"))).toBe(true);
  });

  it("shows the connecting screen before the first state, then the Aproximado gate", () => {
    const { rerender } = render(<RoomScreen matchId="m1" />);
    expect(screen.getByText(copy.connecting)).toBeTruthy();
    connection.snapshot = snapshot("aproximado");
    rerender(<RoomScreen matchId="m1" />);
    expect(screen.getByText(copy.gateTitle)).toBeTruthy();
  });

  it("a game newer than this tab gets a reload prompt, never another game's board", () => {
    connection.snapshot = snapshot("a_newer_game");
    render(<RoomScreen matchId="m1" />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByText(copy.gateTitle)).toBeNull();
  });
});
