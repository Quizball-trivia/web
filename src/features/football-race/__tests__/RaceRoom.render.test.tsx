import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RaceBoard, RaceResults } from "../RaceRoom";
import { toServerRaceView, toServerWording, type FootballRaceServerView } from "../race.server";

// INVENTED nations and numbers (public repo).
const pick = (seat: number, stat: string, leaders: number[]) => ({ seat, stat, auto: false, values: [3, 3, 1], leaders, details: [null, null, null] });
function serverView(over: Partial<FootballRaceServerView> = {}): FootballRaceServerView {
  return {
    phase: "pick", cancelled: false, format: "party", round: 1, target: 5,
    tournament: { id: "TT", label: "Test Cup" }, source: "Invented data", cutoff: "2026-01-01",
    eras: [{ id: "all", label: "All time" }, { id: "new", label: "Since 2000" }],
    families: [{ id: "results", label: "Results" }, { id: "goals", label: "Goals" }],
    metrics: [
      { id: "wins", family: "results", unwanted: false, dir: "high", decimals: 0, kind: "count", label: "Most wins", keywords: "" },
      { id: "goals", family: "goals", unwanted: false, dir: "high", decimals: 0, kind: "count", label: "Most goals", keywords: "" },
    ],
    stats: [
      { id: "s1", scope: "all", metric: "wins", family: "results", unwanted: false },
      { id: "s2", scope: "new", metric: "goals", family: "goals", unwanted: false },
    ],
    nations: [{ id: "AAA", code: "AAA", flag: "xa", name: "Atlantis" }, { id: "BBB", code: "BBB", flag: "xb", name: "Borduria" }, { id: "CCC", code: "CCC", flag: "xc", name: "Carpania" }],
    draft: { order: [0, 1, 2], turn: null, picks: ["AAA", "BBB", "CCC"], auto: [false, false, false] },
    seats: [0, 1, 2].map((seat) => ({ seat, status: "in" as const, nation: ["AAA", "BBB", "CCC"][seat], position: 1, picked: false, quit: false })),
    mySeat: 0, myPick: null, history: [], reveal: null, finale: null, standings: null, winners: null, endedBy: null, deadline: null,
    ...over,
  };
}
const people = [0, 1, 2].map((i) => ({ name: `P${i}`, avatar: {} as never }));
const board = (v: FootballRaceServerView) => render(<RaceBoard view={toServerRaceView(v, people)} wording={toServerWording(v)} locale="en" secondsLeft={20} busy={false} onPick={() => {}} />);

describe("race board", () => {
  it("a pick the server holds stays locked in even when its stat is no longer listed", () => {
    board(serverView({ myPick: "gone" }));
    expect(screen.getByText("Your pick")).toBeTruthy();
    expect(screen.queryByPlaceholderText(/Type: penalties/)).toBeNull();
  });

  it("a reveal that moves nobody says so", () => {
    const item = { ...pick(1, "s1", []), values: [2, 2, 2] };
    board(serverView({ phase: "reveal", history: [item], reveal: { item, index: 0, total: 1, open: true } }));
    expect(screen.getByText(/Nobody moves/)).toBeTruthy();
    expect(screen.queryByText(/undefined/)).toBeNull();
  });

  it("waits only for players still in the race", () => {
    const seats = serverView().seats.map((s) => ({ ...s, picked: s.seat === 0, status: s.seat === 2 ? ("withdrawn" as const) : ("in" as const) }));
    board(serverView({ myPick: "s1", seats }));
    expect(screen.getByText("Waiting for 1 player…")).toBeTruthy();
  });

  it("a category that disappears falls back to Ideas, keeping the tabs reachable", () => {
    const v = serverView();
    const { rerender } = board(v);
    fireEvent.click(screen.getByRole("tab", { name: /Results/i }));
    // The results stat is gone (a nation left): the tab list must still have one Tab stop, on Ideas.
    const next = { ...v, stats: v.stats.filter((s) => s.family !== "results") };
    rerender(<RaceBoard view={toServerRaceView(next, people)} wording={toServerWording(next)} locale="en" secondsLeft={20} busy={false} onPick={() => {}} />);
    const reachable = screen.getAllByRole("tab").filter((t) => t.tabIndex === 0);
    expect(reachable).toHaveLength(1);
    expect(reachable[0].getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(reachable[0].id);
  });

  it("arrow keys move through the eras and the categories", () => {
    board(serverView());
    const eras = screen.getAllByRole("radio");
    eras[0].focus();
    fireEvent.keyDown(eras[0], { key: "ArrowRight" });
    expect(screen.getAllByRole("radio")[1].getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(screen.getAllByRole("radio")[1]);
    const tabs = screen.getAllByRole("tab");
    const selected = tabs.find((t) => t.getAttribute("aria-selected") === "true")!;
    selected.focus();
    fireEvent.keyDown(selected, { key: "End" });
    const last = screen.getAllByRole("tab").filter((t) => !(t as HTMLButtonElement).disabled).at(-1)!;
    expect(last.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(last.id);
  });

  it("a race that runs out says the furthest nation won, not that it reached the line", () => {
    const over = (endedBy: FootballRaceServerView["endedBy"], points: number[]) => toServerRaceView(serverView({
      phase: "over", endedBy, winners: [0],
      standings: points.map((p, seat) => ({ seat, points: p, roundWins: 0, place: points.filter((q) => q > p).length + 1 })),
    }), people);
    const results = (v: ReturnType<typeof over>) => render(<RaceResults view={v} locale="en" onRoom={() => {}} onExit={() => {}} />);
    results(over("rounds", [3, 2, 1]));
    expect(screen.getByText("Furthest when the race ran out: you win!")).toBeTruthy();
    cleanup();
    results(over("stats", [3, 3, 1]));
    expect(screen.getByText("Level in front when the race ran out!")).toBeTruthy();
    cleanup();
    results(over("line", [5, 3, 1]));
    expect(screen.queryByText(/ran out/)).toBeNull();
  });
});
