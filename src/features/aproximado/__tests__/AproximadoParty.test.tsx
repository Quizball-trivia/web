import { render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AproximadoRoomView } from "../aproximado.views";

vi.mock("@/components/AvatarDisplay", () => ({ AvatarDisplay: () => <span /> }));
vi.mock("@/features/duel/DuelAvatar", () => ({ DuelAvatar: () => <span /> }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "es", t: (k: string) => k }) }));
vi.mock("@/components/layout/app-shell/AppShellPageChrome", () => ({ AppShellPageChrome: () => null }));

import { AproximadoPartyResults, toPartyStandings, useRoomScoreFlights } from "../AproximadoParty";
import { aproximadoCopy, formatValue } from "../aproximado.copy";
import { Chalkboard } from "../AproximadoRoom";

const seat = (n: number, score: number, extra: Partial<AproximadoRoomView["seats"][number]> = {}) => ({
  seat: n, name: `P${n}`, avatar: { base: "x" }, status: "in" as const, answered: false, idle: false, score, ...extra,
});
const view = (o: Partial<AproximadoRoomView>): AproximadoRoomView => ({
  phase: "guess", round: 2, totalRounds: 10, scoring: "podium", question: { id: "q", kind: "goals", prompt: "?", unit: "goles", precision: 0 },
  seats: [seat(0, 4), seat(1, 6, { answered: true }), seat(2, 4, { status: "away" }), seat(3, 0, { status: "withdrawn" })],
  mySeat: 0, myGuess: null, reveal: null, results: [], standings: null, ...o,
});

describe("Stat Sniper rooms on the Party Quiz pieces", () => {
  it("standings: shared ranks by points, away/left greyed as dropped, this round's points only in the reveal", () => {
    const rows = toPartyStandings(view({}));
    expect(rows.map((r) => [r.username, r.rank, r.status, r.isSelf, r.isLeader])).toEqual([
      ["P1", 1, "active", false, true], ["P0", 2, "active", true, false], ["P2", 2, "dropped", false, false], ["P3", 4, "dropped", false, false],
    ]);
    expect(rows.every((r) => r.roundDelta === null)).toBe(true);
    const reveal = toPartyStandings(view({ phase: "reveal", reveal: { value: 10, winners: [1], entries: [0, 1, 2, 3].map((s) => ({ seat: s, guess: 1, diff: 1, rank: 1, points: s === 1 ? 3 : 0, exact: false })) } }));
    expect(reveal.find((r) => r.username === "P1")!.roundDelta).toBe(3);
    expect(reveal.every((r) => r.answered)).toBe(true);
  });

  it("while the score flights are in the air, totals and ranks hold the score before this round", () => {
    const v = view({ phase: "reveal", reveal: { value: 10, winners: [0], entries: [0, 1, 2, 3].map((s) => ({ seat: s, guess: 1, diff: 1, rank: 1, points: s === 0 ? 3 : 0, exact: false })) } });
    const held = toPartyStandings(v, true);
    expect(held.find((r) => r.username === "P0")).toMatchObject({ totalPoints: 1, rank: 3, roundDelta: null });
    const landed = toPartyStandings(v, false);
    expect(landed.find((r) => r.username === "P0")).toMatchObject({ totalPoints: 4, rank: 2, roundDelta: 3 });
  });

  it("results: our headline and places, rounds won as the stat, no XP row", () => {
    render(<AproximadoPartyResults locale="es" onRoom={vi.fn()} onExit={vi.fn()} view={view({
      phase: "over",
      standings: [
        { seat: 0, points: 9, roundWins: 4, totalError: 1, answered: 10, place: 1 },
        { seat: 1, points: 9, roundWins: 4, totalError: 1, answered: 10, place: 1 },
        { seat: 2, points: 3, roundWins: 1, totalError: 2, answered: 9, place: 3 },
        { seat: 3, points: 5, roundWins: 1, totalError: 4, answered: 3, place: 4 },
      ],
    })} />);
    expect(screen.getByText("¡Empate en el primer puesto!")).toBeTruthy();
    expect(screen.getByText("Rondas ganadas")).toBeTruthy();
    // Each player's rounds won and average error (view.results is empty here: averaged over 1).
    expect(screen.getAllByText("4 rondas ganadas · error medio 100%").length).toBe(2);
    expect(screen.getByText("1 ronda ganada · error medio 200%")).toBeTruthy();
    expect(screen.queryByText("results.xp")).toBeNull();
    expect(screen.queryByText("results.noXpEarned")).toBeNull();
    expect(screen.getByText(/P3 · Se fue/)).toBeTruthy();
  });

  it("a player who left ranks below everyone still playing and never leads, even with more points", () => {
    const rows = toPartyStandings(view({ seats: [seat(0, 3), seat(1, 2), seat(2, 10, { status: "withdrawn" })] }));
    expect(rows.map((r) => [r.username, r.rank, r.isLeader])).toEqual([["P0", 1, true], ["P1", 2, false], ["P2", 3, false]]);
  });

  it("dropped rows say why: away is 'Desconectado' (temporary), withdrawn is 'Se fue'", () => {
    const rows = toPartyStandings(view({ seats: [seat(0, 3), seat(1, 2, { status: "away" }), seat(2, 1, { status: "withdrawn" })] }), false, { away: "Desconectado", withdrawn: "Se fue" });
    expect(rows.map((r) => [r.username, r.status, r.statusLabel])).toEqual([["P0", "active", undefined], ["P1", "dropped", "Desconectado"], ["P2", "dropped", "Se fue"]]);
  });

  it("results: a tie that does not fit on the podium is never split; leavers stay off the podium", () => {
    const sixWay = [0, 1, 2, 3, 4, 5].map((n) => ({ seat: n, points: 5, roundWins: 1, totalError: 1, answered: 10, place: 1 }));
    const { unmount } = render(<AproximadoPartyResults locale="es" onRoom={vi.fn()} onExit={vi.fn()}
      view={view({ phase: "over", seats: [0, 1, 2, 3, 4, 5].map((n) => seat(n, 5)), standings: sixWay })} />);
    expect(document.querySelectorAll('[data-testid^="party-podium-block-"]').length).toBe(0);
    unmount();
    render(<AproximadoPartyResults locale="es" onRoom={vi.fn()} onExit={vi.fn()} view={view({
      phase: "over",
      seats: [seat(0, 9), seat(1, 6), seat(2, 9, { status: "withdrawn" })],
      standings: [
        { seat: 0, points: 9, roundWins: 3, totalError: 1, answered: 10, place: 1 },
        { seat: 1, points: 6, roundWins: 2, totalError: 2, answered: 10, place: 2 },
        { seat: 2, points: 9, roundWins: 3, totalError: 1, answered: 4, place: 3 },
      ],
    })} />);
    expect(document.querySelectorAll('[data-testid^="party-podium-block-"]').length).toBe(2);
    expect(screen.getByText(/P2 · Se fue/)).toBeTruthy();
  });

  it("reduced motion: no hold, the totals move with the chalkboard at once", () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    try {
      const v = view({ phase: "reveal", reveal: { value: 10, winners: [0], entries: [0, 1, 2, 3].map((s) => ({ seat: s, guess: 1, diff: 1, rank: 1, points: s === 0 ? 3 : 0, exact: false })) } });
      const { result } = renderHook(() => useRoomScoreFlights(v, true));
      expect(result.current).toEqual({ flights: [], holding: false });
    } finally { window.matchMedia = original; }
  });

  it("units take the singular after exactly 1 (es/en); ka and tr are already singular", () => {
    expect(formatValue(1, "goles", 0, "es")).toBe("1 gol");
    expect(formatValue(2, "goles", 0, "es")).toBe("2 goles");
    expect(formatValue(1, "games", 0, "en")).toBe("1 game");
    expect(formatValue(1, "M€", 0, "es")).toBe("1 M€");
    expect(formatValue(1, "გოლი", 0, "ka")).toBe("1 გოლი");
  });

  it("review 2026-10-06 W9: every unit the pools use takes its singular after 1 ('1 año', '1 year', '1 fan', '1 socio', '1 member')", () => {
    expect(formatValue(1, "años", 0, "es")).toBe("1 año");
    expect(formatValue(1, "years", 0, "en")).toBe("1 year");
    expect(formatValue(1, "fans", 0, "en")).toBe("1 fan");
    expect(formatValue(1, "socios", 0, "es")).toBe("1 socio");
    expect(formatValue(1, "members", 0, "en")).toBe("1 member");
    expect(formatValue(1, "spectators", 0, "en")).toBe("1 spectator");
    expect(formatValue(1, "cm", 0, "es")).toBe("1 cm");
    expect(formatValue(2, "años", 0, "es")).toBe("2 años");
  });

  it("reveal: your own round win reads in the second person (es: '¡Te llevaste la ronda!'), a rival's by name", () => {
    const v = view({});
    const result = (winner: number) => ({ value: 10, winners: [winner], entries: [0, 1].map((s) => ({ seat: s, guess: s === winner ? 10 : 9, diff: s === winner ? 0 : 1, rank: s === winner ? 1 : 2, points: s === winner ? 2 : 0, exact: s === winner })) });
    const { unmount } = render(<Chalkboard result={result(0)} question={v.question} seats={v.seats} mySeat={0} copy={aproximadoCopy("es")} locale="es" />);
    expect(screen.getByText("¡Te llevaste la ronda!")).toBeTruthy();
    unmount();
    render(<Chalkboard result={result(1)} question={v.question} seats={v.seats} mySeat={0} copy={aproximadoCopy("es")} locale="es" />);
    expect(screen.getByText("P1 se llevó la ronda")).toBeTruthy();
    expect(screen.getByText("a 1 gol")).toBeTruthy();
  });
});
