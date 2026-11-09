"use client";

import { draftCopy } from "@/features/draft/draft.copy";
import { activeSeat, botPick, finish, leagueOf, newDraft, respin, slotsOf, type ChallengeTarget, type DraftMode, type DraftState } from "@/features/draft/draft.engine";
import { RESPIN_COST, lines, matchDay, rankKey, type Era, type Variant } from "@/features/draft/draft.rules";
import { ChallengeIntro, DraftBoard, DraftIntro, DraftLeaderboard, DraftSetup, MatchDayView, RoomTable, SeasonResultView, SeasonTicker, XiReady } from "@/features/draft/DraftViews";
import { Frame } from "@/features/wordgames/ui";
import { DraftSim, UNIVERSE, boardRows, boardSeats, challengeLink, seatsFor, takenView, type DraftSimConfig } from "./DraftSim";
import { scenario, type Scenario } from "./types";

const LIVE: DraftSimConfig = { data: "real", mode: "daily", seats: 1, variant: "budget", leagueId: "sol", era: "all", formation: "4-3-3", botSkill: 0.7, speed: 1, coins: 120, intro: true, seed: "live" };
const live = (id: string, name: string, config: Partial<DraftSimConfig>, note: string) =>
  scenario<DraftSimConfig>({ id, name, note, data: { ...LIVE, ...config }, render: (d, ctx) => <DraftSim key={`${JSON.stringify(d)}-${ctx.locale}`} config={d} locale={ctx.locale} log={ctx.log} /> });

/** A draft run by bots to a given number of picks (deterministic: same seed, same screen). */
function at(mode: DraftMode, picks: number, o: { variant?: Variant; era?: Era; seats?: number; seed?: string; skill?: number; coins?: number; leagueId?: string } = {}): DraftState {
  let s = newDraft(UNIVERSE, {
    mode, variant: o.variant ?? "classic", leagueId: o.leagueId ?? "sol", era: o.era ?? "all", formation: "4-3-3", seed: o.seed ?? "pg-1",
    seats: seatsFor(mode === "duel" ? 2 : mode === "room" ? o.seats ?? 4 : 1), coins: o.coins ?? 0,
  });
  for (let i = 0; i < picks && s.phase === "picking"; i++) s = botPick(UNIVERSE, s, o.skill ?? 0.85);
  return s;
}
/** Run until it is seat 0's turn again (duel/room screens are drawn from my seat). */
function toMyTurn(s: DraftState): DraftState {
  let x = s;
  for (let g = 0; g < 20 && x.phase === "picking" && activeSeat(x) !== 0; g++) x = botPick(UNIVERSE, x, 0.85);
  return x;
}
const done = (s: DraftState) => { let x = s; while (x.phase === "picking") x = botPick(UNIVERSE, x, 0.85); return finish(UNIVERSE, x); };

interface BoardData { state: DraftState; spinning: boolean; seconds: number | null; why: string | null; team: string | null; undoName: string | null; armed: boolean; noticeKey: "noFit" | "noCoins" | "academyNotice" | null }
const board = (id: string, name: string, state: DraftState, extra: Partial<Omit<BoardData, "state">> = {}) =>
  scenario<BoardData>({
    id, name, data: { state, spinning: false, seconds: null, why: null, team: null, undoName: null, armed: false, noticeKey: null, ...extra },
    render: (d, ctx) => {
      const s = d.state;
      const c = draftCopy(ctx.locale);
      const multi = s.mode === "duel" || s.mode === "room";
      const seat = activeSeat(s);
      return (
        <Frame lang={ctx.locale} wide>
          <DraftBoard key={`${d.why}-${d.team}`} locale={ctx.locale} slots={slotsOf(s)} spin={s.spin} league={leagueOf(UNIVERSE, s)} variant={s.variant} round={s.round} seats={boardSeats(s)}
            myPicks={s.seats[0].picks} taken={takenView(s, c.you)} respins={s.respins} respinCost={s.mode === "free" ? RESPIN_COST : null} coins={s.mode === "free" ? s.coins : null} mode={s.mode}
            notice={d.noticeKey ? c[d.noticeKey] : null} spinning={d.spinning} seconds={d.seconds} waitingFor={multi && seat !== 0 ? s.seats[seat].name : null}
            initialWhy={d.why} initialTeam={d.team} armed={d.armed} onSpin={() => ctx.log("onSpin")} undoName={d.undoName} feed={multi && s.feed.length ? c.signedFeed(s.feed[s.feed.length - 1].seat === 0 ? c.you : s.seats[s.feed[s.feed.length - 1].seat].name, s.feed[s.feed.length - 1].name, s.feed[s.feed.length - 1].club, s.feed[s.feed.length - 1].season) : null} onUndo={() => ctx.log("onUndo")} onPick={(p, slot) => ctx.log("onPick", p, slot)} onRespin={(kind) => ctx.log("onRespin", kind)} onExit={() => ctx.log("onExit")} />
        </Frame>
      );
    },
  });

const mid = at("daily", 5);
const knowledge = at("daily", 5, { variant: "knowledge" });
const legends = at("daily", 3, { era: "legends", seed: "pg-legend" });
const freeBroke = (() => { let s = at("free", 4, { coins: 10 }); s = respin(UNIVERSE, respin(UNIVERSE, s)); return respin(UNIVERSE, s); })();
const whyFor = mid.spin.players.slice().sort((a, b) => b.rating - a.rating)[0].id;

interface ResultData { state: DraftState; override: "none" | "perfect" | "relegation"; challenge: ChallengeTarget | null; share: boolean; newBest: boolean }
const result = (id: string, name: string, state: DraftState, override: ResultData["override"] = "none", challenge: ChallengeTarget | null = null, extra: { share?: boolean; newBest?: boolean } = {}) =>
  scenario<ResultData>({
    id, name, data: { state, override, challenge, share: !!extra.share, newBest: !!extra.newBest },
    render: (d, ctx) => {
      const s = d.state;
      const base = s.seasons![0];
      const season = d.override === "perfect" ? { ...base, w: base.games, d: 0, l: 0, points: base.games * 3, position: 1, finish: "perfect" as const, weak: null, matches: base.matches.map((m) => ({ ...m, gf: Math.max(m.gf, m.ga + 1), reason: null })) }
        : d.override === "relegation" ? { ...base, w: 6, d: 7, l: base.games - 13, points: 25, position: base.teams - 1, finish: "relegation" as const } : base;
      return (
        <Frame lang={ctx.locale} wide>
          <SeasonResultView key={String(d.share)} locale={ctx.locale} number={12} initialShare={d.share} newBest={d.newBest} nextDaily={s.mode === "daily" ? "08:14:22" : null} season={season} slots={slotsOf(s)} picks={s.seats[0].picks} league={leagueOf(UNIVERSE, s)} variant={s.variant}
            coinsEarned={d.override === "perfect" ? 1000 : s.coinsEarned} ranked={s.mode === "daily"} shareLink={challengeLink(s)} challenge={d.challenge} onShare={(t) => ctx.log("onShare", t)} onAgain={() => ctx.log("onAgain")} onFriends={() => ctx.log("onFriends")} onChallenge={d.challenge ? undefined : () => ctx.log("onChallenge")} onExit={() => ctx.log("onExit")}
            leaderboard={<DraftLeaderboard locale={ctx.locale} rows={boardRows(season)} variant={s.variant} onVariant={(v) => ctx.log("onBoardVariant", v)} />} />
        </Frame>
      );
    },
  });

const finished = done(at("daily", 0, { seed: "pg-result" }));
const finishedFree = done(at("free", 0, { seed: "pg-free", coins: 40 }));
const finishedKnowledge = done(at("daily", 0, { seed: "pg-know", variant: "knowledge", skill: 0.5 }));
const rivalDraft = done(at("daily", 0, { seed: "pg-result", skill: 0.4 }));
const targetFrom = (s: DraftState, change: number): ChallengeTarget => { const x = s.seasons![0]; return { from: "Brisa77", seed: s.seed, leagueId: s.leagueId, era: s.era, formation: s.formation, variant: s.variant, respins: 2, w: x.w + change, d: x.d, l: x.l - change, points: x.points + change * 3, gf: x.gf, ga: x.ga, picks: rivalDraft.seats[0].picks }; };

export const DRAFT_SOLO: Scenario<never>[] = [
  live("live", "▶ Play: today's draft, REAL squads (local private pack)", {}, "Real top-5 squads 2004/05+ from the local private pack (public/dev-data/football-draft.json, gitignored; build: ~/dev/quizball-private/football-draft/build_dev_pack.py). Ratings = rateSeason() on each real season. leagueId: pl, laliga, seriea, bundesliga, ligue1. data: \"invented\" plays the made-up universe. Legends: pre-2004 data is incomplete, so legends falls back to all seasons."),
  live("live-invented", "▶ Play: invented universe (what tests and screenshots use)", { data: "invented" }, "Made-up leagues, clubs and players (fixtures/draft.ts)."),
  live("live-classic", "▶ Classic: ratings shown, pick the best", { variant: "classic", intro: false, leagueId: "pl" }, "The easy way in: no prices."),
  live("live-free", "▶ Free play: re-spins cost coins after the 2 free ones", { variant: "classic", mode: "free", intro: false, coins: 60, leagueId: "pl" }, "2 free re-spins, then 25 coins each. Set coins to test running out."),
  live("live-budget", "▶ Transfer budget: buy your XI with €300M", { variant: "budget", intro: false, leagueId: "pl" }, "Better players cost more; a player you cannot afford is greyed out. Same spins, then the season."),
  live("live-knowledge", "▶ Ball Knowledge: ratings hidden", { variant: "knowledge", intro: false, leagueId: "seriea" }, "Ratings and stats hidden, squad in alphabetical order, everything revealed after the season."),
  scenario<{ friends: boolean; formation: "4-3-3" | "4-4-2" | "4-2-3-1" | "3-5-2"; era: Era }>({ id: "setup", name: "Free play: choose league, era, formation", data: { friends: false, formation: "4-2-3-1", era: "legends" }, render: (d, ctx) => (
    <Frame lang={ctx.locale} wide><DraftSetup locale={ctx.locale} leagues={UNIVERSE.leagues} values={{ leagueId: "sol", era: d.era, formation: d.formation, variant: "classic", seats: 4 }} friends={d.friends} onChange={(v) => ctx.log("onChange", v)} onStart={() => ctx.log("onStart")} onExit={() => ctx.log("onExit")} /></Frame>
  ) }),
  scenario<{ friends: boolean; formation: "4-3-3" | "4-4-2" | "4-2-3-1" | "3-5-2"; era: Era }>({ id: "setup-friends", name: "With friends: same, plus number of players", data: { friends: true, formation: "4-3-3", era: "all" }, render: (d, ctx) => (
    <Frame lang={ctx.locale} wide><DraftSetup locale={ctx.locale} leagues={UNIVERSE.leagues} values={{ leagueId: "sol", era: d.era, formation: d.formation, variant: "classic", seats: 4 }} friends={d.friends} onChange={(v) => ctx.log("onChange", v)} onStart={() => ctx.log("onStart")} onExit={() => ctx.log("onExit")} /></Frame>
  ) }),
  scenario<{ variant: Variant }>({ id: "intro", name: "Intro", data: { variant: "classic" }, render: (d, ctx) => (
    <Frame lang={ctx.locale} wide><DraftIntro locale={ctx.locale} number={12} league={UNIVERSE.leagues[1]} best="31–4–3" nextDaily="08:14:22" variant={d.variant} onVariant={(v) => ctx.log("onVariant", v)} onDaily={() => ctx.log("onDaily")} onFree={() => ctx.log("onFree")} onFriends={() => ctx.log("onFriends")} onExit={() => ctx.log("onExit")} /></Frame>
  ) }),
  board("armed", "Before the spin: press Spin to see the squad", at("daily", 0), { armed: true }),
  board("first", "Pick 1: empty XI", at("daily", 0)),
  board("spinning", "Spin rolling", at("daily", 0), { spinning: true }),
  board("mid", "Pick 6: half the XI signed", mid),
  board("undo", "Just signed: undo until you press Spin", at("daily", 3), { armed: true, undoName: "Invented Moreno" }),
  board("why", "Why this rating? (sheet)", mid, { why: whyFor }),
  board("knowledge", "Ball Knowledge: ratings hidden", knowledge),
  board("budget", "Transfer budget: prices on every player", at("daily", 5, { variant: "budget", seed: "pg-budget" })),
  board("legends", "Legend era spin", legends),
  board("no-fit", "Nobody fits: free spin notice", mid, { noticeKey: "noFit" }),
  board("academy", "Duel/room: nobody left fits, an academy kid steps in", toMyTurn(at("duel", 6, { seed: "pg-duel" })), { noticeKey: "academyNotice" }),
  board("free-coins", "Free play: free re-spins used, 10 coins left", freeBroke, { noticeKey: "noCoins" }),
  scenario<{ state: DraftState }>({ id: "ready", name: "XI complete: look at it, then play the season", data: { state: at("daily", 11) }, render: (d, ctx) => (
    <Frame lang={ctx.locale} wide><XiReady locale={ctx.locale} slots={slotsOf(d.state)} picks={d.state.seats[0].picks} variant={d.state.variant} undoName="Invented Moreno" onUndo={() => ctx.log("onUndo")} onPlay={() => ctx.log("onPlay")} onExit={() => ctx.log("onExit")} /></Frame>
  ) }),
  scenario<{ upTo: number }>({ id: "season", name: "Season playing (matchweek 24)", data: { upTo: 24 }, render: (d, ctx) => (
    <Frame lang={ctx.locale} wide><SeasonTicker locale={ctx.locale} seed={finished.seed} season={finished.seasons![0]} slots={slotsOf(finished)} picks={finished.seats[0].picks} variant={finished.variant} upTo={d.upTo} matchTime={1000} holding onSkip={() => ctx.log("onSkip")} /></Frame>
  ) }),
  result("result", "Result: the season, weak link, why you dropped points", finished),
  result("perfect", "Result: perfect season", finished, "perfect"),
  result("relegated", "Result: relegated", finished, "relegation"),
  result("result-free", "Result: Free play (coins, no board)", finishedFree),
  result("reveal", "Result: Ball Knowledge reveal (real ratings, best on offer)", finishedKnowledge),
  result("best", "Result: new personal best", finishedFree, "none", null, { newBest: true }),
  result("share-card", "Share image: ratings only (default on the daily)", finished, "none", null, { share: true }),
  scenario<{ target: ChallengeTarget }>({ id: "challenge", name: "Beat my draft: what the friend sees", data: { target: targetFrom(finished, 0) }, render: (d, ctx) => (
    <Frame lang={ctx.locale}><ChallengeIntro locale={ctx.locale} target={d.target} league={leagueOf(UNIVERSE, finished)} onStart={() => ctx.log("onStart")} onExit={() => ctx.log("onExit")} /></Frame>
  ) }),
  result("challenge-won", "Beat my draft: you beat it", finished, "none", targetFrom(finished, -3)),
  result("challenge-lost", "Beat my draft: it stands", finished, "none", targetFrom(finished, 2)),
  scenario<{ variant: Variant }>({ id: "leaderboard", name: "Leaderboard: main board tab + public page mirror", data: { variant: "classic" }, render: (d, ctx) => (
    <Frame lang={ctx.locale} wide>
      <div className="grid gap-4 py-4 lg:grid-cols-2">
        <div className="min-w-0"><p className="mb-2 text-xs font-bold uppercase text-white/50">Main leaderboard · game tab</p><DraftLeaderboard locale={ctx.locale} rows={boardRows(finished.seasons![0])} variant={d.variant} onVariant={(v) => ctx.log("onVariant", v)} /></div>
        <div className="min-w-0"><p className="mb-2 text-xs font-bold uppercase text-white/50">Public game page (guests) · Top 5</p><DraftLeaderboard locale={ctx.locale} rows={boardRows(null)} variant={d.variant} onVariant={(v) => ctx.log("onVariant", v)} compact /></div>
      </div>
    </Frame>
  ) }),
];

const duelMid = toMyTurn(at("duel", 6, { seed: "pg-duel" }));
const duelWait = (() => { let s = at("duel", 7, { seed: "pg-duel" }); for (let g = 0; g < 4 && activeSeat(s) === 0; g++) s = botPick(UNIVERSE, s, 0.85); return s; })();
const duelDone = done(at("duel", 0, { seed: "pg-duel-end" }));
const duelLost = (() => { const s = done(at("duel", 0, { seed: "pg-duel-pens" })); const a = lines(slotsOf(s), s.seats[0].picks); const b = { ...a, gk: a.gk + 3 }; return { ...s, match: { ...matchDay(a, b, "pens"), legs: [[1, 0], [0, 1]] as [[number, number], [number, number]], goals: [1, 1] as [number, number], penalties: [3, 4] as [number, number], winner: 1 as const } }; })();

interface MatchData { state: DraftState }
const match = (id: string, name: string, state: DraftState) => scenario<MatchData>({ id, name, data: { state }, render: (d, ctx) => (
  <Frame lang={ctx.locale}><MatchDayView locale={ctx.locale} match={d.state.match!} me={boardSeats(d.state)[0]} rival={boardSeats(d.state)[1]} slots={slotsOf(d.state)} onAgain={() => ctx.log("onAgain")} onExit={() => ctx.log("onExit")} /></Frame>
) });

export const DRAFT_DUEL: Scenario<never>[] = [
  live("live-duel", "▶ Play a duel vs a bot (first pick alternates, 15 s)", { variant: "classic", mode: "duel", intro: false, seed: "duel", leagueId: "pl" }, "Same spin for both; the first pick alternates each round; a player taken by one side is gone. Ends with Match day."),
  board("duel-turn", "Your pick: rival already took a player (struck out)", duelMid, { seconds: 11 }),
  board("duel-wait", "Rival is picking", duelWait),
  match("duel-win", "Match day: three line battles → scoreline", duelDone),
  match("duel-pens", "Match day: draw → penalties (keepers decide)", duelLost),
];

const roomMid = toMyTurn(at("room", 13, { seats: 4, seed: "pg-room" }));
const roomDone = done(at("room", 0, { seats: 5, seed: "pg-room-end" }));
export const DRAFT_ROOM: Scenario<never>[] = [
  live("live-room", "▶ Play a room with 3 bots", { variant: "classic", mode: "room", seats: 4, intro: false, seed: "room", leagueId: "bundesliga" }, "Snake order across all seats, 10 s per pick with 4 or more players, every seat's XI plays the same fixtures; table by points."),
  board("room-turn", "Room: your pick (4 players), latest signing above the pitch", roomMid, { seconds: 9 }),
  board("room-team", "Room: open a rival's team from their chip", roomMid, { seconds: 9, team: roomMid.seats[1].name }),
  scenario<{ state: DraftState }>({ id: "room-table", name: "Room: final table", data: { state: roomDone }, render: (d, ctx) => {
    const s = d.state;
    const rows = boardSeats(s).map((seat, i) => ({ seat, season: s.seasons![i], team: lines(slotsOf(s), seat.picks).overall })).sort((a, b) => rankKey(b.season) - rankKey(a.season));
    return <Frame lang={ctx.locale}><RoomTable locale={ctx.locale} rows={rows} slots={slotsOf(s)} onAgain={() => ctx.log("onAgain")} onExit={() => ctx.log("onExit")} /></Frame>;
  } }),
];
