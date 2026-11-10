import { describe, expect, it } from "vitest";
import { standings } from "@/features/mentalista/mentalista.engine";
import type { MentalistaView } from "@/features/mentalista/mentalista.server";
import {
  ACTUAL_NAMES,
  ACTUAL_NOW,
  ACTUAL_OPTIONS,
  ACTUAL_POINTS,
  ACTUAL_ROOM_PREFIX,
  MENTALISTA_ROOM,
  _actualRoomFixtures,
  _mentalistaFixtures,
  type ActualRoomData,
} from "./mentalistaScenarios";

/**
 * Guards that the playground fixtures actually mean what their labels claim. The earlier data reused a round-0 name in a
 * later category (out-of-category → the round silently voided), so "you won" / "tied" / "you read it" screens showed the
 * wrong outcome. These assertions fail loudly if a fixture drifts back into an impossible or mislabelled state. (The
 * builders themselves throw on any rejected command, so an out-of-category pick can no longer pass unnoticed.)
 */
describe("mentalista playground fixtures mean what they say", () => {
  const rankOf = (s: ReturnType<typeof standings>, seat: number) => s.find((r) => r.seat === seat)!.rank;

  it("over-win: seat 0 finishes first, alone", () => {
    const table = standings(_mentalistaFixtures.winState);
    expect(_mentalistaFixtures.winState.phase).toBe("over");
    expect(rankOf(table, 0)).toBe(1);
    expect(table.filter((r) => r.rank === 1)).toHaveLength(1);
  });

  it("over-tie: seats 0 and 1 share first", () => {
    const table = standings(_mentalistaFixtures.tieState);
    expect(table.filter((r) => r.rank === 1).map((r) => r.seat).sort()).toEqual([0, 1]);
  });

  it("over-lost: viewer seat 2 is strictly mid-table (rank 2 of 3)", () => {
    const table = standings(_mentalistaFixtures.midState);
    expect(rankOf(table, 2)).toBe(2);
  });

  it("over-drop: the departed seat 2 is ranked last", () => {
    const table = standings(_mentalistaFixtures.dropState);
    expect(table.find((r) => r.seat === 2)!.status).toBe("dropped");
    expect(rankOf(table, 2)).toBe(3);
  });

  it("reveal-hit: seat 0 read the Mentalist; reveal-miss: seat 0 did not", () => {
    expect(_mentalistaFixtures.revealHit.round!.phase).toBe("reveal");
    expect(_mentalistaFixtures.revealHit.round!.matched).toContain(0);
    expect(_mentalistaFixtures.revealMiss.round!.matched).not.toContain(0);
  });
});

/**
 * The "Actual room UI (invented snapshot)" fixtures feed the REAL room board/results. They are literal data, so these
 * assertions are what keeps them honest: the exact live view contract, the phase they claim, no secret leaked before
 * reveal, and scores/places that mean what the labels say.
 */
describe("actual room UI fixtures (invented snapshot)", () => {
  const entries = Object.entries(_actualRoomFixtures) as Array<[string, { label: string; data: ActualRoomData }]>;
  const fx = (key: keyof typeof _actualRoomFixtures): ActualRoomData => _actualRoomFixtures[key].data;
  const VIEW_KEYS = ["phase", "round", "totalRounds", "chooserSeat", "category", "iAmChooser", "seats", "mySeat", "myChoice", "myPrediction", "reveal", "results", "standings", "deadline"].sort();
  const SEAT_KEYS = ["seat", "status", "isChooser", "committed", "predicted", "score"].sort();
  const isOpen = (v: MentalistaView) => v.phase === "choose" || v.phase === "predict";

  it("are registered in MENTALISTA_ROOM after the preserved prototype scenarios, clearly labelled", () => {
    const ids = MENTALISTA_ROOM.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const proto of ["live-3", "live-6", "intro", "choose-you", "reveal-hit", "over-win", "over-drop"]) expect(ids).toContain(proto);
    const actual = MENTALISTA_ROOM.filter((s) => s.id.startsWith("actual-"));
    expect(actual.map((s) => s.id)).toEqual(entries.map(([k]) => `actual-${k}`));
    for (const s of actual) {
      expect(s.name.startsWith(ACTUAL_ROOM_PREFIX), s.id).toBe(true);
      expect(s.note).toMatch(/Visual\/input-only/);
      expect(s.note).toMatch(/No runtime/);
    }
    // No prototype screen is mislabelled as the actual room UI.
    for (const s of MENTALISTA_ROOM.filter((x) => !x.id.startsWith("actual-"))) expect(s.name.startsWith(ACTUAL_ROOM_PREFIX)).toBe(false);
    // The prototype screens come first, untouched in order; the actual ones are appended.
    expect(ids.slice(-actual.length).every((id) => id.startsWith("actual-"))).toBe(true);
  });

  it.each(entries)("%s: carries the exact live view contract and a consistent snapshot", (_key, { label, data }) => {
    const v = data.view;
    expect(label.trim().length).toBeGreaterThan(0);
    expect(Object.keys(data).sort()).toEqual(["connected", "error", "snapshot", "view"]);
    expect(Object.keys(v).sort()).toEqual(VIEW_KEYS);
    for (const s of v.seats) expect(Object.keys(s).sort()).toEqual(SEAT_KEYS);
    expect(v.seats.length).toBeGreaterThanOrEqual(3);
    expect(v.seats.length).toBeLessThanOrEqual(6);
    expect(v.seats.map((s) => s.seat)).toEqual(v.seats.map((_, i) => i));
    expect(v.mySeat).toBeGreaterThanOrEqual(0);
    expect(v.mySeat).toBeLessThan(v.seats.length);
    expect(v.round).toBeLessThan(v.totalRounds);
    // viewOf: the chooser is flagged only in a non-terminal phase; in the terminal phase every isChooser is false.
    for (const s of v.seats) expect(s.isChooser, `seat ${s.seat}`).toBe(v.phase !== "over" && s.seat === v.chooserSeat);
    expect(v.iAmChooser).toBe(v.phase !== "over" && v.mySeat === v.chooserSeat);

    const snap = data.snapshot;
    expect(snap.game).toBe("mentalista");
    expect(snap.me.seat).toBe(v.mySeat);
    expect(snap.phaseDeadlineAt).toBe(v.deadline);
    expect(Date.parse(snap.serverNow)).toBe(ACTUAL_NOW);
    expect(snap.status).toBe(v.phase === "over" ? "completed" : "active");
    expect(snap.seats.map((s) => s.seat)).toEqual(v.seats.map((s) => s.seat));
    for (const s of v.seats) {
      const row = snap.seats.find((r) => r.seat === s.seat)!;
      expect(row.username).toBe(ACTUAL_NAMES[s.seat]);
      expect(row.active).toBe(s.status !== "withdrawn");
      if (s.status !== "in") expect(row.connected).toBe(false);
    }
  });

  it.each(entries)("%s: uses invented content only", (_key, { data }) => {
    const v = data.view;
    if (v.category) {
      expect(v.category.options.map((o) => o.name)).toEqual([...ACTUAL_OPTIONS]);
      expect(v.category.options.map((o) => o.id)).toEqual(ACTUAL_OPTIONS.map((_, i) => `sig-${i}`));
    }
    expect(JSON.stringify(data)).not.toMatch(/football|futbol|fútbol|soccer|\bclub\b|league|messi|ronaldo|madrid|barcelona/i);
  });

  it("ACTUAL_OPTIONS is exactly three invented options", () => {
    expect([...ACTUAL_OPTIONS]).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it.each(entries)("%s: three options, every option index in 0..2, one chooser cycle (totalRounds = seat count)", (_key, { data }) => {
    const v = data.view;
    const inRange = (n: number | null, what: string) => {
      if (n === null) return;
      expect(Number.isInteger(n), what).toBe(true);
      expect(n, what).toBeGreaterThanOrEqual(0);
      expect(n, what).toBeLessThanOrEqual(2);
    };
    if (v.category) expect(v.category.options).toHaveLength(3);
    expect(v.totalRounds).toBe(v.seats.length);
    inRange(v.myChoice, "myChoice");
    inRange(v.myPrediction, "myPrediction");
    for (const r of [...v.results, ...(v.reveal ? [v.reveal] : [])]) {
      inRange(r.target, `round ${r.round} target`);
      for (const e of r.entries) inRange(e.prediction, `round ${r.round} seat ${e.seat} prediction`);
    }
  });

  it.each(entries.filter(([, f]) => f.data.view.phase === "over"))("%s: the result schedule has each seat choose exactly once", (_key, { data }) => {
    const v = data.view;
    expect(v.results).toHaveLength(v.seats.length);
    expect(v.results.map((r) => r.chooser).sort((a, b) => a - b)).toEqual(v.seats.map((s) => s.seat));
  });

  it("covers every room size 3–6 and every phase, including the voided, disconnected, tie and dropped screens", () => {
    const views = entries.map(([, f]) => f.data.view);
    expect(new Set(views.map((v) => v.seats.length))).toEqual(new Set([3, 4, 5, 6]));
    expect(new Set(views.map((v) => v.phase))).toEqual(new Set(["choose", "predict", "reveal", "over"]));
    expect(fx("reveal-void").view.reveal!.voided).toBe(true);
    expect(fx("disconnected").connected).toBe(false);
    expect(entries.filter(([k]) => k !== "disconnected").every(([, f]) => f.data.connected)).toBe(true);
  });

  it.each(entries)("%s: phase-specific fields match the phase (frozen future clock)", (_key, { data }) => {
    const v = data.view;
    if (v.phase === "over") {
      expect(v.deadline).toBeNull();
      expect(v.reveal).toBeNull();
      expect(v.standings).not.toBeNull();
      expect(v.myChoice).toBeNull();
      expect(v.myPrediction).toBeNull();
      expect(data.snapshot.result).not.toBeNull();
    } else {
      expect(v.standings).toBeNull();
      expect(data.snapshot.result).toBeNull();
      expect(v.category).not.toBeNull();
      // A constant deadline strictly after the frozen server clock: the screen stays interactive, never times out.
      expect(Date.parse(v.deadline!)).toBeGreaterThan(ACTUAL_NOW);
    }
    if (v.phase === "reveal") {
      expect(v.reveal).not.toBeNull();
      expect(v.results[v.results.length - 1]).toEqual(v.reveal);
      expect(v.myChoice).toBeNull();
      expect(v.myPrediction).toBeNull();
    }
  });

  it.each(entries)("%s: deadline is 20 s for choose/predict, 5 s for reveal, none when over; snapshot matches", (_key, { data }) => {
    const v = data.view;
    expect(data.snapshot.phaseDeadlineAt).toBe(v.deadline);
    if (v.phase === "over") {
      expect(v.deadline).toBeNull();
    } else {
      const left = Date.parse(v.deadline!) - ACTUAL_NOW;
      expect(left).toBe(v.phase === "reveal" ? 5_000 : 20_000);
    }
  });

  it.each(entries.filter(([, f]) => isOpen(f.data.view)))("%s: no secret before reveal except the viewer's own locked value", (_key, { data }) => {
    const v = data.view;
    expect(v.reveal).toBeNull();
    // Only banked rounds may carry a target; nothing about the open round.
    for (const r of v.results) expect(r.round).toBeLessThan(v.round);
    expect(JSON.stringify(v)).not.toMatch(/"target"|"prediction"|"matched"/);
    // The viewer's own secret only: a chooser's own committed pick, or a predictor's own locked prediction.
    if (v.myChoice !== null) {
      expect(v.iAmChooser).toBe(true);
      expect(v.seats[v.mySeat].committed).toBe(true);
    }
    if (v.myPrediction !== null) {
      expect(v.iAmChooser).toBe(false);
      expect(v.phase).toBe("predict");
      expect(v.seats[v.mySeat].predicted).toBe(true);
    }
    if (!v.iAmChooser) expect(v.myChoice).toBeNull();
    if (v.iAmChooser) expect(v.myPrediction).toBeNull();
    // Choose phase: nobody can have predicted yet. Predict phase: the chooser has committed.
    if (v.phase === "choose") expect(v.seats.some((s) => s.predicted)).toBe(false);
    if (v.phase === "predict") expect(v.seats[v.chooserSeat].committed).toBe(true);
    // Other seats' progress is only ever a boolean flag — no option index anywhere but the viewer's own fields.
    expect(data.snapshot.view).toBeNull();
  });

  it.each(entries)("%s: seat progress flags follow the live viewOf phase rules", (_key, { data }) => {
    const v = data.view;
    for (const s of v.seats) {
      const isChooser = s.seat === v.chooserSeat;
      // committed is only ever the chooser's flag, and only during choose/predict.
      if (s.committed) {
        expect(isOpen(v), `seat ${s.seat} committed outside choose/predict`).toBe(true);
        expect(isChooser, `seat ${s.seat} committed but not the chooser`).toBe(true);
      }
      // predicted is only ever a predictor's flag, and only during predict.
      if (s.predicted) {
        expect(v.phase, `seat ${s.seat} predicted outside predict`).toBe("predict");
        expect(isChooser, `seat ${s.seat}: the chooser never predicts`).toBe(false);
      }
    }
    if (v.phase === "over") {
      expect(v.seats.every((s) => !s.isChooser && !s.committed && !s.predicted)).toBe(true);
    }
    if (v.phase === "reveal") {
      expect(v.seats.every((s) => !s.committed && !s.predicted)).toBe(true);
      expect(v.seats.filter((s) => s.isChooser).map((s) => s.seat)).toEqual([v.chooserSeat]);
    }
    if (v.phase === "choose") {
      expect(v.seats.some((s) => s.predicted)).toBe(false);
      // Before the tick the chooser may already have locked; the viewer-chooser's lock shows as committed + myChoice.
      if (v.iAmChooser) expect(v.seats[v.chooserSeat].committed).toBe(v.myChoice !== null);
    }
    if (v.phase === "predict") expect(v.seats[v.chooserSeat].committed).toBe(true);
  });

  it("choose-locked: the chooser's pick is locked before the tick (still choose phase, committed, nobody predicted)", () => {
    const v = fx("choose-locked").view;
    expect(v.phase).toBe("choose");
    expect(v.seats[v.chooserSeat]).toMatchObject({ isChooser: true, committed: true, predicted: false });
    expect(v.seats.filter((s) => s.seat !== v.chooserSeat).every((s) => !s.committed && !s.predicted)).toBe(true);
  });

  it("open screens distinguish the roles they are labelled with", () => {
    expect(fx("choose-you").view).toMatchObject({ phase: "choose", iAmChooser: true, myChoice: null });
    expect(fx("choose-wait").view).toMatchObject({ phase: "choose", iAmChooser: false, myChoice: null, myPrediction: null });
    expect(fx("choose-locked").view).toMatchObject({ phase: "choose", iAmChooser: true, myChoice: 2 });
    expect(fx("predict-you").view).toMatchObject({ phase: "predict", iAmChooser: false, myPrediction: null });
    expect(fx("predict-locked").view).toMatchObject({ phase: "predict", iAmChooser: false, myPrediction: 1 });
    expect(fx("being-read").view).toMatchObject({ phase: "predict", iAmChooser: true, myChoice: 2, myPrediction: null });
    const away = fx("disconnected");
    expect(away.view.phase).toBe("predict");
    expect(away.view.seats.find((s) => s.status === "away")).toBeTruthy();
  });

  it.each(entries)("%s: every banked round scores consistently and seat scores are their sums", (_key, { data }) => {
    const v = data.view;
    v.results.forEach((r, i) => {
      expect(r.round).toBe(i);
      expect(r.chooser).toBe(r.round % v.seats.length);
      // bank() emits one entry for EVERY admitted seat, in seat order — the chooser and withdrawn seats included.
      expect(r.entries.map((e) => e.seat)).toEqual(v.seats.map((s) => s.seat));
      // The chooser's own row is always unscored.
      expect(r.entries.find((e) => e.seat === r.chooser)).toEqual({ seat: r.chooser, prediction: null, matched: false, points: 0 });
      for (const e of r.entries) {
        if (r.voided) {
          expect(r.target).toBeNull();
          expect(e.matched).toBe(false);
          expect(e.points).toBe(0);
        } else {
          expect(r.target).not.toBeNull();
          expect(e.matched, `round ${r.round} seat ${e.seat}`).toBe(e.prediction === r.target);
          expect(e.points).toBe(e.matched ? ACTUAL_POINTS : 0);
        }
      }
    });
    for (const s of v.seats) {
      const sum = v.results.flatMap((r) => r.entries).filter((e) => e.seat === s.seat).reduce((n, e) => n + e.points, 0);
      expect(s.score, `seat ${s.seat}`).toBe(sum);
    }
  });

  it("reveal screens mean what they say", () => {
    const hit = fx("reveal-hit").view;
    const mineHit = hit.reveal!.entries.find((e) => e.seat === hit.mySeat)!;
    expect(mineHit.matched).toBe(true);
    expect(mineHit.points).toBe(ACTUAL_POINTS);

    const missed = fx("reveal-miss").view;
    const mineMiss = missed.reveal!.entries.find((e) => e.seat === missed.mySeat)!;
    expect(mineMiss.matched).toBe(false);
    expect(mineMiss.points).toBe(0);
    expect(missed.reveal!.entries.some((e) => e.matched)).toBe(true); // someone else read it

    const voided = fx("reveal-void").view;
    expect(voided.reveal).toMatchObject({ target: null, voided: true });
    expect(voided.seats[voided.chooserSeat].committed).toBe(false);
    expect(voided.seats.every((s) => s.score === 0)).toBe(true);
  });

  it.each(entries.filter(([, f]) => f.data.view.phase === "over"))("%s: the final table follows the banked rounds", (_key, { data }) => {
    const v = data.view;
    const table = v.standings!;
    expect(table.map((r) => r.seat).sort()).toEqual(v.seats.map((s) => s.seat));
    for (const r of table) {
      const seat = v.seats[r.seat];
      expect(r.points).toBe(seat.score);
      expect(r.roundWins).toBe(v.results.flatMap((x) => x.entries).filter((e) => e.seat === r.seat && e.matched).length);
      // Shared places on ties (1, 1, 3 …): one more than the seats strictly ahead.
      expect(r.place, `seat ${r.seat}`).toBe(1 + table.filter((o) => o.points > r.points).length);
    }
    expect(data.snapshot.result!.standings.map(({ seat, points, roundWins, place }) => ({ seat, points, roundWins, place }))).toEqual(table);
  });

  it("over-win: the viewer finishes first, alone", () => {
    const v = fx("over-win").view;
    const firsts = v.standings!.filter((r) => r.place === 1);
    expect(firsts.map((r) => r.seat)).toEqual([v.mySeat]);
  });

  it("over-tie-drop: the viewer shares first; the withdrawn seat is last and marked withdrawn", () => {
    const d = fx("over-tie-drop");
    const v = d.view;
    const firsts = v.standings!.filter((r) => r.place === 1).map((r) => r.seat);
    expect(firsts).toContain(v.mySeat);
    expect(firsts.length).toBeGreaterThan(1);
    const gone = v.seats.find((s) => s.status === "withdrawn")!;
    expect(gone).toBeTruthy();
    const lastPlace = Math.max(...v.standings!.map((r) => r.place));
    expect(v.standings!.find((r) => r.seat === gone.seat)!.place).toBe(lastPlace);
    expect(d.snapshot.result!.standings.find((r) => r.seat === gone.seat)!.withdrawn).toBe(true);
    // Every round still carries a row for the withdrawn seat. Before leaving it predicted; from the round after it left on,
    // its row is unscored (null, false, 0), and its own choosing turn is voided.
    const rowOf = (r: MentalistaView["results"][number]) => r.entries.find((e) => e.seat === gone.seat)!;
    for (const r of v.results) expect(rowOf(r), `round ${r.round}`).toBeTruthy();
    const leftAfter = v.results.findIndex((r) => r.chooser !== gone.seat && rowOf(r).prediction === null);
    expect(leftAfter).toBeGreaterThan(0);
    expect(v.results.slice(0, leftAfter).every((r) => r.chooser === gone.seat || rowOf(r).prediction !== null)).toBe(true);
    for (const r of v.results.slice(leftAfter)) {
      expect(rowOf(r), `round ${r.round}`).toEqual({ seat: gone.seat, prediction: null, matched: false, points: 0 });
    }
    expect(v.results.find((r) => r.chooser === gone.seat)!.voided).toBe(true);
  });
});
