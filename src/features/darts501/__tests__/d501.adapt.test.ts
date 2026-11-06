import { describe, expect, it } from "vitest";
import { toSoloState } from "../d501.adapt";
import { d501Places } from "../d501.view";
import type { D501ServerRun } from "../d501.api";

// Invented footballers only: the repository is public.
const run = (over: Partial<D501ServerRun> = {}): D501ServerRun => ({
  day: "2026-11-01", open: false, deadline: null, serverNow: "2026-11-01T12:00:00Z", done: false, score: 0, ranked: true,
  category: { id: "c", title: "Invented League apps", note: null, unit: "apps", asOf: "2024-25", release: "rel", kind: "player" },
  remaining: 321, maxDarts: 10, outs: null, end: null, finishes: null,
  darts: [{ name: "Aro Bandel", text: "bandel", verdict: "score", value: 180, before: 501, after: 321 }],
  last: { name: null, text: "Nobody", verdict: "unknown", value: null, before: 321, after: 321, n: 2 },
  ...over,
});

describe("toSoloState", () => {
  it("keeps the thrown darts and the latest answer, free ones included", () => {
    const s = toSoloState(run());
    expect(s.darts).toHaveLength(1);
    expect(s.darts[0]).toMatchObject({ name: "Aro Bandel", stat: 180, verdict: "score", after: 321 });
    expect(s.last).toMatchObject({ id: 2, verdict: "unknown", text: "Nobody" });
    expect(s.status).toBe("playing");
  });

  it("today's missed finishes stay a count; a closed day's are named", () => {
    const today = toSoloState(run({ done: true, end: "gaveUp", finishes: { count: 3, shown: null } }));
    expect(today.finishes).toBeUndefined();
    expect(today.finishesCount).toBe(3);
    const closed = toSoloState(run({ done: true, end: "gaveUp", finishes: { count: 1, shown: [{ name: "Ceto Darrin", value: 60 }] } }));
    expect(closed.finishes).toEqual([{ name: "Ceto Darrin", stat: 60 }]);
  });
});

describe("d501Places", () => {
  const seat = (n: number, legsWon: number, leftTotal: number, extra: Partial<import("../d501.view").D501Seat> = {}) =>
    ({ seat: n, status: "in" as const, remaining: 501, dartsUsed: 0, legsWon, leftTotal, ...extra });
  it("breaks equal legs by less left, as the server does", () => {
    const places = d501Places([seat(0, 1, 120), seat(1, 1, 40), seat(2, 0, 10)]);
    expect([places.get(1), places.get(0), places.get(2)]).toEqual([1, 2, 3]);
  });
  it("puts benched and departed seats after everyone still playing", () => {
    const places = d501Places([seat(0, 2, 0, { benched: true }), seat(1, 0, 400), seat(2, 1, 0, { status: "withdrawn" })]);
    expect(places.get(1)).toBe(1);
    expect(places.get(0)).toBe(2);
    expect(places.get(2)).toBe(2);
  });
});
