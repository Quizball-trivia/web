import type { Locale } from "@/lib/i18n/messages";
import { FixedLocaleProvider } from "@/contexts/LocaleContext";
import {
  apply,
  createMatch,
  DEFAULT_CONFIG,
  projectView,
  setSeatStatus,
  standings,
  tick,
  type Command,
  type MentalistaConfig,
  type MentalistaState,
} from "@/features/mentalista/mentalista.engine";
import { MentalistaResults, MentalistaScreen, readsFromState } from "@/features/mentalista/MentalistaScreen";
// The REAL room screens (what a live room draws). Aliased so they never collide with the prototype's `MentalistaResults`.
import { MentalistaBoard as MentalistaRoomBoard, MentalistaResults as MentalistaRoomResults } from "@/features/mentalista/MentalistaRoom";
import type { MentalistaPublicCategory, MentalistaResult, MentalistaView } from "@/features/mentalista/mentalista.server";
import { Frame } from "@/features/wordgames/ui";
import type { RoomStatePayload, RoomStatus } from "@/lib/realtime/socket.types";
import { MotionConfig } from "motion/react";
import { useMemo } from "react";
import { MentalistaSim, type MentalistaSimConfig } from "./MentalistaSim";
import { MENTALISTA_CATEGORIES, SEAT_META, categoriesFor } from "./fixtures/mentalista";
import { scenario, type Scenario, type ScenarioContext } from "./types";

const T0 = Date.parse("2031-05-01T12:00:00.000Z");
const EN_CONFIG = (roundCycles: number): MentalistaConfig => ({ ...DEFAULT_CONFIG, roundCycles, categories: categoriesFor("en") });

// The engine's category order for a match = the fixture order; round `index` uses `EN_CATS[index % EN_CATS.length]`.
const EN_CATS = categoriesFor("en");
/** The valid answers (tappable options) for the round at `index`, straight from the category that round actually uses. */
const roundAnswers = (index: number): readonly string[] => EN_CATS[index % EN_CATS.length].answers;

let seq = 0;
const id = () => `pg-${seq++}`;

// `Omit` over a union keeps only the keys common to every member (dropping `seat`/`answer`); distribute it per-member.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type CommandSpec = DistributiveOmit<Command, "commandId" | "baseVersion">;

type Step = (s: MentalistaState) => MentalistaState;
/** Apply a command and *fail loudly* if the engine rejects it — a fixture that builds an impossible state is a bug. */
const applyChecked = (spec: CommandSpec, what: string): Step => (s) => {
  const out = apply(s, { ...spec, commandId: id(), baseVersion: s.version } as Command, T0);
  if (!out.result.ok) throw new Error(`Mentalista fixture "${what}" was rejected: ${out.result.code}`);
  return out.state;
};
const start: Step = applyChecked({ type: "start" }, "start");
const commit = (seat: number, answer: string): Step => applyChecked({ type: "commit_pick", seat, answer }, `commit seat ${seat} · ${answer}`);
const predict = (seat: number, answer: string): Step => applyChecked({ type: "predict", seat, answer }, `predict seat ${seat} · ${answer}`);
const reveal: Step = (s) => tick(s, s.round ? s.round.deadline : T0);
const drop = (seat: number): Step => (s) => setSeatStatus(s, seat, "dropped", T0);

/** Build a 3-seat match with `roundCycles` complete cycles (totalRounds = roundCycles × 3). */
const build = (roundCycles: number, ...steps: Step[]): MentalistaState =>
  steps.reduce((s, f) => f(s), createMatch(3, EN_CONFIG(roundCycles)));

/** The category answers for a round id (the UI's tappable options) and its localised label. */
const answersOf = (categoryId: string): readonly string[] => MENTALISTA_CATEGORIES.find((c) => c.id === categoryId)?.answers ?? [];
const labelOf = (categoryId: string, locale: string): string => {
  const c = MENTALISTA_CATEGORIES.find((x) => x.id === categoryId);
  return c ? c.labels[locale] ?? c.labels.en : "";
};

interface ScreenData {
  state: MentalistaState;
  viewerSeat: number;
  secondsLeft: number | null;
  connected?: boolean;
  myPrediction?: string | null;
  myPick?: string | null;
}

const screen = (sid: string, name: string, data: ScreenData, note?: string) =>
  scenario<ScreenData>({
    id: sid, name, note,
    data,
    render: (d, ctx) => {
      const view = projectView(d.state, d.viewerSeat);
      const round = d.state.round;
      return (
        <FixedLocaleProvider locale={ctx.locale as Locale}>
          {d.state.phase === "over" ? (
            <MentalistaResults table={standings(d.state)} seats={SEAT_META} viewerSeat={d.viewerSeat} locale={ctx.locale} reads={readsFromState(d.state)}
              onRoom={() => ctx.log("onRoom")} onExit={() => ctx.log("onExit")} />
          ) : (
            <MentalistaScreen view={view} seats={SEAT_META} locale={ctx.locale}
              categoryLabel={round ? labelOf(round.categoryId, ctx.locale) : ""}
              answers={round ? answersOf(round.categoryId) : []}
              secondsLeft={d.secondsLeft} connected={d.connected ?? true}
              myPrediction={d.myPrediction ?? null} myPick={d.myPick ?? null}
              onStart={() => ctx.log("onStart")}
              onPick={(a) => ctx.log("onPick", a)} onPredict={(a) => ctx.log("onPredict", a)} onExit={() => ctx.log("onExit")} />
          )}
        </FixedLocaleProvider>
      );
    },
  });

// Round-0 answers (category "aurora-xi") for the single-round screens; seat 0 is the deterministic first chooser.
const R0 = roundAnswers(0);

/**
 * A round-2 reveal with seat 1 as the Mentalist (so seat 0 is a predictor). Round 0's chooser is deterministically seat 0,
 * so we play it out first (seat 0 commits a *round-0* answer, both phases tick) before the visible round-1 reveal. The
 * pick and guesses here are drawn from round 1's own category ("brisa-xi"); reusing a round-0 name would be out-of-category.
 */
const revealR1 = (preds: Array<[number, string]>): MentalistaState => {
  const r1 = roundAnswers(1);
  return build(2,
    start, commit(0, R0[0]), reveal, reveal, // play round 0 → round 1 opens with chooser seat 1
    commit(1, r1[0]), ...preds.map(([seat, a]) => predict(seat, a)), reveal);
};

interface RoundPlan { chooser: number; pick: string; preds: Array<[number, string]> }

/**
 * Build a 6-round plan (3 seats, 2 cycles) from a per-round list of the predictor seats that *read* the chooser. Every
 * pick is that round's first category answer; a reader guesses it, a non-reader guesses the second (a valid but wrong
 * name). Chooser rotation is deterministic: round i's chooser is seat i % 3.
 */
const planFromReads = (readsPerRound: number[][]): RoundPlan[] =>
  readsPerRound.map((readers, i) => {
    const chooser = i % 3;
    const ans = roundAnswers(i);
    const predictors = [0, 1, 2].filter((s) => s !== chooser);
    return { chooser, pick: ans[0], preds: predictors.map((seat) => [seat, readers.includes(seat) ? ans[0] : ans[1]] as [number, string]) };
  });

const runMatch = (plan: RoundPlan[], extra: Step[] = []): MentalistaState => {
  let s = build(2, start);
  for (const r of plan) {
    s = commit(r.chooser, r.pick)(s);
    for (const [seat, a] of r.preds) s = predict(seat, a)(s);
    s = reveal(s); // guessing → reveal (scores)
    s = tick(s, s.round!.deadline); // reveal → next round (or over)
  }
  return extra.reduce((x, f) => f(x), s);
};

// Reads matrices → intended final tables (matchPoints = 2). Verified by mentalistaScenarios.test.ts.
// Win:  seat0 reads all 4 of its predictions (8); seat1 reads 2 (4); seat2 reads 1 (2) → seat 0 alone first.
const WIN_PLAN = planFromReads([[1, 2], [0], [0, 1], [], [0], [0]]);
// Tie:  seats 0 and 1 each read all 4 (8–8); seat 2 reads none (0) → 0 and 1 tied for first.
const TIE_PLAN = planFromReads([[1], [0], [0, 1], [1], [0], [0, 1]]);
// Mid:  seat0 8, seat2 4, seat1 2 → viewer seat 2 is strictly mid-table (rank 2 of 3).
const MID_PLAN = planFromReads([[1, 2], [0, 2], [0], [], [0], [0]]);

// Exported for the invariant test (fixtures must mean what their labels claim).
export const _mentalistaFixtures = {
  winState: runMatch(WIN_PLAN),
  tieState: runMatch(TIE_PLAN),
  midState: runMatch(MID_PLAN),
  dropState: runMatch(WIN_PLAN, [drop(2)]),
  revealHit: revealR1([[0, roundAnswers(1)[0]], [2, roundAnswers(1)[1]]]), // seat 0 reads it
  revealMiss: revealR1([[0, roundAnswers(1)[1]], [2, roundAnswers(1)[0]]]), // seat 0 misses
};

const liveSim = (sid: string, name: string, data: MentalistaSimConfig, note: string) =>
  scenario<MentalistaSimConfig>({
    id: sid, name, note, data,
    render: (d, ctx) => (
      <FixedLocaleProvider locale={ctx.locale as Locale}>
        <MentalistaSim key={`${JSON.stringify(d)}-${ctx.locale}`} config={d} locale={ctx.locale} log={ctx.log} />
      </FixedLocaleProvider>
    ),
  });

// ---------------------------------------------------------------------------------------------------------------------
// Actual room UI (invented snapshot). Everything above drives the PROTOTYPE screens from the local prototype engine.
// Everything below draws the REAL room board/results (`MentalistaRoom.tsx`) from hand-written server views typed as the
// exact live `MentalistaView` / `RoomStatePayload` contract. Visual/input-only: no runtime, socket, server, network or
// auth is involved, nothing is adjudicated here — scores, matches and places are literal fixture data (their internal
// consistency is checked by mentalistaScenarios.test.ts). Invented names and options only.
// ---------------------------------------------------------------------------------------------------------------------

export const ACTUAL_ROOM_PREFIX = "Actual room UI (invented snapshot) · ";
export const ACTUAL_ROOM_NOTE =
  "Visual/input-only: the REAL room board/results drawn from a hand-written, invented server view. No runtime, socket, server, scoring or network runs here — this proves layout and which input the board would send (see the action log), not live behaviour. The server clock is frozen 20 s before the choose/predict deadline and 5 s before the reveal deadline (the real reveal timer's default); results have no deadline.";
/** Frozen server clock for every actual-room screen: a constant instant safely in the future, never the device clock. */
export const ACTUAL_NOW = Date.parse("2031-05-01T12:00:00.000Z");
/** Open choose/predict screens: 20 s left on the frozen clock. */
const ACTUAL_DEADLINE = new Date(ACTUAL_NOW + 20_000).toISOString();
/** Reveal screens only: 5 s left (the real reveal timer defaults to 5 s, max 15 s). */
const ACTUAL_REVEAL_DEADLINE = new Date(ACTUAL_NOW + 5_000).toISOString();
/** What a matched prediction pays in these fixtures (the server's value in the render tests). Literal data, not a rule. */
export const ACTUAL_POINTS = 2;
export const ACTUAL_NAMES = ["Zorblax", "Quennimore", "Vexalin", "Tarrowby", "Mirelune", "Okkovar"] as const;
/** A room category always offers exactly three options (indices 0..2). */
export const ACTUAL_OPTIONS = ["Alpha", "Bravo", "Charlie"] as const;
const ACTUAL_CATEGORY: MentalistaPublicCategory = {
  id: "invented-signals",
  prompt: "Which signal did they pick?",
  options: ACTUAL_OPTIONS.map((name, i) => ({ id: `sig-${i}`, name })),
};

type SeatRow = MentalistaView["seats"][number];
type Entry = MentalistaResult["entries"][number];
type RoomLink = Parameters<typeof MentalistaRoomBoard>[0]["room"];

export interface ActualRoomData {
  view: MentalistaView;
  snapshot: RoomStatePayload;
  /** The viewer's socket state (`room.connected`). */
  connected: boolean;
  /** A room error code shown by the board, or null. */
  error: string | null;
}

/** The exact live view contract: every field of `MentalistaView`, nothing else (copied field by field). */
export const mvView = (v: MentalistaView): MentalistaView => ({
  phase: v.phase,
  round: v.round,
  totalRounds: v.totalRounds,
  chooserSeat: v.chooserSeat,
  category: v.category,
  iAmChooser: v.iAmChooser,
  seats: v.seats.map((s) => ({ seat: s.seat, status: s.status, isChooser: s.isChooser, committed: s.committed, predicted: s.predicted, score: s.score })),
  mySeat: v.mySeat,
  myChoice: v.myChoice,
  myPrediction: v.myPrediction,
  reveal: v.reveal,
  results: v.results,
  standings: v.standings,
  deadline: v.deadline,
});

/** Reveal/over seat overrides: only status and score. The live view never sets committed/predicted outside choose/predict. */
type ScoreRow = Partial<Pick<SeatRow, "status" | "score">>;

/**
 * Seat rows shaped like the live viewOf for `phase`: the chooser is flagged only in a non-terminal phase (terminal → every
 * isChooser is false); committed/predicted default to false and are only overridden by open (choose/predict) fixtures.
 */
const seatsOf = (count: number, chooser: number, phase: MentalistaView["phase"], over: Record<number, Partial<SeatRow>> = {}): SeatRow[] =>
  Array.from({ length: count }, (_, seat): SeatRow => ({
    seat, status: "in", isChooser: phase !== "over" && seat === chooser, committed: false, predicted: false, score: 0, ...over[seat],
  }));

const hit = (seat: number, option: number): Entry => ({ seat, prediction: option, matched: true, points: ACTUAL_POINTS });
const miss = (seat: number, option: number | null): Entry => ({ seat, prediction: option, matched: false, points: 0 });
/** An unscored row: what bank() emits for the round's chooser, and for a withdrawn seat (or anyone) with no prediction. */
const unscored = (seat: number): Entry => miss(seat, null);

/** The room snapshot around a view (seat rows with invented names); `offline` seats have no socket. */
const roomSnapshot = (view: MentalistaView, offline: readonly number[] = []): RoomStatePayload => {
  const over = view.phase === "over";
  const status: RoomStatus = over ? "completed" : "active";
  return {
    matchId: "pg-mv-match", lobbyId: "pg-mv-lobby", game: "mentalista", stateVersion: 1, status,
    phaseToken: view.round + 1, phaseDeadlineAt: view.deadline, serverNow: new Date(ACTUAL_NOW).toISOString(),
    me: { userId: `pg-u${view.mySeat}`, admitted: true, active: true, seat: view.mySeat, slot: view.mySeat, ready: true },
    seats: view.seats.map((s) => ({
      seat: s.seat, slot: s.seat, userId: `pg-u${s.seat}`, username: ACTUAL_NAMES[s.seat], avatarUrl: null,
      avatarCustomization: null, isGuest: true, ready: true,
      connected: s.status === "in" && !offline.includes(s.seat), admitted: true, active: s.status !== "withdrawn",
    })),
    // The board/results never read `snapshot.view`; the view lives once, in `data.view` (as in the render tests).
    view: null,
    result: over && view.standings
      ? {
          reason: "score",
          standings: view.standings.map((r) => ({
            seat: r.seat, userId: `pg-u${r.seat}`, points: r.points, roundWins: r.roundWins, place: r.place,
            withdrawn: view.seats.find((s) => s.seat === r.seat)?.status === "withdrawn",
          })),
        }
      : null,
  };
};

const data = (view: MentalistaView, opts: { connected?: boolean; offline?: readonly number[]; error?: string | null } = {}): ActualRoomData => ({
  view, snapshot: roomSnapshot(view, opts.offline), connected: opts.connected ?? true, error: opts.error ?? null,
});

/**
 * An open round 0 (choose or predict): nothing banked yet, so no target anywhere on the wire. The room plays ONE chooser
 * cycle (each seat chooses once), so totalRounds = seat count. (The prototype screens above intentionally use 2 cycles.)
 * Deadline: 20 s after the frozen clock (`ACTUAL_DEADLINE`).
 */
const openRound = (o: {
  phase: "choose" | "predict"; count: number; mySeat: number; myChoice?: number | null; myPrediction?: number | null;
  seats?: Record<number, Partial<SeatRow>>;
}): MentalistaView => {
  const chooser = 0;
  return mvView({
    phase: o.phase, round: 0, totalRounds: o.count, chooserSeat: chooser, category: ACTUAL_CATEGORY,
    iAmChooser: o.mySeat === chooser, seats: seatsOf(o.count, chooser, o.phase, o.seats), mySeat: o.mySeat,
    myChoice: o.myChoice ?? null, myPrediction: o.myPrediction ?? null, reveal: null, results: [], standings: null,
    deadline: ACTUAL_DEADLINE,
  });
};

/**
 * Round 0's reveal; scores are the literal per-seat totals banked so far. One chooser cycle: totalRounds = seat count.
 * The reveal deadline is 5 s out (`ACTUAL_REVEAL_DEADLINE`), not the 20 s choose/predict deadline.
 */
const revealRound = (o: { count: number; mySeat: number; reveal: MentalistaResult; seats: Record<number, ScoreRow> }): MentalistaView =>
  mvView({
    phase: "reveal", round: o.reveal.round, totalRounds: o.count, chooserSeat: o.reveal.chooser, category: ACTUAL_CATEGORY,
    iAmChooser: o.mySeat === o.reveal.chooser, seats: seatsOf(o.count, o.reveal.chooser, "reveal", o.seats), mySeat: o.mySeat,
    myChoice: null, myPrediction: null, reveal: o.reveal, results: [o.reveal], standings: null, deadline: ACTUAL_REVEAL_DEADLINE,
  });

// Every banked result carries one entry per admitted seat (seat order), as the live bank() emits: the chooser's row is
// always unscored (null, false, 0), and so is a withdrawn seat's row after it leaves.
// Over · you won (3 seats, one cycle): Zorblax (seat 0) reads twice, seat 1 once, seat 2 never.
const WIN_RESULTS: MentalistaResult[] = [
  { round: 0, chooser: 0, target: 0, voided: false, entries: [unscored(0), hit(1, 0), miss(2, 1)] },
  { round: 1, chooser: 1, target: 1, voided: false, entries: [hit(0, 1), unscored(1), miss(2, 2)] },
  { round: 2, chooser: 2, target: 2, voided: false, entries: [hit(0, 2), miss(1, 0), unscored(2)] },
];
// Over · tied for first with a dropped seat (4 seats, one cycle): seat 3 withdraws after round 1, so from round 2 on its
// row is unscored (null, false, 0) and its own choosing turn (round 3) is voided. Seats 0 and 1 tie on 4; seat 2 has 2;
// seat 3 has 0.
const TIE_DROP_RESULTS: MentalistaResult[] = [
  { round: 0, chooser: 0, target: 1, voided: false, entries: [unscored(0), hit(1, 1), hit(2, 1), miss(3, 0)] },
  { round: 1, chooser: 1, target: 0, voided: false, entries: [hit(0, 0), unscored(1), miss(2, 2), miss(3, 2)] },
  { round: 2, chooser: 2, target: 2, voided: false, entries: [hit(0, 2), hit(1, 2), unscored(2), unscored(3)] },
  { round: 3, chooser: 3, target: null, voided: true, entries: [unscored(0), unscored(1), unscored(2), unscored(3)] },
];

const overView = (o: { count: number; mySeat: number; results: MentalistaResult[]; seats: Record<number, ScoreRow>; standings: NonNullable<MentalistaView["standings"]> }): MentalistaView => {
  const last = o.results[o.results.length - 1];
  return mvView({
    // One chooser cycle: the schedule has exactly one round per seat (checked by mentalistaScenarios.test.ts).
    phase: "over", round: last.round, totalRounds: o.count, chooserSeat: last.chooser, category: null,
    iAmChooser: false, seats: seatsOf(o.count, last.chooser, "over", o.seats), mySeat: o.mySeat, myChoice: null, myPrediction: null,
    reveal: null, results: o.results, standings: o.standings, deadline: null,
  });
};

/** Exported for the invariant test: every actual-room fixture, keyed, with the label its screen shows. */
export const _actualRoomFixtures = {
  "choose-you": {
    label: "Choose · you are the Mentalist (3 seats)",
    data: data(openRound({ phase: "choose", count: 3, mySeat: 0 })),
  },
  "choose-wait": {
    label: "Choose · waiting for the Mentalist (4 seats)",
    data: data(openRound({ phase: "choose", count: 4, mySeat: 2 })),
  },
  "choose-locked": {
    label: "Choose · your secret pick is locked (3 seats)",
    data: data(openRound({ phase: "choose", count: 3, mySeat: 0, myChoice: 2, seats: { 0: { committed: true } } })),
  },
  "predict-you": {
    label: "Predict · you read the Mentalist (5 seats)",
    data: data(openRound({ phase: "predict", count: 5, mySeat: 3, seats: { 0: { committed: true }, 1: { predicted: true } } })),
  },
  "predict-locked": {
    label: "Predict · your prediction is locked, waiting (6 seats)",
    data: data(openRound({ phase: "predict", count: 6, mySeat: 4, myPrediction: 1, seats: { 0: { committed: true }, 2: { predicted: true }, 4: { predicted: true } } })),
  },
  "being-read": {
    label: "Predict · you are being read (3 seats)",
    data: data(openRound({ phase: "predict", count: 3, mySeat: 0, myChoice: 2, seats: { 0: { committed: true }, 1: { predicted: true } } })),
  },
  "reveal-hit": {
    label: "Reveal · you read it (4 seats)",
    data: data(revealRound({
      count: 4, mySeat: 1,
      reveal: { round: 0, chooser: 0, target: 1, voided: false, entries: [unscored(0), hit(1, 1), miss(2, 0), hit(3, 1)] },
      seats: { 1: { score: 2 }, 3: { score: 2 } },
    })),
  },
  "reveal-miss": {
    label: "Reveal · you missed (3 seats)",
    data: data(revealRound({
      count: 3, mySeat: 1,
      reveal: { round: 0, chooser: 0, target: 2, voided: false, entries: [unscored(0), miss(1, 0), hit(2, 2)] },
      seats: { 2: { score: 2 } },
    })),
  },
  "reveal-void": {
    label: "Reveal · voided, no pick in time (3 seats)",
    data: data(revealRound({
      count: 3, mySeat: 1,
      reveal: { round: 0, chooser: 0, target: null, voided: true, entries: [unscored(0), unscored(1), unscored(2)] },
      seats: {},
    })),
  },
  disconnected: {
    label: "Predict · your connection dropped, a seat is away (4 seats)",
    data: data(openRound({ phase: "predict", count: 4, mySeat: 1, seats: { 0: { committed: true }, 2: { status: "away" } } }), { connected: false, offline: [2] }),
  },
  "over-win": {
    label: "Result · you won (3 seats)",
    data: data(overView({
      count: 3, mySeat: 0, results: WIN_RESULTS,
      seats: { 0: { score: 4 }, 1: { score: 2 } },
      standings: [
        { seat: 0, points: 4, roundWins: 2, place: 1 },
        { seat: 1, points: 2, roundWins: 1, place: 2 },
        { seat: 2, points: 0, roundWins: 0, place: 3 },
      ],
    })),
  },
  "over-tie-drop": {
    label: "Result · tied for first, a player left (4 seats)",
    data: data(overView({
      count: 4, mySeat: 1, results: TIE_DROP_RESULTS,
      seats: { 0: { score: 4 }, 1: { score: 4 }, 2: { score: 2 }, 3: { status: "withdrawn" } },
      standings: [
        { seat: 0, points: 4, roundWins: 2, place: 1 },
        { seat: 1, points: 4, roundWins: 2, place: 1 },
        { seat: 2, points: 2, roundWins: 1, place: 3 },
        { seat: 3, points: 0, roundWins: 0, place: 4 },
      ],
    }), { offline: [3] }),
  },
} satisfies Record<string, { label: string; data: ActualRoomData }>;

export type ActualRoomKey = keyof typeof _actualRoomFixtures;

/**
 * The real board (or results) for one invented snapshot. The room link is inert: every callback only logs, the clock is
 * frozen at `ACTUAL_NOW`, nothing is retained or in flight, and no command ever leaves this component.
 */
function ActualRoomPreview({ d, locale, log }: { d: ActualRoomData; locale: Locale; log: ScenarioContext["log"] }) {
  const room = useMemo<RoomLink>(() => ({
    send: (command) => { log("room.send", command); },
    nowMs: () => ACTUAL_NOW,
    inFlight: 0,
    retained: null,
    connected: d.connected,
    resendRetained: () => { log("room.resendRetained"); },
    leave: () => { log("room.leave"); },
    isSlotPending: () => false,
  }), [d.connected, log]);
  if (d.view.phase === "over") {
    return (
      <MotionConfig reducedMotion="user">
        <MentalistaRoomResults view={d.view} snapshot={d.snapshot} locale={locale} onRoom={() => log("onRoom")} onExit={() => log("onExit")} />
      </MotionConfig>
    );
  }
  return (
    <MotionConfig reducedMotion="user">
      <Frame lang={locale} wide>
        <MentalistaRoomBoard view={d.view} snapshot={d.snapshot} room={room} locale={locale} error={d.error} />
      </Frame>
    </MotionConfig>
  );
}

const actualRoom = (key: ActualRoomKey) => {
  const fixture = _actualRoomFixtures[key];
  return scenario<ActualRoomData>({
    id: `actual-${key}`,
    name: `${ACTUAL_ROOM_PREFIX}${fixture.label}`,
    note: ACTUAL_ROOM_NOTE,
    data: fixture.data,
    render: (d, ctx) => (
      <FixedLocaleProvider locale={ctx.locale}>
        <ActualRoomPreview d={d} locale={ctx.locale} log={ctx.log} />
      </FixedLocaleProvider>
    ),
  });
};

export const MENTALISTA_ROOM: Scenario<never>[] = [
  liveSim("live-3", "▶ Play with 2 bots (3 players)", { seats: 3, roundCycles: 2, botSkill: 0.5, speed: 1 },
    "Live on the real engine on this device — you are seat 0, bots choose and predict. Press Start to see the intro/rules first. 2 complete cycles (6 rounds, each seat chooses twice), rotating chooser. botSkill 0–1, speed 1–3."),
  liveSim("live-4", "▶ Play with 3 bots (4 players)", { seats: 4, roundCycles: 2, botSkill: 0.5, speed: 1 },
    "4 players, 2 cycles → 8 rounds (each seat chooses twice)."),
  liveSim("live-5", "▶ Play with 4 bots (5 players)", { seats: 5, roundCycles: 2, botSkill: 0.55, speed: 1 },
    "5 players, 2 cycles → 10 rounds. With complete cycles every seat chooses twice (a fixed 6-round count would leave someone out)."),
  liveSim("live-6", "▶ Play with 5 bots (6 players)", { seats: 6, roundCycles: 2, botSkill: 0.6, speed: 1 },
    "6 players, 2 cycles → 12 rounds."),

  screen("intro", "Intro · rules + Start", { state: build(2), viewerSeat: 0, secondsLeft: null }, "Lobby: the real intro/rules with a Start control (Start logs onStart). Seat 0 is the deterministic first chooser."),
  screen("choose-you", "Choosing · you are the Mentalist (pick secretly)", { state: build(2, start), viewerSeat: 0, secondsLeft: 20 }),
  screen("choose-wait", "Choosing · waiting for the Mentalist", { state: build(2, start), viewerSeat: 1, secondsLeft: 18 }, "Seat 0 chooses; a predictor only sees a status dot, never the pick."),
  screen("guess-you", "Guessing · you predict their pick", { state: build(2, start, commit(0, R0[0])), viewerSeat: 1, secondsLeft: 24 }),
  screen("guess-locked", "Guessing · you locked a guess (can revise)", { state: build(2, start, commit(0, R0[0]), predict(1, R0[1])), viewerSeat: 1, secondsLeft: 15, myPrediction: R0[1] }),
  screen("guess-urgent", "Guessing · 4 s left", { state: build(2, start, commit(0, R0[0]), predict(1, R0[1])), viewerSeat: 1, secondsLeft: 4, myPrediction: R0[1] }),
  screen("being-read", "Guessing · you are being read", { state: build(2, start, commit(0, R0[0]), predict(1, R0[0])), viewerSeat: 0, secondsLeft: 12 }, "The chooser waits while the others guess; one has answered."),
  screen("reveal-hit", "Reveal · you read it (+2)", { state: _mentalistaFixtures.revealHit, viewerSeat: 0, secondsLeft: 7 }),
  screen("reveal-miss", "Reveal · you missed", { state: _mentalistaFixtures.revealMiss, viewerSeat: 0, secondsLeft: 7 }),
  screen("reveal-void-time", "Reveal · the Mentalist ran out of time", { state: build(2, start, reveal), viewerSeat: 0, secondsLeft: 7 }),
  screen("reveal-void-drop", "Reveal · the Mentalist left mid-choice", { state: build(2, start, drop(0)), viewerSeat: 1, secondsLeft: 7 }),
  screen("seat-away", "Guessing · a predictor disconnected", { state: build(2, start, commit(0, R0[0]), drop(2)), viewerSeat: 0, secondsLeft: 16 }, "A predictor leaving does not void the round; two active seats remain."),
  screen("offline", "Guessing · your connection dropped", { state: build(2, start, commit(0, R0[0])), viewerSeat: 1, secondsLeft: 20, connected: false }),
  screen("over-win", "Result · you won", { state: _mentalistaFixtures.winState, viewerSeat: 0, secondsLeft: null }),
  screen("over-tie", "Result · tied for first", { state: _mentalistaFixtures.tieState, viewerSeat: 0, secondsLeft: null }),
  screen("over-lost", "Result · mid-table", { state: _mentalistaFixtures.midState, viewerSeat: 2, secondsLeft: null }),
  screen("over-drop", "Result · a player left (ranked last)", { state: _mentalistaFixtures.dropState, viewerSeat: 0, secondsLeft: null }),

  // Actual room UI (invented snapshot): the REAL room board/results, visual/input-only (see ACTUAL_ROOM_NOTE).
  ...(Object.keys(_actualRoomFixtures) as ActualRoomKey[]).map(actualRoom),
];
