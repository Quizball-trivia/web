import { DatoFalsoBoard, DatoFalsoResults, type DfRoomLink } from "@/features/dato-falso/DatoFalsoRoom";
import { DatoFalsoEndView, DatoFalsoPlayView } from "@/features/dato-falso/DatoFalsoSolo";
import { datoFalsoDailyGame } from "@/features/dato-falso/datoFalso.game";
import { newRoom, newSolo, roomJoker, roomPick, roomTick, soloJoker, soloNext, soloSettle, viewFor, withdraw, type RoomSim } from "@/features/dato-falso/datoFalso.sim";
import type { DfRoomView, DfSoloState } from "@/features/dato-falso/datoFalso.view";
import { DailyIntro } from "@/features/wordgames/daily/WordDailyShell";
import { Frame } from "@/features/wordgames/ui";
import { DatoFalsoRoomSim, DatoFalsoSoloSim, boardStandIn, dfRoomSnapshot, type DfRoomConfig } from "./DatoFalsoSim";
import { INVENTED_DECK as DECK } from "./fixtures/datoFalso.deck";
import { scenario, type Scenario, type ScenarioContext } from "./types";

const T0 = Date.parse("2031-05-01T12:00:00.000Z");
/** Fixed "random": the same two options are cut on every load. */
const fixed = () => 0.42;

/** Fixture states are built once in English; the reveal line follows the playground's language. */
const explainIn = (cardId: string | undefined, locale: string) => {
  const c = DECK.find((x) => x.id === cardId);
  return c ? (locale === "es" ? c.explain.es : c.explain.en) : "";
};
const localSolo = (s: DfSoloState, locale: string): DfSoloState => (s.reveal ? { ...s, reveal: { ...s.reveal, explain: explainIn(s.card.id, locale) } } : s);
const localRoom = (v: DfRoomView, locale: string): DfRoomView => (v.reveal ? { ...v, reveal: { ...v.reveal, explain: explainIn(v.card?.id, locale) } } : v);

const friendsStandIn = (ctx: ScenarioContext) => (
  <button type="button" onClick={() => ctx.log("openFriendRoom", "dato_falso")} className="mt-3 h-12 w-full rounded-full bg-brand-blue text-sm font-black uppercase tracking-wide text-white">
    Play with friends (2–6)
  </button>
);

type Step = (s: DfSoloState) => DfSoloState;
const solo = (...steps: Step[]) => steps.reduce((s, f) => f(s), newSolo(DECK, "2026-11-03", T0));
const pick = (option: "fake" | "wrong" | null, locale = "en"): Step => (s) =>
  soloSettle(DECK, s, option === null ? null : option === "fake" ? DECK[s.index].fake : DECK[s.index].options.find((o) => o.id !== DECK[s.index].fake && !s.removed.includes(o.id))!.id, locale);
const next: Step = (s) => soloNext(DECK, s, T0);
/** Plays k cards right and moves on: the fixture then sits on card k + 1. */
const go = (k: number): Step => (s) => Array.from({ length: k }).reduce<DfSoloState>((x) => next(pick("fake")(x)), s);
const cut: Step = (s) => soloJoker(DECK, s, "cut", fixed);
const double: Step = (s) => soloJoker(DECK, s, "double", fixed);
const playThrough = (pattern: Array<"fake" | "wrong" | null>, extra: Record<number, Step> = {}) =>
  pattern.reduce((s, p, i) => { const before = extra[i] ? extra[i](s) : s; const settled = pick(p)(before); return i + 1 < pattern.length ? next(settled) : settled; }, solo());

interface SoloData { screen: "intro" | "play" | "end"; state: DfSoloState; secondsLeft: number }
const soloScreen = (id: string, name: string, screen: SoloData["screen"], state: DfSoloState, secondsLeft = 18) =>
  scenario<SoloData>({
    id, name, data: { screen, state, secondsLeft },
    render: (d, ctx) => (
      <Frame lang={ctx.locale}>
        {d.screen === "intro" ? (
          <DailyIntro game={datoFalsoDailyGame(ctx.locale)} locale={ctx.locale} number={3} status="new" busy={false} notice={null} guestOnPastBoard={false} guestLockedOut={false}
            friends={friendsStandIn(ctx)} onStart={() => ctx.log("onStart")} onArchive={() => ctx.log("onArchive")} onExit={() => ctx.log("onExit")} />
        ) : d.screen === "play" ? (
          <DatoFalsoPlayView locale={ctx.locale} number={3} state={localSolo(d.state, ctx.locale)} pending={false}
            nowMs={() => (d.state.deadline ? Date.parse(d.state.deadline) - d.secondsLeft * 1000 : T0)}
            onJoker={(j) => ctx.log("onJoker", j)} onPick={(o) => ctx.log("onPick", o)} onNext={() => ctx.log("onNext")} onExit={() => ctx.log("onExit")} />
        ) : (
          <DatoFalsoEndView locale={ctx.locale} number={3} state={d.state} guestOnPastBoard={false} friends={friendsStandIn(ctx)} leaderboard={boardStandIn}
            onArchive={() => ctx.log("onArchive")} onExit={() => ctx.log("onExit")} />
        )}
      </Frame>
    ),
  });

const mixed = playThrough(["fake", "fake", "wrong", "fake", null, "fake", "fake", "fake", "wrong", "fake"], { 2: double, 8: cut });
const perfect = playThrough(Array(10).fill("fake"), { 0: double });

export const DATO_FALSO_SOLO: Scenario<never>[] = [
  scenario<Record<string, never>>({ id: "live", name: "▶ Play the daily (11 real prototype cards)", note: "Live: 10 cards, 30 s each, both jokers. Real facts, fact-checked; these cards are burned for the real daily.", data: {},
    render: (_d, ctx) => <DatoFalsoSoloSim key={ctx.locale} locale={ctx.locale} log={ctx.log} friends={friendsStandIn(ctx)} /> }),
  soloScreen("intro", "Intro", "intro", solo()),
  soloScreen("card", "Card 1 · fresh (tap one, then lock it in)", "play", solo()),
  soloScreen("card-hurry", "Card 1 · 4 s left", "play", solo(), 4),
  soloScreen("cut", "Remove 2 used · two true options gone", "play", solo(go(4), cut)),
  soloScreen("double", "Double or nothing on", "play", solo(go(1), double)),
  soloScreen("right", "Right · +1", "play", solo(pick("fake"))),
  soloScreen("right-double", "Right with ×2 · +2", "play", solo(go(6), double, pick("fake"))),
  soloScreen("wrong", "Wrong · the fake revealed", "play", solo(go(3), pick("wrong"))),
  soloScreen("wrong-double", "Wrong with ×2 · −1", "play", solo(go(8), double, pick("wrong"))),
  soloScreen("time-up", "Time ran out", "play", solo(go(1), pick(null))),
  soloScreen("shirts", "Shirt-number card (no portrait on file)", "play", solo(go(5))),
  soloScreen("last", "Last card settled · See result", "play", mixed),
  soloScreen("end", "Result · 7 pts with misses and jokers", "end", { ...mixed, status: "done", rank: 412 }),
  soloScreen("end-perfect", "Result · perfect run", "end", { ...perfect, status: "done", rank: 3 }),
  soloScreen("end-practice", "Result · past day (practice, not ranked)", "end", { ...mixed, status: "done", ranked: false }),
];

// ── Rooms ────────────────────────────────────────────────────────────────────────────────────────────────────────

type RoomStep = (s: RoomSim) => RoomSim;
const room = (n: number, ...steps: RoomStep[]) => steps.reduce((s, f) => f(s), newRoom(DECK, n, T0, "en"));
const tick: RoomStep = (s) => roomTick(s, (s.deadline ?? s.now) + 1);
const seatPick = (seat: number, right: boolean): RoomStep => (s) => {
  const card = s.deck[s.index];
  const wrong = card.options.find((o) => o.id !== card.fake && !s.seats[seat].removed.includes(o.id))!.id;
  return roomPick(s, seat, right ? card.fake : wrong);
};
const joker = (seat: number, j: "cut" | "double"): RoomStep => (s) => roomJoker(s, seat, j, fixed);
/** A settled card: every seat picks (true = right) and the reveal shows. */
const card = (rights: boolean[]): RoomStep => (s) => rights.reduce((x, r, seat) => seatPick(seat, r)(x), s);
const toNext: RoomStep = (s) => tick(s);
const playedCards = (n: number, k: number) => {
  let s = tick(room(n));
  for (let i = 0; i < k; i++) s = toNext(card(Array.from({ length: n }, (_, seat) => (i + seat) % 3 !== 1))(s));
  return s;
};

interface RoomData { view: DfRoomView; n: number; secondsLeft: number; away?: number }
const roomScreen = (id: string, name: string, sim: RoomSim, secondsLeft = 12) =>
  scenario<RoomData>({
    id, name, data: { view: viewFor(sim, 0), n: sim.seats.length, secondsLeft },
    render: (d, ctx) => {
      const snapshot = dfRoomSnapshot(d.n, d.view, Object.fromEntries(d.view.seats.filter((s) => s.status !== "in").map((s) => [s.seat, s.status])) as Record<number, "away" | "withdrawn">);
      if (d.view.phase === "over") return <DatoFalsoResults view={d.view} snapshot={snapshot} locale={ctx.locale} onRoom={() => ctx.log("onRoom")} onExit={() => ctx.log("onExit")} />;
      const link: DfRoomLink = {
        send: (c) => { ctx.log("send", c); return true; }, nowMs: () => (d.view.deadline ? Date.parse(d.view.deadline) - d.secondsLeft * 1000 : T0),
        inFlight: 0, retained: null, connected: true, resendRetained: () => undefined, leave: () => ctx.log("leave"),
      };
      return <Frame lang={ctx.locale} wide={d.view.format === "party"}><DatoFalsoBoard view={localRoom(d.view, ctx.locale)} snapshot={snapshot} room={link} locale={ctx.locale} error={null} /></Frame>;
    },
  });

const live = (id: string, name: string, config: DfRoomConfig, note: string) =>
  scenario<DfRoomConfig>({ id, name, note, data: config, render: (d, ctx) => <DatoFalsoRoomSim key={`${JSON.stringify(d)}-${ctx.locale}`} config={d} locale={ctx.locale} log={ctx.log} /> });

const over = (n: number, rights: boolean[][]) => rights.reduce((s, r) => toNext(card(r)(s)), tick(room(n)));

function roomScreens(n: number): Scenario<never>[] {
  const mid = playedCards(n, 3);
  const others = (right: boolean) => (s: RoomSim) => s.seats.slice(1).reduce((x, seat) => seatPick(seat.seat, right)(x), s);
  return [
    roomScreen("intro", "3-2-1 before the first card", room(n), 3),
    roomScreen("card", "Card 4 · nobody answered yet", mid),
    roomScreen("rival-answered", n === 2 ? "Rival already answered" : "Two others answered", seatPick(1, true)(n > 2 ? seatPick(2, false)(mid) : mid)),
    roomScreen("cut", "Remove 2 used", joker(0, "cut")(mid)),
    roomScreen("double", "Double or nothing on", joker(0, "double")(mid)),
    roomScreen("locked", "Locked in · waiting for the others", seatPick(0, true)(mid)),
    roomScreen("reveal-right", "Reveal · you right, rival ×2 wrong", others(false)(seatPick(0, true)(joker(1, "double")(mid))), 6),
    roomScreen("reveal-wrong", "Reveal · your ×2 wrong (−1)", others(true)(seatPick(0, false)(joker(0, "double")(mid))), 6),
    roomScreen("reveal-timeout", "Reveal · you ran out of time", tick(others(true)(mid)), 6),
    roomScreen("last-card", "Last card reveal", card(Array.from({ length: n }, (_, s) => s !== 1))(playedCards(n, 9)), 6),
    roomScreen("result-win", "Result · you won", over(n, Array.from({ length: 10 }, (_, i) => Array.from({ length: n }, (_, s) => s === 0 || i % 2 === 0)))),
    roomScreen("result-lose", "Result · you lost", over(n, Array.from({ length: 10 }, (_, i) => Array.from({ length: n }, (_, s) => s !== 0 || i % 3 === 0)))),
    roomScreen("result-draw", "Result · draw", over(n, Array.from({ length: 10 }, () => Array.from({ length: n }, () => true)))),
    ...(n > 2 ? [roomScreen("left", "A player left mid-match", withdraw(mid, n - 1))] : [roomScreen("rival-left", "Result · rival left", { ...withdraw(mid, 1), phase: "over" as const })]),
  ];
}

export const DATO_FALSO_DUEL: Scenario<never>[] = [
  live("live-1v1", "▶ Play a 1v1 vs a bot", { seats: 2, botSkill: 1, speed: 1 }, "Live: same card for both, 20 s, reveal 6 s. botSkill 0.5–1.5"),
  ...roomScreens(2),
];

export const DATO_FALSO_ROOM: Scenario<never>[] = [
  live("live-4", "▶ Play with 3 bots", { seats: 4, botSkill: 1, speed: 1 }, "Live: 4 players on the same card"),
  live("live-6", "▶ Play with 5 bots (one leaves at card 3)", { seats: 6, botSkill: 1, speed: 1, leaveAtCard: { seat: 5, card: 2 } }, "Live: 6 players; seat 5 leaves when card 3 starts"),
  ...roomScreens(4).map((sc) => ({ ...sc, id: `4-${sc.id}`, name: `4p · ${sc.name}` })),
  ...roomScreens(6).filter((sc) => ["card", "reveal-right", "result-win"].includes(sc.id)).map((sc) => ({ ...sc, id: `6-${sc.id}`, name: `6p · ${sc.name}` })),
];
