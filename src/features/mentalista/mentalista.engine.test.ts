import { describe, expect, it } from "vitest";
import {
  apply,
  checkAnswer,
  createMatch,
  DEFAULT_CONFIG,
  MAX_RAW_ANSWER_LEN,
  MentalistaConfigError,
  normalizeAnswer,
  projectView,
  setSeatStatus,
  standings,
  tick,
  type Category,
  type Command,
  type MentalistaConfig,
  type MentalistaState,
} from "./mentalista.engine";

// ── Invented-universe fixtures (no real football content) ──────────────────────────────────────────────────────────
const CAT_A: Category = { id: "cat-a", label: "Aurora XI", answers: ["Tomás Varelo", "Iker Montañés", "Bruno Salcedal", "Nico Arrizábal"] };
const CAT_B: Category = { id: "cat-b", label: "Brisa XI", answers: ["Dante Ferrolo", "Lucas Oyarzábal", "Mateo Quirogal"] };

// roundCycles defaults to 2 (DEFAULT_CONFIG) → totalRounds = roundCycles × seatCount.
const config = (over: Partial<MentalistaConfig> = {}): MentalistaConfig => ({
  ...DEFAULT_CONFIG,
  categories: [CAT_A, CAT_B],
  ...over,
});

const T = 1_000_000;
let seq = 0;
const cmd = <C extends { type: string }>(base: C, baseVersion: number): C & { commandId: string; baseVersion: number } => ({
  ...base,
  commandId: `c${seq++}`,
  baseVersion,
});

/** A started match (default 3 seats, 2 cycles → 6 rounds): chooser is seat 0, phase "choosing". */
const started = (over: Partial<MentalistaConfig> = {}, seats = 3): MentalistaState => {
  const s0 = createMatch(seats, config(over));
  return apply(s0, cmd({ type: "start" } as const, s0.version), T).state;
};

const commit = (s: MentalistaState, seat: number, answer: string, at = T) =>
  apply(s, cmd({ type: "commit_pick", seat, answer } as const, s.version), at);
const predict = (s: MentalistaState, seat: number, answer: string, at = T) =>
  apply(s, cmd({ type: "predict", seat, answer } as const, s.version), at);

/** The category used in round `index` (engine wraps categories by round). */
const catFor = (index: number): Category => (index % 2 === 0 ? CAT_A : CAT_B);

/** Drive a whole match where every predictor reads the chooser's (arbitrary but valid) pick exactly. */
const playPerfect = (seats: number, roundCycles: number): MentalistaState => {
  let s = started({ roundCycles }, seats);
  while (s.phase !== "over") {
    const r = s.round!;
    const pick = catFor(r.index).answers[0];
    s = commit(s, r.chooserSeat, pick).state;
    for (let seat = 0; seat < seats; seat++) {
      if (seat === r.chooserSeat) continue;
      s = predict(s, seat, pick).state;
    }
    s = tick(s, s.round!.deadline); // guessing → reveal
    s = tick(s, s.round!.deadline); // reveal → next round (or over)
  }
  return s;
};

describe("normalisation and validation", () => {
  it("folds case, whitespace and diacritics", () => {
    expect(normalizeAnswer("  Nico   Arrizábal ")).toBe(normalizeAnswer("nico arrizabal"));
    expect(normalizeAnswer("Peñalosa")).toBe("penalosa");
  });

  it("folds Turkish İ/I/i together but keeps dotless ı distinct, and leaves caseless Georgian unchanged", () => {
    // U+0130 İ decomposes (NFD) to I + combining dot above; the dot is stripped and it lower-cases to "i".
    expect(normalizeAnswer("İ")).toBe("i");
    expect(normalizeAnswer("I")).toBe("i");
    expect(normalizeAnswer("i")).toBe("i");
    expect(normalizeAnswer("İstanbul")).toBe(normalizeAnswer("istanbul"));
    // U+0131 dotless ı has no decomposition and must not collapse into "i".
    expect(normalizeAnswer("ı")).toBe("ı");
    expect(normalizeAnswer("ılık")).not.toBe(normalizeAnswer("ilik"));
    // Georgian is caseless: it passes through untouched (fold is locale-independent, never toLocaleLowerCase).
    expect(normalizeAnswer("ქართული")).toBe("ქართული");
  });

  it("classifies empty, too long, out of category and valid; returns collapsed canonical text", () => {
    expect(checkAnswer("   ", CAT_A, 40)).toMatchObject({ ok: false, code: "empty" });
    expect(checkAnswer("x".repeat(41), CAT_A, 40)).toMatchObject({ ok: false, code: "too_long" });
    expect(checkAnswer("Nobody Invented", CAT_A, 40)).toMatchObject({ ok: false, code: "out_of_category" });
    const ok = checkAnswer("  tomas   varelo ", CAT_A, 40);
    expect(ok.ok).toBe(true);
    expect(ok.ok && ok.norm).toBe(normalizeAnswer("Tomás Varelo"));
    expect(ok.ok && ok.canonical).toBe("tomas varelo"); // whitespace collapsed, case preserved
  });
});

describe("createMatch and config validation (no silent clamping)", () => {
  it("rejects seat counts outside 3–6 and non-integers", () => {
    expect(() => createMatch(2, config())).toThrow(MentalistaConfigError);
    expect(() => createMatch(7, config())).toThrow(MentalistaConfigError);
    expect(() => createMatch(Number.NaN, config())).toThrow(MentalistaConfigError);
    expect(() => createMatch(3.5, config())).toThrow(MentalistaConfigError);
  });

  it("sets totalRounds = roundCycles × seatCount and starts in the lobby", () => {
    const s = createMatch(4, config({ roundCycles: 2 }));
    expect(s.totalRounds).toBe(8);
    expect(s.phase).toBe("lobby");
    expect(s.seats).toHaveLength(4);
    expect(s.seats.every((x) => x.points === 0 && x.status === "active")).toBe(true);
    expect(createMatch(5, config({ roundCycles: 3 })).totalRounds).toBe(15);
  });

  it("rejects the removed `rounds` knob and other bad config", () => {
    const deprecated = { ...DEFAULT_CONFIG, categories: [CAT_A], rounds: 6 } as unknown as MentalistaConfig;
    expect(() => createMatch(3, deprecated)).toThrow(/rounds/);
    expect(() => createMatch(3, config({ roundCycles: 0 }))).toThrow(MentalistaConfigError);
    expect(() => createMatch(3, config({ chooseMs: Number.POSITIVE_INFINITY }))).toThrow(MentalistaConfigError);
    expect(() => createMatch(3, { ...config(), categories: [] })).toThrow(MentalistaConfigError);
    const dupCat = { ...config(), categories: [CAT_A, { ...CAT_A }] };
    expect(() => createMatch(3, dupCat)).toThrow(/duplicate/);
  });
});

describe("lifecycle and rotation", () => {
  it("start opens round 0 with seat 0 as chooser and a choosing deadline", () => {
    const s = started();
    expect(s.phase).toBe("choosing");
    expect(s.round).toMatchObject({ index: 0, chooserSeat: 0, phase: "choosing", deadline: T + DEFAULT_CONFIG.chooseMs });
    expect(s.version).toBe(2);
  });

  it("the chooser rotates to the next seat each round", () => {
    let s = started();
    s = commit(s, 0, "Tomás Varelo").state;
    s = predict(s, 1, "Tomás Varelo").state;
    s = tick(s, s.round!.deadline); // guessing → reveal
    s = tick(s, s.round!.deadline); // reveal → round 1
    expect(s.round).toMatchObject({ index: 1, chooserSeat: 1 });
  });

  it("runs roundCycles × seats rounds, each seat chooses exactly roundCycles times, perfect reads score symmetrically", () => {
    for (const seats of [3, 4, 5, 6]) {
      const roundCycles = 2;
      const s = playPerfect(seats, roundCycles);
      expect(s.phase).toBe("over");
      expect(s.history).toHaveLength(roundCycles * seats);
      // every seat chose exactly roundCycles times
      for (let seat = 0; seat < seats; seat++) {
        expect(s.history.filter((h) => h.chooserSeat === seat)).toHaveLength(roundCycles);
      }
      // perfect reads: each seat predicts in (totalRounds − roundCycles) rounds, scoring matchPoints each time
      const expected = DEFAULT_CONFIG.matchPoints * (roundCycles * seats - roundCycles);
      expect(s.seats.every((x) => x.points === expected)).toBe(true);
    }
  });
});

describe("commit_pick", () => {
  it("accepts the chooser's valid pick, stores collapsed canonical text, locks into guessing", () => {
    const r = commit(started(), 0, "  Nico   Arrizábal ");
    expect(r.result).toMatchObject({ ok: true, code: "committed" });
    expect(r.state.phase).toBe("guessing");
    expect(r.state.round).toMatchObject({ pick: "Nico Arrizábal", phase: "guessing", deadline: T + DEFAULT_CONFIG.guessMs });
  });

  it("refuses a non-chooser, a second commit, and invalid content", () => {
    const s = started();
    expect(commit(s, 1, "Tomás Varelo").result).toMatchObject({ ok: false, code: "not_chooser" });
    expect(commit(s, 0, "   ").result).toMatchObject({ ok: false, code: "empty" });
    expect(commit(s, 0, "Nobody Invented").result).toMatchObject({ ok: false, code: "out_of_category" });
    const once = commit(s, 0, "Tomás Varelo").state;
    expect(commit(once, 0, "Iker Montañés").result).toMatchObject({ ok: false, code: "wrong_phase" });
  });

  it("rejects an oversize raw answer early (before trim/fingerprint) and stores nothing", () => {
    const s = started();
    const padded = " ".repeat(MAX_RAW_ANSWER_LEN) + "Tomás Varelo"; // collapses under maxAnswerLen, but > raw cap
    const r = commit(s, 0, padded);
    expect(r.result).toMatchObject({ ok: false, code: "malformed" });
    expect(r.state).toBe(s); // untouched: no giant payload banked in the idempotency store
  });
});

describe("predict and scoring", () => {
  const setup = (over: Partial<MentalistaConfig> = {}) => commit(started(over), 0, "Bruno Salcedal").state;

  it("the chooser cannot predict; a predictor may revise before the reveal", () => {
    let s = setup();
    expect(predict(s, 0, "Bruno Salcedal").result).toMatchObject({ ok: false, code: "is_chooser" });
    s = predict(s, 1, "Tomás Varelo").state;
    s = predict(s, 1, "Bruno Salcedal").state; // revised to the right one
    expect(s.round!.predictions[1].norm).toBe(normalizeAnswer("Bruno Salcedal"));
  });

  it("a matching prediction scores matchPoints; others and the chooser score 0 by default", () => {
    let s = setup();
    s = predict(s, 1, "bruno  salcedal").state; // folds to the pick
    s = predict(s, 2, "Iker Montañés").state; // valid but wrong guess
    s = tick(s, s.round!.deadline); // guessing → reveal
    expect(s.phase).toBe("reveal");
    expect(s.round!.matched).toEqual([1]);
    expect(s.seats.find((x) => x.seat === 1)!.points).toBe(2);
    expect(s.seats.find((x) => x.seat === 2)!.points).toBe(0);
    expect(s.seats.find((x) => x.seat === 0)!.points).toBe(0);
  });

  it("chooserPointsPerMatch rewards the chooser per matcher when configured", () => {
    let s = commit(started({ chooserPointsPerMatch: 1 }), 0, "Bruno Salcedal").state;
    s = predict(s, 1, "Bruno Salcedal").state;
    s = predict(s, 2, "Bruno Salcedal").state;
    s = tick(s, s.round!.deadline);
    expect(s.seats.find((x) => x.seat === 0)!.points).toBe(2); // 1 per matcher × 2
    expect(s.round!.matched).toEqual([1, 2]);
  });
});

describe("deadline adjudication (no prior tick)", () => {
  it("commit at deadline−1 succeeds; at the deadline and after it is expired and the round voids", () => {
    const s = started();
    const dl = s.round!.deadline;
    expect(commit(s, 0, "Tomás Varelo", dl - 1).result).toMatchObject({ ok: true, code: "committed" });
    const atDeadline = commit(s, 0, "Tomás Varelo", dl);
    expect(atDeadline.result).toMatchObject({ ok: false, code: "expired" });
    expect(atDeadline.state.phase).toBe("reveal");
    expect(atDeadline.state.round!.voided).toBe("chooser_timeout");
    expect(commit(s, 0, "Tomás Varelo", dl + 1).result).toMatchObject({ ok: false, code: "expired" });
  });

  it("predict at deadline−1 succeeds; at/after the deadline is expired and reveals", () => {
    const g = commit(started(), 0, "Nico Arrizábal").state; // guessing
    const dl = g.round!.deadline;
    expect(predict(g, 1, "Nico Arrizábal", dl - 1).result).toMatchObject({ ok: true, code: "predicted" });
    const atDeadline = predict(g, 1, "Nico Arrizábal", dl);
    expect(atDeadline.result).toMatchObject({ ok: false, code: "expired" });
    expect(atDeadline.state.phase).toBe("reveal");
  });
});

describe("timeouts and phase boundaries", () => {
  it("a chooser who never commits voids the round with no scoring", () => {
    let s = started();
    s = tick(s, s.round!.deadline); // choosing deadline passes
    expect(s.phase).toBe("reveal");
    expect(s.round!.voided).toBe("chooser_timeout");
    expect(s.seats.every((x) => x.points === 0)).toBe(true);
  });

  it("the guessing timeout reveals with whatever predictions are on file", () => {
    let s = commit(started(), 0, "Nico Arrizábal").state;
    s = predict(s, 1, "Nico Arrizábal").state; // seat 2 never answers
    s = tick(s, s.round!.deadline);
    expect(s.round!.matched).toEqual([1]);
    expect(s.seats.find((x) => x.seat === 2)!.points).toBe(0);
  });

  it("tick after a long gap advances one boundary (the reveal a player should see is not skipped)", () => {
    const s = commit(started(), 0, "Tomás Varelo").state; // phase guessing
    const once = tick(s, T + 10_000_000);
    expect(once.phase).toBe("reveal"); // guessing → reveal, reveal deadline re-stamped from now
    const twice = tick(once, once.round!.deadline); // reveal elapses → round 1 opens
    expect(twice.round).toMatchObject({ index: 1, chooserSeat: 1 });
  });

  it("tick is a no-op before any deadline", () => {
    const s = started();
    expect(tick(s, T + 1).version).toBe(s.version);
  });
});

describe("stale, duplicate and conflicting commands", () => {
  it("a command on an old version is refused as stale", () => {
    const s = started();
    const staleCmd: Command = { type: "commit_pick", seat: 0, answer: "Tomás Varelo", commandId: "x", baseVersion: s.version - 1 };
    expect(apply(s, staleCmd, T).result).toMatchObject({ ok: false, code: "stale_version" });
  });

  it("replaying a commandId returns the stored result and does not double-apply", () => {
    const s = commit(started(), 0, "Tomás Varelo").state;
    const first = apply(s, { type: "predict", seat: 1, answer: "Tomás Varelo", commandId: "dup", baseVersion: s.version }, T);
    const again = apply(first.state, { type: "predict", seat: 1, answer: "Tomás Varelo", commandId: "dup", baseVersion: s.version }, T);
    expect(again.result).toEqual(first.result);
    expect(again.state.version).toBe(first.state.version); // no second bump
  });

  it("the same commandId carrying a different payload is a command_conflict, not a silent re-apply", () => {
    const s = started();
    const first = apply(s, { type: "commit_pick", seat: 0, answer: "Tomás Varelo", commandId: "dup", baseVersion: s.version }, T);
    expect(first.result).toMatchObject({ ok: true });
    const conflict = apply(first.state, { type: "commit_pick", seat: 0, answer: "Iker Montañés", commandId: "dup", baseVersion: s.version }, T);
    expect(conflict.result).toMatchObject({ ok: false, code: "command_conflict" });
    expect(conflict.state.version).toBe(first.state.version); // unchanged
  });

  it("a recorded future-version rejection is replayed even once the version catches up (never commits late)", () => {
    const s = started(); // version 2, choosing
    const futureCmd: Command = { type: "predict", seat: 1, answer: "Tomás Varelo", commandId: "future", baseVersion: 3 };
    const rejected = apply(s, futureCmd, T); // base 3 ≠ version 2 → stale, recorded
    expect(rejected.result).toMatchObject({ ok: false, code: "stale_version" });
    const committed = commit(rejected.state, 0, "Nico Arrizábal"); // version 2 → 3, now guessing
    expect(committed.result).toMatchObject({ ok: true, code: "committed" });
    // the version now equals the future command's baseVersion and the phase would accept a predict — but the
    // stored rejection is replayed verbatim, so the stale command cannot sneak in.
    const retry = apply(committed.state, futureCmd, T);
    expect(retry.result).toMatchObject({ ok: false, code: "stale_version" });
    expect(retry.state.round!.predictions[1]).toBeUndefined();
  });
});

describe("prototype-safe idempotency store", () => {
  it("treats dangerous command ids as ordinary keys: no inherited hit, correct replay, no pollution", () => {
    for (const id of ["__proto__", "constructor", "toString", "hasOwnProperty"]) {
      const s = started();
      // a never-seen dangerous id is NOT mistaken for a prior entry — the command actually applies.
      const first = apply(s, { type: "commit_pick", seat: 0, answer: "Tomás Varelo", commandId: id, baseVersion: s.version }, T);
      expect(first.result).toMatchObject({ ok: true, code: "committed" });
      // replaying returns the stored result, no second mutation.
      const again = apply(first.state, { type: "commit_pick", seat: 0, answer: "Tomás Varelo", commandId: id, baseVersion: s.version }, T);
      expect(again.result).toEqual(first.result);
      expect(again.state.version).toBe(first.state.version);
    }
    // Object.prototype was not polluted by the "__proto__"/"constructor" keys.
    expect(Object.keys({})).toEqual([]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("malformed inputs and a non-finite clock", () => {
  it("refuses malformed commands and a non-finite now without touching state", () => {
    const s = started();
    expect(apply(s, { type: "bogus" } as unknown as Command, T).result).toMatchObject({ ok: false, code: "malformed" });
    expect(apply(s, { type: "commit_pick", seat: 1.5, answer: "x", commandId: "m", baseVersion: s.version } as Command, T).result)
      .toMatchObject({ ok: false, code: "malformed" });
    const goodCmd: Command = { type: "commit_pick", seat: 0, answer: "Tomás Varelo", commandId: "nf", baseVersion: s.version };
    expect(apply(s, goodCmd, Number.NaN).result).toMatchObject({ ok: false, code: "malformed" });
    expect(apply(s, goodCmd, Number.POSITIVE_INFINITY).result).toMatchObject({ ok: false, code: "malformed" });
  });
});

describe("disconnects, drops and preserved settled history", () => {
  it("dropping the chooser mid-choosing voids the round", () => {
    const s = setSeatStatus(started(), 0, "dropped", T);
    expect(s.round!.voided).toBe("chooser_dropped");
    expect(s.phase).toBe("reveal");
  });

  it("dropping a predictor mid-guessing does not void; the round plays on and they cannot score", () => {
    let s = commit(started(), 0, "Nico Arrizábal").state; // guessing
    s = setSeatStatus(s, 2, "dropped", T); // two active seats remain (0 and 1)
    expect(s.phase).toBe("guessing");
    expect(s.round!.voided).toBeNull();
    s = predict(s, 1, "Nico Arrizábal").state;
    s = tick(s, s.round!.deadline);
    expect(s.round!.matched).toEqual([1]);
    expect(s.seats.find((x) => x.seat === 2)!.points).toBe(0);
  });

  it("dropping the chooser AFTER they committed keeps the locked pick; predictors still score", () => {
    let s = commit(started(), 0, "Nico Arrizábal").state; // guessing, pick locked
    s = predict(s, 1, "Nico Arrizábal").state;
    s = setSeatStatus(s, 0, "dropped", T); // chooser leaves, but its pick stands
    expect(s.round!.voided).toBeNull();
    s = tick(s, s.round!.deadline); // reveal
    expect(s.round!.matched).toEqual([1]);
  });

  it("rotation skips a dropped seat", () => {
    let s = started({ roundCycles: 1 }, 3);
    s = setSeatStatus(s, 1, "dropped", T); // seat 1 will be skipped
    s = commit(s, 0, "Tomás Varelo").state;
    s = tick(s, s.round!.deadline); // reveal
    s = tick(s, s.round!.deadline); // round 1 → chooser should be seat 2, not the dropped seat 1
    expect(s.round!.chooserSeat).toBe(2);
  });

  it("falling below two active seats ends the match and never rescinds an already-awarded round", () => {
    let s = started({ roundCycles: 1 }, 3); // 3 rounds
    s = commit(s, 0, "Tomás Varelo").state;
    s = predict(s, 1, "Tomás Varelo").state;
    s = tick(s, s.round!.deadline); // reveal: seat 1 scored 2
    expect(s.phase).toBe("reveal");
    s = setSeatStatus(s, 1, "dropped", T); // two active remain (0, 2) → still playing
    expect(s.phase).toBe("reveal");
    s = setSeatStatus(s, 2, "dropped", T); // one active (0) → match ends
    expect(s.phase).toBe("over");
    const banked = s.history.find((h) => h.index === 0)!;
    expect(banked.voided).toBeNull(); // the revealed round is preserved, not voided
    expect(banked.matched).toEqual([1]);
    expect(s.seats.find((x) => x.seat === 1)!.points).toBe(2); // awarded points kept even after the seat left
  });
});

describe("standings and ties", () => {
  it("shares rank on ties and ranks dropped seats last", () => {
    let s = started({ roundCycles: 1 }, 3);
    s = commit(s, 0, "Tomás Varelo").state;
    s = predict(s, 1, "Tomás Varelo").state;
    s = predict(s, 2, "Tomás Varelo").state;
    s = tick(s, s.round!.deadline); // reveal: seats 1 and 2 both score 2
    const table = standings(s);
    expect(table.filter((r) => r.rank === 1).map((r) => r.seat).sort()).toEqual([1, 2]);
    expect(table.find((r) => r.seat === 0)!.rank).toBe(3);
  });
});

describe("projection hides secrets until reveal", () => {
  it("hides the pick and other predictions pre-reveal, shows own, reveals at reveal; view.config.rounds = totalRounds", () => {
    let s = commit(started(), 0, "Nico Arrizábal").state;
    s = predict(s, 1, "Tomás Varelo").state;

    const seen2 = projectView(s, 2); // a predictor who is not seat 1
    expect(seen2.config.rounds).toBe(6); // 2 cycles × 3 seats, surfaced for the UI's "round n of N"
    expect(seen2.round!.pick).toBeNull(); // chooser's pick hidden
    expect(seen2.seats.find((x) => x.seat === 1)!.prediction).toBeNull(); // another's prediction hidden
    expect(seen2.seats.find((x) => x.seat === 0)!.hasCommitted).toBe(true); // but the status dot is visible

    const chooserSees = projectView(s, 0);
    expect(chooserSees.round!.pick).toBe("Nico Arrizábal"); // the chooser sees their own pick

    const ownSees = projectView(s, 1);
    expect(ownSees.seats.find((x) => x.seat === 1)!.prediction).toBe("Tomás Varelo"); // own prediction visible

    s = tick(s, s.round!.deadline); // reveal
    const revealed = projectView(s, 2);
    expect(revealed.round!.pick).toBe("Nico Arrizábal");
    expect(revealed.seats.find((x) => x.seat === 1)!.prediction).toBe("Tomás Varelo");
  });
});
