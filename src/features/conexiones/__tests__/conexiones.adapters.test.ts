import { describe, expect, it } from "vitest";
import { boardOf, toSoloState, withArrangement, type ConexionesDailyState } from "../conexiones.daily";
import { conexionesRoomRules, toDuelState, type ConexionesServerView } from "../conexiones.server";
import { conexionesCopy } from "../conexiones.copy";
import { shareGrid, soloFound } from "../conexiones.logic";

// Invented players and links only.
const tiles = Array.from({ length: 16 }, (_, i) => ({ id: `tile${String(i).padStart(4, "0")}`, name: `Invented ${i}`, portrait: null }));
const L = (s: string) => ({ en: s, es: `${s} (es)`, ka: s, tr: s, ru: s });

const view = (over: Partial<ConexionesServerView> = {}): ConexionesServerView => ({
  phase: "turn", board: 1, totalBoards: 5, n: 3, turn: 1, mySeat: 0, tiles,
  out: [{ id: "g1", tier: 1, link: "Link one", note: null, members: tiles.slice(0, 4).map((t) => t.id), by: 0 }],
  tries: [{ seat: 0, ids: tiles.slice(0, 4).map((t) => t.id), verdict: "right" }, { seat: 1, ids: [tiles[4].id, tiles[5].id, tiles[8].id, tiles[9].id], verdict: "oneAway" }, { seat: 0, ids: null, verdict: "timeout" }],
  missesLeft: 4, options: null, named: null, scores: [3, 2], points: [[2, 2], [1, 0]],
  seats: [{ seat: 0, status: "in", timeouts: 1 }, { seat: 1, status: "away", timeouts: 0 }],
  result: null, standings: null, deadline: "2026-11-01T12:00:00.000Z", ...over,
});

describe("conexiones room adapter", () => {
  it("draws only this board's tiles and the groups already out", () => {
    const s = toDuelState(view());
    expect(s.boards).toHaveLength(5);
    expect(s.boards[1].tiles).toHaveLength(16);
    expect(s.boards[0].tiles).toHaveLength(0);
    expect(s.order).toHaveLength(12);
    expect(s.solved).toEqual([expect.objectContaining({ groupId: "g1", by: 0, missed: false })]);
    expect(s.misses).toBe(2);
    expect(s.tries[2]).toEqual({ seat: 0, ids: [], verdict: "timeout" });
    expect(s.last).toEqual({ seat: 0, kind: "timeout", ids: undefined, groupId: undefined });
  });

  it("the naming: options as given, the pick and its verdict after it", () => {
    const named = toDuelState(view({ phase: "reveal", options: ["A", "B", "C", "D"], named: { seat: 1, pick: 2, right: false, answer: 0 },
      out: [...view().out, { id: "g4", tier: 4, link: "Link four", note: null, members: tiles.slice(12).map((t) => t.id), by: null }] }));
    expect(named.nameOptions?.map((o) => o.en)).toEqual(["A", "B", "C", "D"]);
    expect(named.namePick).toBe("C");
    expect(named.last).toMatchObject({ seat: 1, kind: "misnamed", groupId: "g4" });
  });

  it("a left match reads as a forfeit; the intro has no board sheet", () => {
    expect(toDuelState(view({ phase: "over", result: { winner: 1, reason: "left" } })).result).toEqual({ winner: 1, reason: "forfeit" });
    expect(toDuelState(view({ phase: "intro", tiles: [], out: [], tries: [] })).phase).toBe("reveal");
  });

  it("a move is settled once its board or move number moved on", () => {
    const cmd = { type: "try" as const, board: 1, n: 3, ids: [] };
    expect(conexionesRoomRules.settled(view(), cmd)).toBe(false);
    expect(conexionesRoomRules.settled(view({ n: 4 }), cmd)).toBe(true);
    expect(conexionesRoomRules.settled(view({ board: 2, n: 3 }), cmd)).toBe(true);
    expect(conexionesRoomRules.settled(view({ phase: "reveal" }), cmd)).toBe(true);
    expect(conexionesRoomRules.slot(cmd)).toBe("1:3");
  });
});

describe("conexiones daily adapter", () => {
  const run = (over: Partial<ConexionesDailyState> = {}): ConexionesDailyState => ({
    day: "2026-11-01", open: false, deadline: null, serverNow: "2026-11-01T12:00:00.000Z", done: false, score: 0, ranked: true,
    opened: true, tiles: tiles.map((t) => ({ id: t.id, name: { en: t.name, ka: `ka ${t.name}`, ru: `ru ${t.name}` }, portrait: null })),
    groups: [{ id: "g1", tier: 2, link: L("Link one"), note: null, members: tiles.slice(0, 4).map((t) => t.id), missed: false }],
    mistakes: 1, mistakesLeft: 3, tries: [{ ids: tiles.slice(0, 4).map((t) => t.id), verdict: "right" }], tiers: null,
    startedAt: "2026-11-01T11:58:00.000Z", won: false, found: 1, secs: 0, disclosed: false, ...over,
  });

  it("the tiles still on the board, the bands found, the board's names in every script", () => {
    const s = toSoloState(run(), "es");
    expect(s.order).toHaveLength(12);
    expect(s.solved[0]).toMatchObject({ groupId: "g1", tier: 2, missed: false });
    expect(s.status).toBe("playing");
    expect(boardOf(run()).tiles[3]).toMatchObject({ name: "Invented 3", nameKa: "ka Invented 3", nameRu: "ru Invented 3" });
  });

  it("a finished run whose day was corrected keeps its count without the groups", () => {
    const s = toSoloState(run({ done: true, won: true, found: 4, groups: [] }), "en");
    expect(soloFound(s)).toBe(4);
  });

  it("the share text puts the grid on its own line", () => {
    for (const locale of ["en", "es", "pt", "tr", "ru", "ka", "de"]) expect(conexionesCopy(locale).shareText(3, 4, "🟨")).toMatch(/\/4\n🟨$/);
  });

  it("a finished run: no tiles left, the tiers of every try, the time from the seconds", () => {
    const s = toSoloState(run({ done: true, won: true, secs: 95, tiers: [[2, 2, 2, 2]] }), "en");
    expect(s.order).toEqual([]);
    expect(s.status).toBe("won");
    expect(s.tries[0].tiers).toEqual([2, 2, 2, 2]);
    expect((s.endedAt ?? 0) - s.startedAt).toBe(95_000);
  });

  it("a lost run on an open day: the missed groups come at the close, their tiles grey in the grid", () => {
    const tries = [{ ids: tiles.slice(0, 4).map((t) => t.id), verdict: "right" as const }, { ids: [4, 1, 8, 12].map((i) => tiles[i].id), verdict: "wrong" as const }];
    const lost = run({ done: true, won: false, mistakes: 4, tries, tiers: [[2, 2, 2, 2], [null, 2, null, null]] });
    const s = toSoloState(lost, "en");
    expect(s.groupsLater).toBe(true);
    expect(shareGrid(s)).toBe("🟧🟧🟧🟧\n⬜🟧⬜⬜");
    expect(toSoloState({ ...lost, disclosed: true }, "en").groupsLater).toBe(false);
    expect(toSoloState(run({ done: true, won: true }), "en").groupsLater).toBe(false);
    expect(toSoloState({ ...lost, tiles: [], groups: [], tiers: null }, "en").groupsLater).toBe(false);
    for (const locale of ["en", "es", "pt", "tr", "ru", "ka", "de"]) expect(conexionesCopy(locale).groupsLater.length).toBeGreaterThan(20);
  });
});

describe("the player's own tile order", () => {
  const onBoard = ["a", "b", "c", "d"];
  it("keeps each tile on the board exactly once, whatever the stored order holds", () => {
    expect(withArrangement(onBoard, ["c", "a", "c", "zz", "b"])).toEqual(["c", "a", "b", "d"]);
    expect(withArrangement(onBoard, [])).toEqual(onBoard);
    expect(withArrangement(onBoard, null)).toEqual(onBoard);
  });
});

describe("the points line", () => {
  it("spells out how a run's points were counted", () => {
    expect(conexionesCopy("en").pointsLine(7, true, 3)).toBe("7 points: 4 groups + 3 mistakes left");
    expect(conexionesCopy("en").pointsLine(1, false, 0)).toBe("1 point: 1 per group found");
    for (const locale of ["es", "pt", "tr", "ru", "ka", "de"]) expect(conexionesCopy(locale).pointsLine(8, true, 4)).toMatch(/8/);
  });
});
