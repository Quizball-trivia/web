import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import { toRoomView } from "../RoomMatchScreen";
import { GuessInput } from "../AproximadoRoom";
import { aproximadoCopy } from "../aproximado.copy";

const seat = (s: number | null, slot: number, name: string, extra: Partial<RoomStatePayload["seats"][number]> = {}) => ({
  seat: s, slot, userId: `u${slot}`, username: name, avatarUrl: null, avatarCustomization: null, isGuest: false,
  ready: true, connected: true, admitted: s !== null, active: true, ...extra,
});

const snapshot = (view: unknown, seats = [seat(0, 0, "Ana"), seat(null, 1, "Out", { admitted: false, active: false }), seat(1, 2, "Bea")]): RoomStatePayload => ({
  matchId: "m", lobbyId: "l", game: "aproximado", stateVersion: 3, status: "active", phaseToken: 2, phaseDeadlineAt: null,
  serverNow: new Date().toISOString(), me: { userId: "u0", admitted: true, active: true, seat: 0, slot: 0, ready: true }, seats, view, result: null,
});

describe("toRoomView", () => {
  it("is null before the match view exists (gate, excluded viewer)", () => {
    expect(toRoomView(snapshot(null))).toBeNull();
  });

  it("names each admitted seat from the envelope by seat, not by join slot", () => {
    const v = toRoomView(snapshot({
      phase: "guess", round: 0, totalRounds: 10, scoring: "closest", mySeat: 0, myGuess: null, reveal: null, results: [], standings: null,
      question: { id: "q", kind: "goals", prompt: "Goles?", unit: "goles", precision: 0 }, deadline: null,
      seats: [{ seat: 0, status: "in", answered: false, idle: false, score: 0 }, { seat: 1, status: "away", answered: false, idle: false, score: 2 }],
    }))!;
    expect(v.seats.map((s) => [s.seat, s.name, s.status, s.score])).toEqual([[0, "Ana", "in", 0], [1, "Bea", "away", 2]]);
    expect(v.seats.every((s) => s.avatar)).toBe(true);
  });
});

describe("GuessInput retry", () => {
  const question = { id: "q", kind: "fee" as const, prompt: "Traspaso?", unit: "M€", precision: 0 };

  it("holds exactly the unanswered guess, says it will send that number, and sends it as-is", () => {
    const onSubmit = vi.fn();
    render(<GuessInput question={question} copy={aproximadoCopy("es")} locale="es" busy={false} onSubmit={onSubmit} retry={40} autoFocus={false} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("40");
    expect(input.readOnly).toBe(true);
    expect(screen.getByText(/Vas a mandar 40/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onSubmit).toHaveBeenCalledWith(40);
  });
});
