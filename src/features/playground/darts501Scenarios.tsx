"use client";

import { D501Board, D501Results, type D501RoomLink } from "@/features/darts501/D501Room";
import { D501EndView, D501PlayView, d501DailyGame } from "@/features/darts501/D501Solo";
import type { D501SoloState, D501View, Dart } from "@/features/darts501/d501.view";
import { DailyIntro } from "@/features/wordgames/daily/WordDailyShell";
import { Frame } from "@/features/wordgames/ui";
import { D501RoomSim, D501SoloSim, type D501RoomConfig } from "./Darts501Sim";
import { d501Snapshot, roomView, soloState, throws } from "./fixtures/darts501";
import { PLAYERS } from "./fixtures/universe";
import { scenario, type Scenario, type ScenarioContext } from "./types";

const friends = (ctx: ScenarioContext) => (
  <button type="button" onClick={() => ctx.log("openFriendRoom", "football501")} style={{ fontFamily: "'Poppins', sans-serif" }}
    className="mt-3 h-12 w-full rounded-full bg-white/10 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/15">Play with friends</button>
);
const boardStandIn = <div className="mt-6 rounded-2xl border border-dashed border-white/25 px-4 py-6 text-center text-xs text-white/60">Daily leaderboard: live data only (WordDailyLeaderboard)</div>;

interface SoloData { screen: "intro" | "play" | "end"; state: D501SoloState; pending: boolean }
const solo = (id: string, name: string, screen: SoloData["screen"], state: D501SoloState, pending = false) =>
  scenario<SoloData>({
    id, name, data: { screen, state, pending },
    render: (d, ctx) => (
      <Frame lang={ctx.locale}>
        {d.screen === "intro" ? (
          <DailyIntro game={d501DailyGame(ctx.locale)} locale={ctx.locale} number={1} status="new" busy={false} notice={null} guestOnPastBoard={false} guestLockedOut={false} friends={friends(ctx)}
            onStart={() => ctx.log("onStart")} onArchive={() => ctx.log("onArchive")} onExit={() => ctx.log("onExit")} />
        ) : d.screen === "play" ? (
          <D501PlayView locale={ctx.locale} number={1} state={d.state} pending={d.pending} notice={null} onSay={(t) => ctx.log("onSay", t)}
            onGiveUp={() => ctx.log("onGiveUp")} onResult={() => ctx.log("onResult")} onExit={() => ctx.log("onExit")} />
        ) : (
          <D501EndView locale={ctx.locale} number={1} state={d.state} guestOnPastBoard={false} leaderboard={boardStandIn} friends={friends(ctx)}
            onArchive={() => ctx.log("onArchive")} onExit={() => ctx.log("onExit")} />
        )}
      </Frame>
    ),
  });

/** A free answer on top of the darts (repeat / unknown / ambiguous): nothing is thrown. */
const free = (darts: Dart[], verdict: "repeat" | "unknown" | "ambiguous", text: string): Dart => {
  const left = darts.at(-1)?.after ?? 501;
  return { id: 900, by: 0, text, name: verdict === "repeat" ? text : null, stat: null, verdict, before: left, after: left };
};

// 501 → 341 → 214 → 108 → 63, then the finishing darts.
const OPEN = throws([[0, 160], [1, 127], [2, 106], [3, 45]]);
const OUTS = { outs: 3 };
const CHECKOUT = throws([[0, 160], [1, 127], [2, 106], [3, 45], [4, 58]]);
const PERFECT = throws([[0, 160], [1, 127], [2, 106], [3, 45], [4, 63]]);
const BUST = throws([[0, 160], [1, 127], [2, 106], [3, 45], [5, 88]]);
const OVER = throws([[0, 160], [6, 214]]);
const MISS = throws([[0, 160], [1, 127], [7, null]]);
const NO_FINISH = throws([[0, 160], [1, 127], [2, 106], [3, 45], [5, 88], [7, null], [8, 40], [9, null], [10, 12], [11, null]]);

export const D501_SOLO: Scenario<never>[] = [
  scenario<{ category: number }>({ id: "live", name: "▶ Play the daily (Lab category 1)", note: "Live: PL goals (lab data). Over 180 busts (try Shearer). category 0–2", data: { category: 0 },
    render: (d, ctx) => <D501SoloSim key={`${d.category}-${ctx.locale}`} locale={ctx.locale} category={d.category} log={ctx.log} friends={friends(ctx)} /> }),
  scenario<{ category: number; pro: boolean }>({ id: "live-pro", name: "▶ Play · UCL appearances, pro rules (bogeys score 0)", data: { category: 2, pro: true },
    render: (d, ctx) => <D501SoloSim key={`${d.category}-${d.pro}-${ctx.locale}`} locale={ctx.locale} category={d.category} pro={d.pro} log={ctx.log} friends={friends(ctx)} /> }),
  solo("intro", "Intro", "intro", soloState([])),
  solo("fresh", "Play · first dart", "play", soloState([])),
  solo("scoring", "Play · 4 darts in, on 63 (checkout window)", "play", soloState(OPEN, OUTS)),
  solo("bust", "Play · bust (past −10), score kept", "play", soloState(BUST)),
  solo("over180", "Play · over 180 = bust", "play", soloState(OVER)),
  solo("miss", "Play · real player, not in the category", "play", soloState(MISS)),
  solo("bogey", "Play · pro rules: 173 can't be thrown (no score)", "play", soloState(throws([[0, 160], [1, 173]], {}).map((d, i) => (i === 1 ? { ...d, verdict: "bogey" as const, after: d.before } : d)))),
  solo("repeat", "Play · already thrown (free)", "play", { ...soloState(OPEN), last: free(OPEN, "repeat", PLAYERS[1]) }),
  solo("unknown", "Play · unknown name (free)", "play", { ...soloState(OPEN), last: free(OPEN, "unknown", "Nadie Inventado") }),
  solo("busy", "Play · answer sent, waiting", "play", soloState(OPEN), true),
  solo("sheet-checkout", "End sheet · checked out in 5", "play", soloState(CHECKOUT, { status: "done", endReason: "checkout" })),
  solo("end-checkout", "Result · checked out in 5", "end", soloState(CHECKOUT, { status: "done", endReason: "checkout", rank: 14 })),
  solo("end-perfect", "Result · exactly 0", "end", soloState(PERFECT, { status: "done", endReason: "checkout", rank: 2 })),
  solo("end-darts", "Result · out of darts, finishes shown", "end", soloState(NO_FINISH, { status: "done", endReason: "darts", rank: 210, finishes: [{ name: PLAYERS[12], stat: 2 }, { name: PLAYERS[13], stat: 8 }] })),
  solo("end-practice", "Result · past day (practice)", "end", soloState(CHECKOUT, { status: "done", endReason: "checkout", ranked: false })),
];

interface RoomData { n: number; view: D501View }
const room = (id: string, name: string, n: number, view: D501View) =>
  scenario<RoomData>({
    id, name, data: { n, view },
    render: (d, ctx) => {
      // A static screen: the turn clock always shows 12 s.
      const view = d.view.deadline ? { ...d.view, deadline: new Date(Date.now() + 12_000).toISOString() } : d.view;
      const snapshot = d501Snapshot(d.n, view);
      if (d.view.phase === "over") return <D501Results view={d.view} snapshot={snapshot} locale={ctx.locale} onRoom={() => ctx.log("onRoom")} onExit={() => ctx.log("onExit")} />;
      const link: D501RoomLink = {
        send: (c) => { ctx.log("send", c); return true; }, nowMs: () => Date.now(), inFlight: 0, retained: null, connected: true, resendRetained: () => undefined, leave: () => ctx.log("leave"),
      };
      return <Frame lang={ctx.locale} wide={d.view.format === "party"}><D501Board view={view} snapshot={snapshot} room={link} locale={ctx.locale} error={null} /></Frame>;
    },
  });
const live = (id: string, name: string, config: D501RoomConfig, note: string) =>
  scenario<D501RoomConfig>({ id, name, note, data: config, render: (d, ctx) => <D501RoomSim key={`${JSON.stringify(d)}-${ctx.locale}`} config={d} locale={ctx.locale} log={ctx.log} /> });

function roomScreens(n: number): Scenario<never>[] {
  const seq: Array<[number, number | null, number]> = n === 2
    ? [[0, 160, 0], [1, 140, 1], [2, 127, 0], [3, 175, 1], [4, 106, 0], [5, 95, 1]]
    : ([[0, 160, 0], [1, 140, 1], [2, 120, 2], [3, 99, 3], [4, 127, 0], [5, 175, 1], [6, 60, 2], [7, null, 3]] as Array<[number, number | null, number]>).filter(([, , seat]) => seat < n);
  const darts = throws(seq);
  const standings = (legs: number[], left: number[]) => legs.map((l, seat) => ({ seat, points: l, roundWins: l, place: 1 + legs.filter((o, j) => o > l || (o === l && left[j] < left[seat])).length }));
  const legs = n === 2 ? [2, 1] : [2, 1, 0, 0, 0, 0].slice(0, n);
  const left = [40, 120, 300, 410, 500, 510].slice(0, n);
  const at = (seat: number) => roomView(n, darts).seats[seat].remaining;
  const over = (my: number[]) => roomView(n, darts, { phase: "over", turn: null, standings: standings(my, left), seats: roomView(n, darts).seats.map((s) => ({ ...s, legsWon: my[s.seat], leftTotal: left[s.seat] })) });
  return [
    room("intro", "Leg intro countdown", n, roomView(n, [], { phase: "intro", leg: 0, turn: null })),
    room("my-turn", "Your throw (on the window)", n, roomView(n, darts)),
    room("their-turn", "Someone else's throw", n, roomView(n, darts, { turn: 1 })),
    room("last-throw", "A rival checked out: your last throw of the round", n, (() => {
      const fin = throws(at(1) > 177 ? [[12, 180, 1], [11, at(1) - 177, 1]] : [[11, at(1) + 3, 1]], { 1: at(1) });
      const v = roomView(n, [...darts, ...fin]);
      return { ...v, finishing: [{ seat: 1, at: -3 }] };
    })()),
    room("their-bust", "A rival busted", n, roomView(n, [...darts, ...throws([[9, at(1) + 40, 1]], { 1: at(1) })], { turn: 0 })),
    room("busy", "Dart sent, waiting for the server", n, roomView(n, darts)),
    room("leg-won", "Leg end · you checked out", n, (() => {
      const finish = throws(at(0) > 180 ? [[10, 180, 0], [11, at(0) - 176, 0]] : [[10, at(0) + 4, 0]], { 0: at(0) });
      const v = roomView(n, [...darts, ...finish]);
      return { ...v, phase: "legEnd", turn: null, legEnd: { winner: 0, reason: "checkout" }, seats: v.seats.map((s) => (s.seat === 0 ? { ...s, legsWon: s.legsWon + 1 } : s)) };
    })()),
    room("leg-lost", "Leg end · rival checked out", n, roomView(n, darts, { phase: "legEnd", turn: null, legEnd: { winner: 1, reason: "checkout" } })),
    room("leg-darts", "Leg end · no checkout, lowest wins", n, roomView(n, darts, { phase: "legEnd", turn: null, legEnd: { winner: 0, reason: "darts" } })),
    room("result-win", "Result · you won", n, over(legs)),
    room("result-lose", "Result · you lost", n, over(n === 2 ? [1, 2] : [0, 2, 1, 0, 0, 0].slice(0, n))),
  ];
}

export const D501_DUEL: Scenario<never>[] = [
  live("live-1v1", "▶ Play a 1v1 vs a bot", { seats: 2, botSkill: 1, speed: 1, pro: false }, "Live: 3 Lab categories, best of 3 legs, 20 s turns, 10 darts each a leg. botSkill 0.5–2"),
  ...roomScreens(2),
];

export const D501_ROOM: Scenario<never>[] = [
  live("live-4", "▶ Play with 3 bots", { seats: 4, botSkill: 1, speed: 1 }, "Live: 4 players, 3 legs, first to check out takes each leg"),
  live("live-6", "▶ Play with 5 bots (one leaves on leg 2)", { seats: 6, botSkill: 1, speed: 1, leaveAtLeg: { seat: 5, leg: 1 } }, "Live: 6 players; seat 5 leaves when leg 2 starts"),
  ...roomScreens(4).map((sc) => ({ ...sc, id: `4-${sc.id}`, name: `4p · ${sc.name}` })),
  ...roomScreens(6).filter((sc) => ["my-turn", "their-turn", "leg-won", "result-win"].includes(sc.id)).map((sc) => ({ ...sc, id: `6-${sc.id}`, name: `6p · ${sc.name}` })),
];
