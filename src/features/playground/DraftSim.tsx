"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useGameSounds } from "@/lib/sounds/useGameSounds";
import { DRAFT_SOUNDS, preloadDraftSounds, type DraftSoundMoment } from "@/features/draft/draft.sounds";
import { randomBotAvatar } from "@/features/auction/data/botAvatars";
import { draftCopy } from "@/features/draft/draft.copy";
import { activeSeat, botPick, finish, isShared, leagueOf, newDraft, pick, respin, signAcademy, slotsOf, type ChallengeTarget, type DraftMode, type DraftState, type DraftUniverse } from "@/features/draft/draft.engine";
import { FREE_RESPINS, RESPIN_COST, SEASON_PACE, lines, matchDay, matchMs, pickSeconds, predictSeason, rankKey, type Era, type FormationId, type MatchDay, type SeasonResult, type Variant } from "@/features/draft/draft.rules";
import { ChallengeIntro, DraftBoard, DraftIntro, DraftLeaderboard, DraftSetup, type DraftSetupValues, MatchDayView, RoomTable, SeasonResultView, SeasonTicker, TeamSheet, XiReady, type BoardRow, type BoardSeat } from "@/features/draft/DraftViews";
import { Frame } from "@/features/wordgames/ui";
import { LEAGUES, RIVAL_NAMES, opponents, otherClubOf, otherSeasonOf, spinFrom } from "./fixtures/draft";
import { REAL_PACK_URL, realUniverse, type RealPack } from "./fixtures/draftReal";

export const UNIVERSE: DraftUniverse = { leagues: LEAGUES, spin: spinFrom, otherClub: otherClubOf, otherSeason: otherSeasonOf, opponents };
/** How long the reels roll. */
const ROLL_MS = 1000;
/** A placeholder for the real short link; the real game encodes the draw on the server. */
export const challengeLink = (t: Pick<ChallengeTarget, "seed">) => `quizball.io/d/${t.seed.replace(/[^a-z0-9]/gi, "").slice(-8)}`;
type Log = (action: string, ...args: unknown[]) => void;

/** Everyone plays the same draw today, however often they come back; UTC stands in for the real day boundary. */
const dailyKey = () => new Date().toISOString().slice(0, 10);
const dailyLeague = (leagues: { id: string }[], key: string) => leagues[Math.floor(Date.parse(key) / 86400000) % leagues.length].id;

/** Personal best on this device, until the real game keeps it on the account. */
const BEST_KEY = "football-draft-best";
const noSubscribe = () => () => undefined;
// One best per version: a budget season should not have to beat a Classic one.
const readBest = (key: string) => { try { return localStorage.getItem(`${BEST_KEY}-${key}`); } catch { return null; } };
const writeBest = (key: string, raw: string) => { try { localStorage.setItem(`${BEST_KEY}-${key}`, raw); } catch { /* private window */ } };
/** A record only means something against the same setup. The daily's setup is fixed; free play has its own per league, era and formation. */
const bestKey = (o: { mode: DraftMode; variant: Variant; leagueId: string; era: Era; formation: FormationId }) => (o.mode === "daily" ? `daily-${o.variant}` : `free-${o.variant}-${o.leagueId}-${o.era}-${o.formation}`);
/** The first daily attempt of a date counts; the device keeps it until the account does. */
const dailyAttemptKey = (variant: Variant, key: string) => `football-draft-attempt-${key}-${variant}`;
const readAttempt = (variant: Variant, key: string): DraftState | null => { try { const raw = localStorage.getItem(dailyAttemptKey(variant, key)); return raw ? (JSON.parse(raw) as DraftState) : null; } catch { return null; } };
const writeAttempt = (s: DraftState, key: string) => { try { localStorage.setItem(dailyAttemptKey(s.variant, key), JSON.stringify(s)); } catch { /* private window */ } };
const parseBest = (raw: string | null): { rec: string; points: number } | null => { try { return raw ? JSON.parse(raw) : null; } catch { return null; } };

/** Time to the next daily draft; UTC midnight stands in for the real day boundary. */
function useNextDaily() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate() + 1) - now) / 1000));
      const pad = (n: number) => String(n).padStart(2, "0");
      setText(`${pad(Math.floor(left / 3600))}:${pad(Math.floor(left / 60) % 60)}:${pad(left % 60)}`);
    };
    const t = setInterval(tick, 1000);
    const first = setTimeout(tick, 0);
    return () => { clearInterval(t); clearTimeout(first); };
  }, []);
  return text;
}

export interface DraftSimConfig { data: "real" | "invented"; mode: DraftMode; seats: number; variant: Variant; leagueId: string; era: Era; formation: FormationId; botSkill: number; speed: number; coins: number; intro: boolean; seed: string }

export function seatsFor(n: number, me = "Vos") {
  return Array.from({ length: n }, (_, i) => ({ name: i === 0 ? me : RIVAL_NAMES[i - 1], avatar: randomBotAvatar(`draft-seat-${i}`), bot: i > 0 }));
}

export const boardSeats = (s: DraftState): BoardSeat[] =>
  s.seats.map((seat, i) => ({ name: seat.name, avatar: seat.avatar, picks: seat.picks, me: i === 0, active: s.phase === "picking" && activeSeat(s) === i }));

export const takenView = (s: DraftState, you: string) => s.taken.map((t) => ({ playerId: t.playerId, by: t.seat === 0 ? you : s.seats[t.seat].name }));

/** An invented daily board with the player's own row placed by points. */
export function boardRows(mine: SeasonResult | null, name = "Vos"): BoardRow[] {
  const fake = [[36, 2, 0], [35, 2, 1], [33, 4, 1], [33, 3, 2], [31, 5, 2], [30, 4, 4], [29, 6, 3], [27, 5, 6], [25, 7, 6], [22, 6, 10]].map(([w, d, l], i) => ({
    name: ["Kallberg_10", "TikiTaka_Teo", "Brisa77", "Gaffer_Nube", "Zubeldo10", "Ortuzar FC", "Lambrini", "Varelo_9", "Sami Okonde", "Rafa_Retamal"][i], avatar: randomBotAvatar(`board-${i}`), season: { w, d, l, points: w * 3 + d },
  }));
  const all = mine ? [...fake, { name, avatar: randomBotAvatar("draft-seat-0"), season: mine, me: true }] : fake;
  return all.sort((a, b) => b.season.points - a.season.points).map((r, i) => ({ ...r, rank: i + 1 }));
}

const BOARD_NAMES = ["Kallberg_10", "TikiTaka_Teo", "Brisa77", "Gaffer_Nube", "Zubeldo10", "Ortuzar FC", "Lambrini", "Varelo_9", "Sami Okonde", "Rafa_Retamal"];
/** The prototype's board: invented managers who really drafted today's draw, with your row placed among them. */
export function rivalBoard(u: DraftUniverse, s: DraftState, name = "Vos"): BoardRow[] {
  const rows = BOARD_NAMES.map((who, i) => {
    let d = newDraft(u, { mode: "daily", variant: s.variant, leagueId: s.leagueId, era: s.era, formation: s.formation, seed: s.seed, seats: [{ name: who, avatar: null, bot: true }] });
    for (let g = 0; g < 80 && d.phase === "picking"; g++) d = botPick(u, d, 0.98 - i * 0.07, `|${who}`);
    return { name: who, avatar: randomBotAvatar(`board-${i}`), season: finish(u, d).seasons![0], picks: d.seats[0].picks };
  });
  const all = s.seasons ? [...rows, { name, avatar: randomBotAvatar("draft-seat-0"), season: s.seasons[0], picks: s.seats[0].picks, me: true }] : rows;
  return all.sort((a, b) => b.season.points - a.season.points).map((r, i) => ({ ...r, rank: i + 1 }));
}

/** `data: "real"` plays the local private pack (public/dev-data, gitignored) when it is there; otherwise the invented universe. */
export function DraftSim({ config, locale, log }: { config: DraftSimConfig; locale: string; log: Log }) {
  const [u, setU] = useState<DraftUniverse | null>(config.data === "real" ? null : UNIVERSE);
  useEffect(() => {
    if (config.data !== "real") return;
    let live = true;
    fetch(REAL_PACK_URL).then((r) => (r.ok ? r.json() : null)).then((pack: RealPack | null) => { if (live) setU(pack ? realUniverse(pack) : UNIVERSE); }, () => { if (live) setU(UNIVERSE); });
    return () => { live = false; };
  }, [config.data]);
  if (!u) return <Frame lang={locale}><p className="m-auto text-sm text-white/60">Loading squads…</p></Frame>;
  const leagueId = u.leagues.some((l) => l.id === config.leagueId) ? config.leagueId : (u.leagues[1] ?? u.leagues[0]).id;
  return <DraftSimInner config={{ ...config, leagueId }} locale={locale} log={log} u={u} />;
}

function DraftSimInner({ config, locale, log, u }: { config: DraftSimConfig; locale: string; log: Log; u: DraftUniverse }) {
  const c = draftCopy(locale);
  const [setup, setSetup] = useState<DraftSetupValues>({ leagueId: config.leagueId, era: config.era, formation: config.formation, variant: config.variant, seats: 2 });
  const [setupFor, setSetupFor] = useState<"free" | "friends">("free");
  const make = (mode: DraftMode, o: { leagueId?: string; era?: Era; formation?: FormationId; variant?: Variant; seats?: number; target?: ChallengeTarget | null } = {}) => newDraft(u, {
    mode, variant: o.target?.variant ?? o.variant ?? config.variant, leagueId: o.target?.leagueId ?? o.leagueId ?? config.leagueId, era: o.target?.era ?? o.era ?? config.era, formation: o.target?.formation ?? o.formation ?? config.formation,
    seed: o.target?.seed ?? (mode === "daily" && config.intro ? `daily-${dailyKey()}` : `${config.seed}-${Date.now()}`), respins: o.target?.respins,
    seats: seatsFor(mode === "duel" ? 2 : mode === "room" ? Math.max(3, Math.min(6, o.seats ?? config.seats)) : 1), coins: config.coins,
  });
  const [variant, setVariant] = useState<Variant>(config.variant);
  const [screen, setScreen] = useState<"intro" | "setup" | "challenge" | "draft" | "season" | "result" | "versus">(config.intro ? "intro" : "draft");
  const [openRival, setOpenRival] = useState<BoardRow | null>(null);
  const [versus, setVersus] = useState<{ seat: BoardSeat; match: MatchDay; seed: string } | null>(null);
  const [s, setS] = useState<DraftState>(() => make(config.mode, { seats: config.seats }));
  const [rolling, setRolling] = useState<string | null>(null);
  const spinning = rolling !== null;
  const [upTo, setUpTo] = useState(0);
  const multi = isShared(s.mode);
  const clock = pickSeconds(s.seats.length);
  const [clockLeft, setClockLeft] = useState({ key: "", left: clock });
  const [undoFrom, setUndoFrom] = useState<{ state: DraftState; name: string } | null>(null);
  const [target, setTarget] = useState<ChallengeTarget | null>(null);
  const lastSpin = useRef(config.intro ? s.spin.id : "");
  const league = leagueOf(u, s);
  const slots = slotsOf(s);
  const { playSfx } = useGameSounds();
  useEffect(() => { preloadDraftSounds(); }, []);
  const sfx = useCallback((m: DraftSoundMoment) => { const name = DRAFT_SOUNDS[m]; if (name) playSfx(name); }, [playSfx]);
  const pool = useMemo(() => u.opponents(s.leagueId, s.seed).map((o) => o.name), [u, s.leagueId, s.seed]);

  // A new spin: in a shared draft it rolls by itself; in a solo draft it waits for the player's own press, except a re-spin they just asked for.
  // Two effects, so a re-run of the first can never lose the timer of the second.
  const [armed, setArmed] = useState(false);
  const respinPressed = useRef(false);
  useEffect(() => {
    if (screen !== "draft" || s.phase !== "picking" || s.spin.id === lastSpin.current) return;
    lastSpin.current = s.spin.id;
    if (isShared(s.mode) || respinPressed.current) {
      respinPressed.current = false;
      setUndoFrom(null);
      setRolling(s.spin.id);
      sfx("spin");
    } else setArmed(true);
  }, [screen, s.phase, s.mode, s.spin.id, sfx]);
  const spinNow = () => { setArmed(false); setUndoFrom(null); setRolling(s.spin.id); sfx("spin"); };
  useEffect(() => {
    if (!rolling) return;
    const t = setTimeout(() => { setRolling(null); sfx("land"); }, ROLL_MS / config.speed);
    return () => clearTimeout(t);
  }, [rolling, config.speed, sfx]);

  // Bots pick after a short think; my own clock (duel/room) auto-picks for me at zero.
  const seat = activeSeat(s);
  // The clock belongs to one turn, so a zero left over from the last turn can never pick for this one.
  const clockKey = `${s.round}:${s.turn}:${armed}:${spinning}`;
  const seconds = clockLeft.key === clockKey ? clockLeft.left : clock;
  useEffect(() => {
    if (screen !== "draft" || s.phase !== "picking" || spinning || armed) return;
    if (!s.seats[seat].bot) return;
    const t = setTimeout(() => setS((x) => botPick(u, x, config.botSkill)), (900 + (seat * 137) % 600) / config.speed);
    return () => clearTimeout(t);
  }, [u, screen, s.phase, s.round, s.turn, seat, spinning, armed, config.botSkill, config.speed, s.seats]);
  useEffect(() => {
    if (!multi || screen !== "draft" || s.phase !== "picking" || s.seats[seat].bot || spinning) return;
    if (seconds <= 0) { setS((x) => botPick(u, x, 0.3)); return; }
    if (seconds === 5) sfx("hurry");
    const t = setTimeout(() => setClockLeft({ key: clockKey, left: seconds - 1 }), 1000 / config.speed);
    return () => clearTimeout(t);
  }, [u, multi, screen, s.phase, s.seats, seat, seconds, clockKey, spinning, config.speed, sfx]);

  const playOn = useCallback(() => { setS((x) => finish(u, x)); setUndoFrom(null); setUpTo(0); setScreen("season"); sfx("kickoff"); }, [u, sfx]);
  // Shared drafts go straight to the season; a solo player sees the finished XI first and presses play.
  useEffect(() => {
    if (s.phase !== "ready" || !isShared(s.mode)) return;
    const t = setTimeout(playOn, 0);
    return () => clearTimeout(t);
  }, [s.phase, s.mode, playOn]);
  // A beat on the game that ends a perfect run, once per season.
  const [heldFor, setHeldFor] = useState<SeasonResult | null>(null);
  const firstDrop = s.seasons ? s.seasons[0].matches.findIndex((m) => m.gf <= m.ga) : -1;
  const holding = !!s.seasons && firstDrop >= 0 && upTo === firstDrop + 1 && heldFor !== s.seasons[0];
  useEffect(() => {
    if (screen !== "season" || !s.seasons) return;
    if (s.mode === "duel") { setScreen("result"); return; }
    const season = s.seasons[0];
    if (upTo >= season.games) { sfx("fullTime"); const t = setTimeout(() => setScreen("result"), SEASON_PACE.end / config.speed); return () => clearTimeout(t); }
    if (holding) { const t = setTimeout(() => setHeldFor(season), SEASON_PACE.runEnded / config.speed); return () => clearTimeout(t); }
    const t = setTimeout(() => setUpTo((v) => v + 1), matchMs(season, upTo) / config.speed);
    return () => clearTimeout(t);
  }, [screen, upTo, holding, s.seasons, s.mode, config.speed, sfx]);

  // The result's own sound, once per result screen.
  useEffect(() => {
    if (screen !== "result" || !s.seasons) return;
    if (s.mode === "duel") return;
    const mine = s.mode === "room" ? s.seasons.map((x, i) => ({ x, i })).sort((a, b) => rankKey(b.x) - rankKey(a.x))[0].i === 0 : null;
    const f = s.seasons[0].finish;
    sfx(f === "perfect" ? "perfect" : mine === true || f === "champions" ? "glory" : f === "relegation" || mine === false ? "defeat" : "result");
    if (s.coinsEarned > 0) { const t = setTimeout(() => sfx("coins"), 1200); return () => clearTimeout(t); }
  }, [screen, s.seasons, s.mode, s.match, s.coinsEarned, sfx]);

  const begin = (next: DraftState) => { lastSpin.current = ""; setClockLeft({ key: "", left: clock }); setArmed(false); setRolling(null); setUndoFrom(null); setS(next); setScreen("draft"); };
  const restart = (mode: DraftMode = s.mode) => {
    setTarget(null);
    const done = mode === "daily" && config.intro ? readAttempt(variant, dailyKey()) : null;
    if (done) { recorded.current = done.seasons; setS(done); setScreen("result"); return; }
    begin(make(mode, mode === "daily" ? { variant, era: "all", formation: "4-3-3", leagueId: dailyLeague(u.leagues, dailyKey()) } : { leagueId: s.leagueId, era: s.era, formation: s.formation, variant: s.variant, seats: s.seats.length }));
  };
  const openSetup = (kind: "free" | "friends") => { setSetupFor(kind); setSetup((x) => ({ ...x, variant })); setScreen("setup"); };
  const startSetup = () => { setTarget(null); begin(make(setupFor === "free" ? "free" : setup.seats === 2 ? "duel" : "room", setup)); };
  const exit = () => { log("onExit"); setTarget(null); setScreen("intro"); };
  const undo = () => { if (!undoFrom) return; log("onUndo"); lastSpin.current = undoFrom.state.spin.id; setArmed(false); setRolling(null); setS(undoFrom.state); setUndoFrom(null); };
  const notice = s.notice === "no_coins" ? c.noCoins : s.notice === "no_fit" ? c.noFit : s.notice === "academy" ? c.academyNotice : s.notice === "no_other_season" ? c.noOtherSeason : s.notice === "no_money" ? c.noMoney : null;
  // Each row is a real team drafted from the same draw, so it can be opened and played.
  const rows = useMemo(() => (s.seasons && !isShared(s.mode) ? rivalBoard(u, s) : []), [u, s]);
  // The forecast for the XI just built: shown before the season (not in Ball Knowledge, it would give ratings away) and held against the result.
  const prediction = useMemo(() => (!isShared(s.mode) && s.seats[0].picks.every(Boolean) ? predictSeason(slots, s.seats[0].picks, league, u.opponents(s.leagueId, s.seed), s.seed) : null), [u, s.mode, s.leagueId, s.seed, s.seats, slots, league]);
  const [seenVersus, setSeenVersus] = useState<string[]>([]);
  const playAgainst = (name: string, avatar: BoardSeat["avatar"], picks: BoardSeat["picks"]) => {
    log("onVersus", name);
    const seed = `${s.seed}|vs|${name}`;
    setOpenRival(null);
    setVersus({ seat: { name, avatar, picks, me: false, active: false }, match: matchDay(lines(slots, s.seats[0].picks), lines(slots, picks), seed), seed });
    if (!seenVersus.includes(seed)) sfx("kickoff");
    setScreen("versus");
  };
  // In the real game the link opens this for the friend; here the button walks straight into what they would see.
  const challengeFriend = () => {
    const season = s.seasons![0];
    const next: ChallengeTarget = { from: "Vos", seed: s.seed, leagueId: s.leagueId, era: s.era, formation: s.formation, variant: s.variant, respins: Math.max(FREE_RESPINS, s.respinsUsed), w: season.w, d: season.d, l: season.l, points: season.points, gf: season.gf, ga: season.ga, picks: s.seats[0].picks };
    log("onChallenge", challengeLink(next));
    setTarget(next);
    setScreen("challenge");
  };
  const accept = () => { if (target) begin(make("challenge", { target })); };

  // Personal best, kept when a solo season ends.
  const bestFor = screen === "intro" ? `daily-${variant}` : bestKey(s);
  const bestRaw = useSyncExternalStore(noSubscribe, () => readBest(bestFor), () => null);
  const [bestSeen, setBestSeen] = useState<{ key: string; raw: string } | null>(null);
  const best = parseBest(bestSeen?.key === bestFor ? bestSeen.raw : bestRaw);
  const [newBest, setNewBest] = useState(false);
  const recorded = useRef<DraftState["seasons"]>(null);
  useEffect(() => {
    if (screen !== "result" || !s.seasons || isShared(s.mode) || recorded.current === s.seasons) return;
    recorded.current = s.seasons;
    const season = s.seasons[0];
    const beaten = !best || season.points > best.points;
    const timer = setTimeout(() => {
      setNewBest(beaten);
      if (beaten) { const raw = JSON.stringify({ rec: `${season.w}–${season.d}–${season.l}`, points: season.points }); writeBest(bestFor, raw); setBestSeen({ key: bestFor, raw }); }
      if (s.mode === "daily" && config.intro) writeAttempt(s, dailyKey());
    }, 0);
    return () => clearTimeout(timer);
  }, [screen, s, best, bestFor, config.intro]);
  const nextDaily = useNextDaily();
  const lastFeed = s.feed[s.feed.length - 1];
  const feedText = lastFeed ? c.signedFeed(lastFeed.seat === 0 ? c.you : s.seats[lastFeed.seat].name, lastFeed.name, lastFeed.club, lastFeed.season) : null;

  return (
    <Frame lang={locale} wide>
      {screen === "intro" ? (
        <DraftIntro locale={locale} number={12} league={u.leagues.find((l) => l.id === dailyLeague(u.leagues, dailyKey())) ?? league} best={best?.rec ?? null} nextDaily={nextDaily} variant={variant} onVariant={setVariant} onExit={() => log("onExit")}
          onDaily={() => restart("daily")} onFree={() => openSetup("free")} onFriends={() => openSetup("friends")} />
      ) : screen === "setup" ? (
        <DraftSetup locale={locale} leagues={u.leagues} values={setup} friends={setupFor === "friends"} onChange={setSetup} onStart={startSetup} onExit={exit} />
      ) : screen === "challenge" && target ? (
        <ChallengeIntro locale={locale} target={target} league={league} onStart={accept} onExit={exit} />
      ) : screen === "draft" && s.phase === "ready" && !multi ? (
        <XiReady locale={locale} slots={slots} picks={s.seats[0].picks} variant={s.variant} budget={s.budget} prediction={prediction} undoName={undoFrom?.name ?? null} onUndo={undo} onPlay={playOn} onExit={exit} />
      ) : screen === "draft" ? (
        <DraftBoard locale={locale} slots={slots} spin={s.spin} league={league} variant={s.variant} round={s.round} seats={boardSeats(s)} myPicks={s.seats[0].picks}
          taken={takenView(s, c.you)} respins={s.respins} respinCost={s.mode === "free" ? RESPIN_COST : null} coins={s.mode === "free" ? s.coins : null} mode={s.mode} notice={notice}
          spinning={spinning} armed={armed} onSpin={spinNow} pool={pool} feed={multi ? feedText : null} seconds={multi && !s.seats[seat].bot ? seconds : null} waitingFor={multi && s.seats[seat].bot ? s.seats[seat].name : null}
          undoName={undoFrom?.name ?? null} onUndo={undo}
          onPick={(playerId, slotId) => {
            log("onPick", playerId, slotId);
            const signed = s.spin.players.find((p) => p.id === playerId);
            sfx(signed && signed.rating >= 85 ? "signStar" : "sign");
            if (!multi) setUndoFrom({ state: s, name: signed?.name ?? "" });
            setS((x) => pick(u, x, playerId, slotId));
          }}
          budget={s.budget} onAcademy={(slotId) => { log("onAcademy", slotId); sfx("sign"); if (!multi) setUndoFrom({ state: s, name: c.academyKid }); setS((x) => signAcademy(u, x, slotId)); }}
          onRespin={(kind) => {
            log("onRespin", kind); sfx("respin");
            // A refused re-spin changes nothing: it must not make the next squad roll by itself.
            const next = respin(u, s, kind);
            if (next.spin.id !== s.spin.id) { respinPressed.current = true; setUndoFrom(null); }
            setS(next);
          }} onExit={exit} />
      ) : screen === "season" && s.seasons ? (
        <SeasonTicker locale={locale} seed={s.seed} season={s.seasons[0]} slots={slots} picks={s.seats[0].picks} variant={s.variant} upTo={upTo} matchTime={matchMs(s.seasons[0], upTo) / config.speed} holding={holding} onGoal={(mine) => sfx(mine ? "goal" : "conceded")} onSkip={() => setScreen("result")} />
      ) : screen === "versus" && versus ? (
        <MatchDayView key={versus.seed} locale={locale} match={versus.match} me={boardSeats(s)[0]} rival={versus.seat} slots={slots} seed={versus.seed} reveal={!seenVersus.includes(versus.seed)} onFinish={(won) => { if (!seenVersus.includes(versus.seed)) { sfx(won ? "matchWin" : "defeat"); setSeenVersus((x) => [...x, versus.seed]); } }} onGoal={(mine) => sfx(mine ? "goal" : "conceded")} onBack={() => setScreen("result")} onExit={exit} />
      ) : s.seasons && s.mode === "duel" && s.match ? (
        <MatchDayView locale={locale} match={s.match} me={boardSeats(s)[0]} rival={boardSeats(s)[1]} slots={slots} seed={s.seed} reveal onFinish={(won) => sfx(won ? "matchWin" : "defeat")} onGoal={(mine) => sfx(mine ? "goal" : "conceded")} onAgain={() => restart()} onExit={exit} />
      ) : s.seasons && s.mode === "room" ? (
        <RoomTable locale={locale} slots={slots} onAgain={() => restart()} onExit={exit}
          rows={boardSeats(s).map((seatView, i) => ({ seat: seatView, season: s.seasons![i], team: lines(slots, seatView.picks).overall })).sort((a, b) => rankKey(b.season) - rankKey(a.season))} />
      ) : s.seasons ? (
        <SeasonResultView locale={locale} number={12} seed={s.seed} prediction={prediction} budget={s.budget} season={s.seasons[0]} slots={slots} picks={s.seats[0].picks} league={league} variant={s.variant} coinsEarned={s.coinsEarned} ranked={s.mode === "daily"}
          shareLink={challengeLink(s)} challenge={s.mode === "challenge" ? target : null} newBest={newBest} nextDaily={s.mode === "daily" ? nextDaily : null} onChallenge={s.mode === "challenge" ? undefined : challengeFriend}
          onPlayTarget={s.mode === "challenge" && target ? () => playAgainst(target.from, null, target.picks) : undefined}
          leaderboard={<DraftLeaderboard locale={locale} rows={rows} variant={s.variant} onVariant={(v) => log("onBoardVariant", v)} onOpen={setOpenRival} />}
          onShare={(text) => log("onShare", text)} onAgain={() => (s.mode === "free" ? restart("free") : openSetup("free"))} onFriends={() => openSetup("friends")} onExit={exit} />
      ) : null}
      {openRival?.picks && screen === "result" && <TeamSheet c={c} name={openRival.name} slots={slots} picks={openRival.picks} onPlay={() => playAgainst(openRival.name, openRival.avatar, openRival.picks!)} onClose={() => setOpenRival(null)} />}
    </Frame>
  );
}
