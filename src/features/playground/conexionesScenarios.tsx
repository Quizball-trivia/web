"use client";

import { ConexionesDuelResult, ConexionesDuelView } from "@/features/conexiones/ConexionesDuel";
import { ConexionesEndView, ConexionesPlayView } from "@/features/conexiones/ConexionesSolo";
import { conexionesDailyGame } from "@/features/conexiones/conexiones.game";
import {
  duelForfeit, duelName, duelNext, duelSubmit, duelTimeout, newDuel, newSolo, soloGuess,
  type CxBoard, type CxDuelState, type CxSoloOutcome, type CxSoloState,
} from "@/features/conexiones/conexiones.logic";
import { DailyIntro } from "@/features/wordgames/daily/WordDailyShell";
import { Frame } from "@/features/wordgames/ui";
import { DAILY_INDEX, DUEL_BOARDS_OF, DuelSim, SEATS, SoloSim, useBoards, type DuelSimConfig } from "./ConexionesSim";
import { scenario, type Scenario, type ScenarioContext } from "./types";

const T0 = Date.parse("2031-05-01T12:00:00.000Z");
const keep = <T,>(xs: T[]) => xs;

const friendsStandIn = (ctx: ScenarioContext) => (
  <button type="button" onClick={() => ctx.log("openFriendRoom", "conexiones")} className="mt-3 h-12 w-full rounded-full bg-brand-blue text-sm font-black uppercase tracking-wide text-white">
    Play with a friend (1v1)
  </button>
);

// ── Solo fixtures: each script plays real moves on whichever board is loaded ─────────────────────────────────────

type Pick = (b: CxBoard) => string[];
const group = (g: number): Pick => (b) => [...[...b.groups].sort((x, y) => x.tier - y.tier)[g].members];
/** Three of group g and one of group h: "one away". */
const near = (g: number, h: number): Pick => (b) => [...group(g)(b).slice(0, 3), group(h)(b)[3]];
const mixed = (a: number, b2: number): Pick => (b) => [...group(a)(b).slice(0, 2), ...group(b2)(b).slice(0, 2)];
const mixedB = (a: number, b2: number): Pick => (b) => [...group(a)(b).slice(0, 2), ...group(b2)(b).slice(2, 4)];

interface SoloScript { tries: Pick[]; selected?: Pick; outcome?: boolean; elapsedMs?: number }
function playSolo(b: CxBoard, script: SoloScript) {
  let s = newSolo(b, "2026-11-01", T0);
  let outcome: CxSoloOutcome | null = null;
  script.tries.forEach((p, i) => { const r = soloGuess(b, s, p(b), T0 + (i + 1) * (script.elapsedMs ?? 40_000)); s = r.state; outcome = r.outcome; });
  return { state: s, outcome: script.outcome ? outcome : null, selected: script.selected ? script.selected(b) : script.outcome && outcome !== "right" ? script.tries.at(-1)!(b) : [] };
}

function SoloFixture({ screen, script, ctx }: { screen: "intro" | "play" | "end"; script: SoloScript; ctx: ScenarioContext }) {
  const { boards } = useBoards();
  const b = boards[DAILY_INDEX];
  const { state, outcome, selected } = playSolo(b, script);
  return (
    <Frame lang={ctx.locale}>
      {screen === "intro" ? (
        <DailyIntro game={conexionesDailyGame(ctx.locale)} locale={ctx.locale} number={1} status="new" busy={false} notice={null} guestOnPastBoard={false} guestLockedOut={false}
          friends={friendsStandIn(ctx)} onStart={() => ctx.log("onStart")} onArchive={() => ctx.log("onArchive")} onExit={() => ctx.log("onExit")} />
      ) : screen === "play" ? (
        <ConexionesPlayView locale={ctx.locale} number={1} board={b} state={state} selected={selected} outcome={outcome} shakeKey={0} pending={false}
          onToggle={(id) => ctx.log("onToggle", id)} onSubmit={() => ctx.log("onSubmit")} onShuffle={() => ctx.log("onShuffle")} onClear={() => ctx.log("onClear")} onExit={() => ctx.log("onExit")} />
      ) : (
        <ConexionesEndView locale={ctx.locale} number={1} board={b} state={{ ...(state as CxSoloState), rank: state.status === "won" ? 37 : undefined, ranked: state.status === "won" }}
          guestOnPastBoard={false} friends={friendsStandIn(ctx)} leaderboard={null} onArchive={() => ctx.log("onArchive")} onExit={() => ctx.log("onExit")} />
      )}
    </Frame>
  );
}

const solo = (id: string, name: string, screen: "intro" | "play" | "end", script: SoloScript = { tries: [] }) =>
  scenario<Record<string, never>>({ id, name, data: {}, render: (_d, ctx) => <SoloFixture screen={screen} script={script} ctx={ctx} /> });

export const CONEXIONES_SOLO: Scenario<never>[] = [
  scenario<Record<string, never>>({ id: "live", name: "▶ Play the daily", note: "Live: real board from the local private file when present (public/dev-data, never committed), invented otherwise. 4 mistakes.", data: {},
    render: (_d, ctx) => <SoloSim key={ctx.locale} locale={ctx.locale} log={ctx.log} friends={friendsStandIn(ctx)} /> }),
  solo("intro", "Intro", "intro"),
  solo("fresh", "Board · nothing picked", "play"),
  solo("picked", "Board · 4 picked, ready to submit", "play", { tries: [], selected: mixed(0, 2) }),
  solo("one-away", "One away (mistake 1)", "play", { tries: [near(2, 3)], outcome: true }),
  solo("right", "Right · first group locks in", "play", { tries: [group(0)], outcome: true }),
  solo("wrong", "Not a group (mistake 2)", "play", { tries: [group(0), mixed(1, 3), mixed(2, 3)], outcome: true }),
  solo("repeat", "Already tried (no mistake)", "play", { tries: [mixed(1, 2), mixed(1, 2)], outcome: true }),
  solo("last-life", "Two found · one mistake left", "play", { tries: [near(3, 2), group(0), mixed(2, 3), group(1), near(2, 3)] }),
  solo("end-won", "Result · solved with 1 mistake", "end", { tries: [group(0), near(2, 3), group(1), group(2), group(3)], elapsedMs: 45_000 }),
  solo("end-perfect", "Result · perfect board", "end", { tries: [group(0), group(1), group(2), group(3)], elapsedMs: 30_000 }),
  solo("end-lost", "Result · lost (2 of 4)", "end", { tries: [group(0), near(2, 3), group(1), mixed(2, 3), near(3, 2), mixedB(2, 3)] }),
];

// ── Duel fixtures ─────────────────────────────────────────────────────────────────────────────────────────────────

type Step = (s: CxDuelState, b: CxBoard) => CxDuelState;
const at = (s: CxDuelState) => s.deadline - 18_000;
const hit = (g: number): Step => (s, b) => duelSubmit(s, s.turn, group(g)(b), at(s), keep);
const miss = (g: number, h: number): Step => (s, b) => duelSubmit(s, s.turn, near(g, h)(b), at(s), keep);
const flop = (g: number, h: number): Step => (s, b) => duelSubmit(s, s.turn, mixed(g, h)(b), at(s), keep);
const nameIt = (right: boolean): Step => (s, b) => {
  const g = b.groups.find((x) => !s.solved.some((y) => y.groupId === x.id))!;
  return duelName(s, s.turn, right ? g.link.en : g.decoys[0].en, at(s));
};
const timeout: Step = (s) => duelTimeout(s, s.deadline);
const next: Step = (s) => duelNext(s, s.deadline);
const openOf = (s: CxDuelState) => s.boards[s.index].groups.filter((g) => !s.solved.some((x) => x.groupId === g.id)).sort((a, b) => a.tier - b.tier);
/** Plays a whole board: each seat either finds the easiest open group or misses (by one, a different four each time). */
const playBoard = (mine: boolean, theirs: boolean, nameMine: boolean, nameTheirs: boolean): Step => (s0) => {
  let s = s0;
  for (let k = 0; s.phase === "turn" && k < 20; k++) {
    const open = openOf(s);
    const ids = (s.turn === 0 ? mine : theirs) ? [...open[0].members] : [...open[0].members.filter((_, i) => i !== k % 4), open[1].members[k % 4]];
    s = duelSubmit(s, s.turn, ids, at(s), keep);
  }
  if (s.phase === "name") s = nameIt(s.turn === 0 ? nameMine : nameTheirs)(s, s.boards[s.index]);
  return duelNext(s, s.deadline);
};
/** A board where both find two groups each (me first) and the namer gets the last one right. */
const evenBoard: Step[] = [hit(0), hit(1), hit(2), nameIt(true), next];

interface DuelScript { steps: Step[]; selected?: Pick; secondsLeft?: number; forfeitBy?: 0 | 1 }
function playDuel(boards: CxBoard[], script: DuelScript) {
  let s = newDuel(DUEL_BOARDS_OF(boards), 0, T0);
  for (const step of script.steps) s = step(s, s.boards[s.index]);
  if (script.forfeitBy !== undefined) s = duelForfeit(s, script.forfeitBy);
  return s;
}

function DuelFixture({ script, ctx }: { script: DuelScript; ctx: ScenarioContext }) {
  const { boards } = useBoards();
  const s = playDuel(boards, script);
  if (s.phase === "over") return <Frame lang={ctx.locale}><ConexionesDuelResult locale={ctx.locale} state={s} me={0} seats={SEATS} onRoom={() => ctx.log("onRoom")} onLeave={() => ctx.log("onLeave")} /></Frame>;
  return (
    <Frame lang={ctx.locale}>
      <ConexionesDuelView locale={ctx.locale} state={s} me={0} seats={SEATS} selected={script.selected ? script.selected(s.boards[s.index]) : []} msLeft={(script.secondsLeft ?? 42) * 1000} pending={false}
        onToggle={(id) => ctx.log("onToggle", id)} onSubmit={() => ctx.log("onSubmit")} onClear={() => ctx.log("onClear")} onName={(p) => ctx.log("onName", p)} onNext={() => ctx.log("onNext")} onExit={() => ctx.log("onExit")} />
    </Frame>
  );
}

const duel = (id: string, name: string, script: DuelScript) =>
  scenario<Record<string, never>>({ id, name, data: {}, render: (_d, ctx) => <DuelFixture script={script} ctx={ctx} /> });

const live = (id: string, name: string, config: DuelSimConfig, note: string) =>
  scenario<DuelSimConfig>({ id, name, note, data: config, render: (d, ctx) => <DuelSim key={`${JSON.stringify(d)}-${ctx.locale}`} config={d} locale={ctx.locale} log={ctx.log} /> });

const repeat = <T,>(xs: T[], n: number) => Array.from({ length: n }, () => xs).flat();

export const CONEXIONES_DUEL: Scenario<never>[] = [
  live("live", "▶ Play a 1v1 vs a bot (you start)", { botSkill: 1, speed: 1, youStart: true }, "Live: 5 boards, one try per turn, 60 s turns, 30 s to name the last link. botSkill 0.5–1.5, speed ×."),
  live("live-bot-first", "▶ Play a 1v1 vs a bot (bot starts)", { botSkill: 1, speed: 1, youStart: false }, "Live: the bot opens board 1."),
  duel("my-turn", "Board 1 · your turn, nothing picked", { steps: [] }),
  duel("my-turn-picked", "Board 1 · 4 picked", { steps: [], selected: mixed(0, 1) }),
  duel("hurry", "Your turn · 7 s left", { steps: [], selected: group(0), secondsLeft: 7 }),
  duel("rival-turn", "You found a group (+1) · rival thinking", { steps: [hit(0)] }),
  duel("rival-one-away", "Rival was one away · your turn (their 4 outlined)", { steps: [hit(0), miss(2, 3)] }),
  duel("my-miss", "You missed · rival's turn", { steps: [flop(1, 2)] }),
  duel("rival-scored", "Rival found a group · your turn", { steps: [flop(1, 2), hit(0)] }),
  duel("repeat", "You tried a four already tried", { steps: [flop(1, 2), flop(2, 3), (s, b) => duelSubmit(s, 0, mixed(1, 2)(b), at(s), keep)], selected: mixed(1, 2) }),
  duel("timeout", "Rival ran out of time · your turn", { steps: [flop(1, 2), timeout] }),
  duel("misses-low", "2 misses left on the board", { steps: [flop(1, 2), flop(2, 3), miss(1, 3), flop(1, 3)] }),
  duel("name-mine", "Last 4 · you name the link", { steps: [hit(0), hit(1), flop(2, 3), hit(2)] }),
  duel("name-rival", "Last 4 · rival is naming", { steps: [hit(0), hit(1), hit(2)] }),
  duel("sheet-named", "Board over · you named it (+1)", { steps: [hit(0), hit(1), flop(2, 3), hit(2), nameIt(true)] }),
  duel("sheet-misnamed", "Board over · rival picked the wrong link", { steps: [hit(0), hit(1), hit(2), nameIt(false)] }),
  duel("sheet-misses", "Board over · 6 misses, rest revealed", { steps: [hit(0), flop(1, 2), flop(2, 3), miss(1, 3), flop(1, 3), miss(3, 1), miss(2, 1)] }),
  duel("board-2", "Board 2 · rival opens", { steps: [...evenBoard] }),
  duel("result-win", "Result · you win 11–8", { steps: [...repeat(evenBoard, 4), hit(0), flop(1, 2), hit(1), flop(2, 3), hit(2), nameIt(false), next] }),
  duel("result-lose", "Result · you lose 5–15", { steps: repeat([playBoard(false, true, true, true)], 5) }),
  duel("result-draw", "Result · draw 10–10", { steps: repeat(evenBoard, 5) }),
  duel("result-forfeit", "Result · rival left (you win by forfeit)", { steps: [hit(0), hit(1)], forfeitBy: 1 }),
];
