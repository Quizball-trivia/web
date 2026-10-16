import { describe, expect, it } from "vitest";
import { footballRaceRoomRules, toServerDraft, toServerRaceView, toServerWording, type FootballRaceServerView } from "../race.server";

const pick = (seat: number, stat: string, leaders: number[]) => ({ seat, stat, auto: false, values: [3, 1], leaders, details: ["vs Atlantis", null] });

function view(over: Partial<FootballRaceServerView> = {}): FootballRaceServerView {
  return {
    phase: "pick", cancelled: false, format: "duel", round: 2, target: 5,
    tournament: { id: "TT", label: "Test Cup" }, source: "Invented data", cutoff: "2026-01-01",
    eras: [{ id: "all", label: "All time" }], families: [{ id: "goals", label: "Goals" }],
    metrics: [{ id: "wins", family: "goals", unwanted: false, dir: "high", decimals: 0, kind: "count", label: "Wins", keywords: "won" }],
    stats: [{ id: "s1", scope: "all", metric: "wins", family: "goals", unwanted: false }],
    nations: [{ id: "AAA", code: "AAA", flag: "xa", name: "Atlantis" }, { id: "BBB", code: "BBB", flag: "xb", name: "Borduria" }],
    draft: { order: [1, 0], turn: null, picks: ["AAA", "BBB"], auto: [false, true] },
    seats: [
      { seat: 0, status: "in", nation: "AAA", position: 2, picked: true, quit: false },
      { seat: 1, status: "in", nation: "BBB", position: 1, picked: false, quit: false },
    ],
    mySeat: 0, myPick: "s1", history: [pick(0, "s1", [0]), pick(1, "s1", [0])], reveal: null, finale: null,
    standings: null, winners: null, endedBy: null, deadline: "2026-10-15T12:00:30.000Z",
    ...over,
  };
}
const people = [{ name: "Ana", avatar: {} as never }, { name: "Ben", avatar: {} as never }];

describe("server view adapter", () => {
  it("shows the server's labels in any locale and maps seats to their nations", () => {
    const race = toServerRaceView(view(), people);
    expect(race.seats.map((s) => [s.name, s.nation.id, s.position])).toEqual([["Ana", "AAA", 2], ["Ben", "BBB", 1]]);
    expect(race.history[0]).toMatchObject({ statId: "s1", leaders: [0], details: [{ en: "vs Atlantis", es: "vs Atlantis" }, null] });
    const wording = toServerWording(view());
    expect(wording.metrics[0].label).toEqual({ en: "Wins", es: "Wins" });
    expect(wording.tournaments?.[0].scopes).toEqual(["all"]);
  });

  it("an away seat and a seat that left are marked on the track", () => {
    const seats = view().seats.map((s) => ({ ...s, status: s.seat === 0 ? ("away" as const) : ("withdrawn" as const) }));
    expect(toServerRaceView(view({ seats }), people).seats.map((s) => s.status)).toEqual(["away", "left"]);
    expect(toServerRaceView(view(), people).seats.map((s) => s.status)).toEqual([undefined, undefined]);
  });

  it("the draft screen reads the server's draft; a nation not drafted yet is a placeholder", () => {
    const v = view({ phase: "draft", draft: { order: [1, 0], turn: 1, picks: [null, "BBB"], auto: [false, false] }, seats: view().seats.map((s) => ({ ...s, nation: s.seat === 1 ? "BBB" : null })) });
    expect(toServerDraft(v, 0)).toMatchObject({ turn: 1, done: false, picks: [null, "BBB"] });
    expect(toServerRaceView(v, people).seats[0].nation.id).toBe("?");
    expect(toServerDraft(view(), 0).done).toBe(true);
  });

  it("standings take good calls from the server and count the rest of the seat's own picks as backfires", () => {
    const race = toServerRaceView(view({ phase: "over", standings: [{ seat: 0, points: 5, roundWins: 1, place: 1 }, { seat: 1, points: 1, roundWins: 0, place: 2 }], winners: [0], endedBy: "left" }), people);
    expect(race.standings).toEqual([{ seat: 0, place: 1, position: 5, goodCalls: 1, backfires: 0 }, { seat: 1, place: 2, position: 1, goodCalls: 0, backfires: 1 }]);
    expect(race.endedBy).toBe("left");
  });
});

describe("command rules", () => {
  const { slot, settled } = footballRaceRoomRules;
  it("a draft pick is one per turn, a stat pick one per round", () => {
    expect(slot({ type: "draft", turn: 1, nation: "AAA" })).toBe("d:1");
    expect(slot({ type: "pick", round: 2, stat: "s1" })).toBe("p:2");
  });
  it("a draft pick settles once the turn moves on or the draft ends", () => {
    const drafting = view({ phase: "draft", draft: { order: [0, 1], turn: 0, picks: [null, null], auto: [false, false] } });
    expect(settled(drafting, { type: "draft", turn: 0, nation: "AAA" })).toBe(false);
    expect(settled({ ...drafting, draft: { ...drafting.draft, turn: 1 } }, { type: "draft", turn: 0, nation: "AAA" })).toBe(true);
    expect(settled(view({ phase: "intro" }), { type: "draft", turn: 0, nation: "AAA" })).toBe(true);
  });
  it("a stat pick settles when the server shows it as mine, or the round is over", () => {
    expect(settled(view({ myPick: null }), { type: "pick", round: 2, stat: "s1" })).toBe(false);
    expect(settled(view(), { type: "pick", round: 2, stat: "s1" })).toBe(true);
    expect(settled(view({ phase: "reveal", myPick: null }), { type: "pick", round: 2, stat: "s1" })).toBe(true);
    expect(settled(view({ round: 3, myPick: null }), { type: "pick", round: 2, stat: "s1" })).toBe(true);
  });
});
