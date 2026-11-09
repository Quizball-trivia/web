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
import { MentalistaSim, type MentalistaSimConfig } from "./MentalistaSim";
import { MENTALISTA_CATEGORIES, SEAT_META, categoriesFor } from "./fixtures/mentalista";
import { scenario, type Scenario } from "./types";

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
];
