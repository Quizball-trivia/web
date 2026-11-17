"use client";
import "@/styles/application-utilities.css";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGameSounds } from "@/lib/sounds/useGameSounds";
import { rememberPostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { useAuthPromptStore } from "@/stores/authPrompt.store";
import type { EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { Frame, GreenButton, QuietButton } from "@/features/wordgames/ui";
import { useAuthStore } from "@/stores/auth.store";
import { draftCopy } from "./draft.copy";
import { DRAFT_SOUNDS, preloadDraftSounds, type DraftSoundMoment } from "./draft.sounds";
import { ChallengeIntro, DraftBoard, DraftHome, DraftLeaderboard, MatchDayView, SeasonResultView, SeasonTicker, TeamSheet, XiReady, type BoardRow, type BoardSeat } from "./DraftViews";
import { draftApi, reasonOf, withRetry, type ChallengeView, type DraftLeagues, type LeagueBoard, type RunEnvelope, type RunKind, type TieResponse } from "./draft.api";
import { FORMATIONS, SEASON_PACE, matchMs, seasonStats, type ClubSeason, type FormationId, type League, type MatchDay, type Pick, type SeasonResult, type TacticId } from "./draft.rules";
import { slotsOf } from "./draft.engine";
import { SeasonExtras, TeamTalk, WinterBreak, momentText } from "./DraftSeasonViews";
import type { ChallengeTarget } from "./draft.engine";

const ROLL_MS = 1000;
/** Stored a moment ago: this is the first time it is played. An older one opens straight at its result. */
const isNewTie = (t: TieResponse) => Date.now() - Date.parse(t.at) < 20_000;
const ME = (picks: (Pick | null)[], name: string): BoardSeat => ({ name, avatar: null, picks, me: true, active: true });

const FREE_RUN_KEY = "football-draft-free-run";
const LEAGUE_KEY = "football-draft-league";
const FORMATION_KEY = "football-draft-formation";
const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* private window */ } };
const forgetFreeRun = () => { try { localStorage.removeItem(FREE_RUN_KEY); } catch { /* private window */ } };
const savedFormation = (): FormationId => { const f = read(FORMATION_KEY); return f && f in FORMATIONS ? (f as FormationId) : "4-3-3"; };

const boardRows = (board: LeagueBoard | null): BoardRow[] => {
  if (!board) return [];
  const row = (e: LeagueBoard["top"][number], me: boolean): BoardRow => ({ rank: e.rank, runId: e.runId, userId: e.userId, name: e.username, avatar: (e.avatarCustomization ?? null) as BoardRow["avatar"], season: { w: e.w, d: e.d, l: e.l, points: e.points }, me });
  // The top list may be cached; my own entry is always fresh, so it replaces whatever the cache holds for me.
  const others = board.top.filter((e) => e.userId !== board.me?.userId).map((e) => row(e, false));
  return board.me ? [...others, row(board.me, true)].sort((x, y) => x.rank - y.rank || Number(y.me) - Number(x.me)) : others;
};

type Screen = "intro" | "challenge" | "draft" | "season" | "winter" | "result" | "versus" | "gone";
type Rival = BoardRow & { picks: (Pick | null)[]; formation: FormationId };

/**
 * Football Draft: choose a league, draft a Budget XI from squads that show names and prices only, play the season, and
 * land on that league's weekly board. Challenge links and old daily runs still open.
 */
export function DraftGame({ locale, onExit, onEvent, initialChallenge }: {
  locale: string; onExit?: () => void; onEvent?: (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => void; initialChallenge?: string | null;
}) {
  const c = draftCopy(locale);
  const router = useRouter();
  const authStatus = useAuthStore((s) => s.status);
  const openAuthPrompt = useAuthPromptStore((s) => s.open);
  const { playSfx } = useGameSounds();
  useEffect(() => { preloadDraftSounds(); }, []);
  const sfx = useCallback((m: DraftSoundMoment) => { const name = DRAFT_SOUNDS[m]; if (name) playSfx(name); }, [playSfx]);
  const exit = useCallback(() => (onExit ? onExit() : router.push("/play")), [onExit, router]);

  const [home, setHome] = useState<DraftLeagues | null>(null);
  const [leagueId, setLeagueId] = useState<string | null>(() => read(LEAGUE_KEY));
  const [formation, setFormation] = useState<FormationId>(savedFormation);
  const [screen, setScreen] = useState<Screen>(initialChallenge ? "challenge" : "intro");
  const [env, setEnv] = useState<RunEnvelope | null>(null);
  const [kind, setKind] = useState<RunKind>({ free: true });
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [upTo, setUpTo] = useState(0);
  const [heldFor, setHeldFor] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<ChallengeView | null>(null);
  const [challengeCode, setChallengeCode] = useState<string | null>(initialChallenge ?? null);
  const [board, setBoard] = useState<LeagueBoard | null>(null);
  const [openRival, setOpenRival] = useState<Rival | null>(null);
  const [tie, setTie] = useState<(TieResponse & { rivalName: string }) | null>(null);
  const [seenTies, setSeenTies] = useState<string[]>([]);
  // The link belongs to the run it was made for, and "copied" to the exact link copied: a late reply cannot show either on another run.
  const [challengeLink, setChallengeLink] = useState<{ run: string; url: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const linkRequest = useRef(0);
  const started = useRef(false);
  const starting = useRef(false);
  const [resumable, setResumable] = useState<string | null>(null);

  const state = env?.state ?? null;
  const league: League | null = state?.league ?? null;
  // Rules v2 drafts a bench after the XI: its three places come after the formation's eleven.
  const slots = state ? slotsOf({ formation: state.formation, rules: state.rules }) : FORMATIONS[formation];
  const myPicks = useMemo(() => state?.picks ?? Array(11).fill(null), [state?.picks]);
  const leagues = (home?.leagues ?? []) as League[];
  const chosen = leagues.find((l) => l.id === leagueId) ?? leagues[0] ?? null;
  const mine = useMemo(() => Object.fromEntries((home?.mine ?? []).map((m) => [m.leagueId, `${m.w}–${m.d}–${m.l}`])), [home?.mine]);

  // The leagues on offer and the member's week, again after a season so the card shows the new best, and when the player
  // comes back to the tab (a new week may have started).
  const [homeVersion, setHomeVersion] = useState(0);
  useEffect(() => {
    const back = () => { if (document.visibilityState === "visible") setHomeVersion((v) => v + 1); };
    document.addEventListener("visibilitychange", back);
    window.addEventListener("focus", back);
    return () => { document.removeEventListener("visibilitychange", back); window.removeEventListener("focus", back); };
  }, []);
  useEffect(() => {
    let live = true;
    void withRetry(() => draftApi.leagues(locale)).then((h) => { if (!live) return; setHome(h); setProblem((p) => (p === c.loadFailed ? null : p)); }).catch(() => { if (live) setProblem(c.loadFailed); });
    return () => { live = false; };
  }, [locale, authStatus, homeVersion, c.loadFailed]);

  // An unfinished draft stays on the server: a reload offers it back.
  useEffect(() => {
    const id = read(FREE_RUN_KEY);
    if (!id || initialChallenge) return;
    let live = true;
    void withRetry(() => draftApi.currentFree(id, locale)).then((r) => { if (live) { if (r.state.phase === "result") forgetFreeRun(); else setResumable(id); } }).catch((error: unknown) => {
      // Only when the run is really gone or someone else's: a dropped connection must not lose the way back to it.
      const reason = reasonOf(error);
      if (reason && reason !== "session_unavailable") forgetFreeRun();
    });
    return () => { live = false; };
  }, [initialChallenge, locale, authStatus]);
  useEffect(() => {
    if (!initialChallenge) return;
    let live = true;
    void withRetry(() => draftApi.challengeRead(initialChallenge, locale)).then((v) => { if (live) setChallenge(v); }).catch(() => { if (live) setScreen("gone"); });
    return () => { live = false; };
  }, [initialChallenge, locale]);

  // The weekly board of the league on screen: the chosen one at home, the run's own on the result.
  // Only a free run started on the board's rules is on a weekly board (an old daily run is ranked on its day's board).
  const weekly = "free" in kind && !!state?.ranked;
  const boardLeague = screen === "result" && weekly && state ? state.league.id : screen === "intro" ? chosen?.id ?? null : null;
  useEffect(() => {
    if (!boardLeague) return;
    let live = true;
    void withRetry(() => draftApi.leagueBoard(boardLeague, locale)).then((b) => { if (live) setBoard(b); }).catch(() => { if (live) setBoard(null); });
    return () => { live = false; };
  }, [boardLeague, locale, authStatus, homeVersion]);
  const shownBoard = board && board.leagueId === boardLeague ? board : null;

  /** Answers can arrive out of order: an older copy of the same run never replaces a newer one. */
  const take = useCallback((next: RunEnvelope) => setEnv((cur) => (cur && cur.run.id === next.run.id && cur.run.version > next.run.version ? cur : next)), []);
  const adopt = useCallback((next: RunEnvelope, k: RunKind) => {
    take(next); setKind(k); setProblem(null);
    setScreen(next.state.phase === "result" ? "result" : "draft");
  }, [take]);

  const resetLinks = useCallback(() => { setChallengeCode(null); setChallenge(null); linkRequest.current++; setChallengeLink(null); setCopiedUrl(null); }, []);

  const resume = useCallback(async () => {
    if (!resumable) return;
    resetLinks();
    try { adopt(await draftApi.currentFree(resumable, locale), { free: true }); } catch { setProblem(c.loadFailed); }
  }, [resumable, locale, adopt, resetLinks, c.loadFailed]);

  /** One move on the run. Moves are never resent: a lost or stale one re-reads the run and the player goes on from what the server holds. */
  const move = useCallback(async (path: Parameters<typeof draftApi.move>[1], body: Record<string, unknown> = {}): Promise<RunEnvelope | null> => {
    if (!env || pending) return null;
    setPending(true);
    try {
      const next = await draftApi.move(kind, path, env.run, body, locale);
      take(next); setProblem(null);
      return next;
    } catch (error) {
      const reason = reasonOf(error);
      if (reason !== "invalid_pick" && reason !== "no_respins") {
        const fresh = "daily" in kind && env.state.day ? await draftApi.startDaily(kind.daily, env.state.day, locale).catch(() => null) : "free" in kind ? await draftApi.currentFree(env.run.id, locale).catch(() => null) : null;
        if (fresh) {
          take(fresh);
          // The answer was lost but the move happened: the season was played, so go on to it.
          if (fresh.state.phase === "result") { setScreen("result"); if (path === "finish") onEvent?.("complete", { score: fresh.state.result?.season.points } as EngineEventDetail); }
        }
      }
      setProblem(reason === "day_over" ? c.dayOver : reason === "no_coins" ? c.noCoins : c.moveFailed);
      return null;
    } finally {
      setPending(false);
    }
  }, [env, pending, kind, locale, c, take, onEvent]);

  const signedInPrompt = useCallback(() => { rememberPostAuthRedirect(initialChallenge ? `/football-draft?challenge=${initialChallenge}` : "/football-draft"); openAuthPrompt(); }, [initialChallenge, openAuthPrompt]);

  const beginTracked = useCallback(() => {
    if (started.current) onEvent?.("replay");
    started.current = true;
    onEvent?.("start");
  }, [onEvent]);

  const startDraft = useCallback(async () => {
    if (!chosen || starting.current) return;
    starting.current = true;
    setPending(true);
    resetLinks();
    try {
      const next = await draftApi.startFree({ leagueId: chosen.id, era: "all", formation, variant: "budget" }, locale);
      beginTracked();
      write(FREE_RUN_KEY, next.run.id);
      setResumable(null);
      adopt(next, { free: true });
    } catch (error) { setProblem(reasonOf(error) === "unknown_league" ? c.noSuchEra : c.loadFailed); } finally { setPending(false); starting.current = false; }
  }, [chosen, formation, locale, adopt, beginTracked, resetLinks, c.loadFailed, c.noSuchEra]);

  const acceptChallenge = useCallback(async () => {
    linkRequest.current++; setChallengeLink(null); setCopiedUrl(null);
    if (!challengeCode || starting.current) return;
    starting.current = true;
    setPending(true);
    try {
      const out = await draftApi.challengeAccept(challengeCode, locale);
      if ((out.daily ?? out.free)?.state.phase !== "result") beginTracked();
      // A challenge from an old daily opens that daily's run.
      if (out.daily && out.variant) adopt(out.daily, { daily: out.variant });
      else if (out.free) adopt(out.free, { free: true });
    } catch (error) {
      const reason = reasonOf(error);
      if (reason === "sign_in_for_today") signedInPrompt(); else setProblem(reason === "own_challenge" ? c.ownChallenge : c.loadFailed);
    } finally { setPending(false); starting.current = false; }
  }, [challengeCode, locale, adopt, beginTracked, signedInPrompt, c]);

  // Spin: the squad is asked for at once and shown when the reels stop, so the wait feels the same on any connection.
  const spinNow = useCallback(async () => {
    if (!state?.armed) return;
    sfx("spin"); setRolling(true);
    const at = Date.now();
    const next = await move("spin");
    const wait = Math.max(0, ROLL_MS - (Date.now() - at));
    setTimeout(() => { setRolling(false); if (next) sfx("land"); }, wait);
  }, [state?.armed, move, sfx]);

  /** Kick-off: the whole season, or (rules v2) its first half; from the winter break, the second half. */
  const finishDraft = useCallback(async () => {
    const fromHalf = state?.phase === "half" ? state.half?.half ?? 0 : 0;
    const next = await move("finish");
    if (!next) return;
    sfx("kickoff"); setUpTo(fromHalf); setHeldFor(null); setScreen("season");
    if (next.state.phase === "result") onEvent?.("complete", { score: next.state.result?.season.points } as EngineEventDetail);
  }, [move, sfx, onEvent, state?.phase, state?.half?.half]);

  // The season on the clock. At the winter break only the first half exists: it plays as a season of its own length.
  const halfSeason = useMemo<SeasonResult | null>(() => {
    const h = state?.phase === "half" ? state.half : null;
    if (!h) return null;
    const matches = h.matches.map((m) => ({ ...m, opponent: { id: m.opponent, name: m.opponent, strength: 0, gk: 0, def: 0, mid: 0, att: 0 }, reason: null }));
    return { w: 0, d: 0, l: 0, gf: 0, ga: 0, points: 0, position: h.position, teams: 0, games: h.half, finish: "mid", matches, weak: null, table: [], race: [] };
  }, [state?.phase, state?.half]);
  const season = state?.result?.season ?? null;
  const ticking = halfSeason ?? season;
  const firstDrop = ticking ? ticking.matches.findIndex((m) => m.gf <= m.ga) : -1;
  const holding = !!ticking && firstDrop >= 0 && upTo === firstDrop + 1 && heldFor !== env?.run.id;
  useEffect(() => {
    if (screen !== "season" || !ticking) return;
    if (upTo >= ticking.games) { sfx("fullTime"); const t = setTimeout(() => setScreen(halfSeason ? "winter" : "result"), SEASON_PACE.end); return () => clearTimeout(t); }
    if (holding) { const t = setTimeout(() => setHeldFor(env?.run.id ?? null), SEASON_PACE.runEnded); return () => clearTimeout(t); }
    const t = setTimeout(() => setUpTo((v) => v + 1), matchMs(ticking, upTo));
    return () => clearTimeout(t);
  }, [screen, ticking, halfSeason, upTo, holding, sfx, env?.run.id]);
  // The season's top scorer, from the same goals the season showed: measured against the real Golden Boot.
  const topScorer = useMemo(() => {
    if (!season || !state?.result) return null;
    const top = seasonStats(state.result.goalSeed, season, slots, myPicks).topScorer;
    const p = top ? myPicks[slots.findIndex((x) => x.id === top.slotId)] : null;
    return top && p ? { name: p.academy ? c.academy : p.player.name, goals: top.goals } : null;
  }, [season, state?.result, slots, myPicks, c.academy]);
  const tickerMoments = useMemo(() => (state?.half?.moments ?? state?.result?.extra?.moments ?? []).map((m) => ({ round: m.round, text: momentText(c, m) })), [state?.half?.moments, state?.result?.extra?.moments, c]);
  // A run left at the winter break opens there.
  useEffect(() => { if (screen === "draft" && state?.phase === "half") setScreen("winter"); }, [screen, state?.phase]);

  const resultSounded = useRef<string | null>(null);
  useEffect(() => {
    if (screen !== "result" || !season || !env || resultSounded.current === env.run.id) return;
    resultSounded.current = env.run.id;
    const f = season.finish;
    sfx(f === "perfect" ? "perfect" : f === "champions" ? "glory" : f === "relegation" ? "defeat" : "result");
    if ((state?.result?.coinsEarned ?? 0) > 0) { const t = setTimeout(() => sfx("coins"), 1200); return () => clearTimeout(t); }
  }, [screen, season, env, sfx, state?.result?.coinsEarned]);

  // Once played, the challenger's team opens: it is the comparison on the result.
  const reread = useRef(false);
  useEffect(() => {
    if (screen !== "result" || !challengeCode || reread.current) return;
    reread.current = true;
    void withRetry(() => draftApi.challengeRead(challengeCode, locale)).then(setChallenge).catch(() => undefined);
  }, [screen, challengeCode, locale]);
  useEffect(() => { if (state?.phase === "result" && "free" in kind) forgetFreeRun(); }, [state?.phase, kind]);

  // A team sheet belongs to the board it was opened from: another league or screen drops a late reply and closes the sheet.
  const teamRequest = useRef(0);
  useEffect(() => {
    teamRequest.current++;
    setOpenRival(null);
  }, [boardLeague, screen]);
  const openTeam = useCallback(async (row: BoardRow) => {
    if (!row.runId) return;
    const request = ++teamRequest.current;
    try {
      const team = await draftApi.boardTeam(row.runId, locale);
      if (request === teamRequest.current) setOpenRival({ ...row, picks: team.picks, formation: team.formation });
    } catch (error) { if (request === teamRequest.current) setProblem(reasonOf(error) === "challenge_unplayed" ? c.teamHidden : c.loadFailed); }
  }, [locale, c.loadFailed, c.teamHidden]);

  // Playing a board team needs a season of your own on the board on screen (the same league and week).
  const canPlayRival = !!openRival && !openRival.me && !!shownBoard?.me;
  const playRival = useCallback(async () => {
    if (!openRival?.runId) return;
    setPending(true);
    try {
      const t = await draftApi.boardTie(openRival.runId, locale);
      setTie({ ...t, rivalName: openRival.name });
      setOpenRival(null);
      if (!seenTies.includes(t.id) && isNewTie(t)) sfx("kickoff"); else setSeenTies((x) => [...x, t.id]);
      setScreen("versus");
    } catch (error) { setProblem(reasonOf(error) === "challenge_unplayed" ? c.teamHidden : c.loadFailed); } finally { setPending(false); }
  }, [openRival, locale, seenTies, sfx, c.loadFailed, c.teamHidden]);

  const playChallengeTie = useCallback(async () => {
    if (!challengeCode || !challenge) return;
    setPending(true);
    try {
      const t = await draftApi.challengeTie(challengeCode, locale);
      setTie({ ...t, rivalName: challenge.from });
      if (!seenTies.includes(t.id) && isNewTie(t)) sfx("kickoff"); else setSeenTies((x) => [...x, t.id]);
      setScreen("versus");
    } catch { setProblem(c.loadFailed); } finally { setPending(false); }
  }, [challengeCode, challenge, locale, seenTies, sfx, c.loadFailed]);

  const runDay = state?.day;
  /** A link a friend opens on the same draw. */
  const challengeFriend = useCallback(async () => {
    if (!env) return;
    const request = ++linkRequest.current;
    const run = env.run.id;
    let url: string;
    try {
      const body = "daily" in kind && runDay ? { variant: kind.daily, day: runDay } : { runId: run };
      const { code } = await draftApi.challengeCreate(body, locale);
      url = `${window.location.origin}/football-draft?challenge=${code}`;
    } catch {
      if (request === linkRequest.current) setProblem(c.loadFailed);
      return;
    }
    if (request !== linkRequest.current) return;
    setProblem(null);
    setChallengeLink({ run, url });
    setCopiedUrl(null);
    // After the network wait the browser may refuse to share or copy (no user gesture left): the link stays on screen with its own Copy.
    try {
      if (navigator.share) await navigator.share({ url, text: c.challengeShare });
      else { await navigator.clipboard.writeText(url); if (request === linkRequest.current) setCopiedUrl(url); }
    } catch { /* cancelled or refused */ }
  }, [env, kind, runDay, locale, c]);
  // Leaving the result (another screen or run) cancels a challenge still on its way: a late reply neither shares nor shows an error.
  useEffect(() => {
    const requests = linkRequest;
    requests.current++;
    return () => { requests.current++; };
  }, [screen, env?.run.id]);
  const shownLink = challengeLink && env && challengeLink.run === env.run.id ? challengeLink.url : null;
  const copyChallengeLink = useCallback(async () => {
    if (!shownLink) return;
    const request = linkRequest.current;
    try { await navigator.clipboard.writeText(shownLink); if (request === linkRequest.current) setCopiedUrl(shownLink); } catch { /* the field stays selectable */ }
  }, [shownLink]);

  const backHome = useCallback(() => { setEnv(null); setOpenRival(null); setTie(null); resetLinks(); setHomeVersion((v) => v + 1); setScreen("intro"); }, [resetLinks]);

  // The places the server just filled with free academy kids, as it reports them.
  const forcedKids = useMemo(() => (state?.forced ?? []).map((id) => slots.find((x) => x.id === id)?.label ?? id), [state?.forced, slots]);
  const moneyNotice = forcedKids.length ? c.academyMoney(forcedKids.join(", "), forcedKids.length) : state?.notice === "academy_money" ? c.academyMoneyAny : null;
  const notice = moneyNotice ?? (state?.notice === "no_fit" ? c.noFit : state?.notice === "academy" ? c.academyNotice : state?.notice === "no_money" ? c.noMoneyChoice : state?.notice === "no_other_season" ? c.noOtherSeason : state?.notice === "no_coins" ? c.noCoins : null) ?? problem;
  const target: ChallengeTarget | null = challenge ? { from: challenge.from, seed: "", leagueId: "", era: challenge.era, formation: challenge.formation, variant: challenge.variant, respins: 2, ...challenge.record, picks: challenge.picks ?? Array(11).fill(null) } : null;
  const boardTitle = (l: League | null) => (l ? c.boardWeek(c.leagueName(l)) : c.board);
  const leaderboard = (l: League | null, open: boolean) => (
    <DraftLeaderboard locale={locale} rows={boardRows(shownBoard)} title={boardTitle(l)} onOpen={open ? (row) => void openTeam(row) : undefined}
      footer={home?.guest ? <button type="button" onClick={signedInPrompt} className="font-semibold text-brand-green-light underline underline-offset-2">{c.signInBoard}</button> : c.weekReset} />
  );

  if (screen === "gone") return <Frame lang={locale}><div className="m-auto text-center"><p className="text-white/80">{c.challengeGone}</p><GreenButton className="mt-4" onClick={backHome}>{c.back}</GreenButton></div></Frame>;
  if (screen === "intro" && !home) return <Frame lang={locale}><div className="m-auto text-center">{problem ? <><p role="alert" className="text-white/80">{problem}</p><QuietButton className="mt-4" onClick={exit}>{c.exit}</QuietButton></> : <p className="text-sm text-white/60">{c.loading}</p>}</div></Frame>;

  return (
    <Frame lang={locale} wide>
      {screen === "intro" && home ? (
        <DraftHome locale={locale} leagues={leagues} mine={mine} leagueId={chosen?.id ?? ""} formation={formation} pending={pending}
          onLeague={(id) => { setLeagueId(id); write(LEAGUE_KEY, id); }} onFormation={(f) => { setFormation(f); write(FORMATION_KEY, f); }}
          onStart={() => void startDraft()} onFriends={() => router.push("/friend/room/new?room=draft")} onExit={exit}
          resumeLabel={resumable ? c.resumeDraft : null} onResume={() => void resume()} guestNote={home.guest ? c.signInBoard : null} onSignIn={signedInPrompt}
          board={leaderboard(chosen, true)} />
      ) : screen === "challenge" ? (
        target ? <ChallengeIntro locale={locale} target={target} league={{ id: "", name: challenge!.league, short: "", teams: 0, games: 0 }} onStart={() => void acceptChallenge()} onExit={backHome} /> : <p className="m-auto text-sm text-white/60">{c.loading}</p>
      ) : screen === "draft" && state?.phase === "ready" && state.rules === 2 && state.tactics ? (
        <TeamTalk locale={locale} slots={slots} picks={myPicks} budget={state.budget ?? undefined} tactics={state.tactics} tactic={state.tactic ?? null} captain={state.captain ?? null} links={state.links ?? []} pending={pending}
          notice={moneyNotice ?? (state.notice === "academy" ? c.academyNotice : null)}
          onCaptain={(slotId) => void move("captain", { slotId })} onTactic={(t: TacticId) => void move("tactic", { tactic: t })} onPlay={() => void finishDraft()} onExit={exit} />
      ) : screen === "winter" && state?.phase === "half" && state.half && state.tactics ? (
        <WinterBreak locale={locale} half={state.half} slots={slots} picks={myPicks} tactics={state.tactics} tactic={state.tactic2 ?? state.tactic ?? null} pending={pending}
          onScout={() => void move("january/spin")} onSign={(playerId, slotId) => { void move("january/sign", { playerId, slotId }).then((next) => { if (next) sfx("sign"); }); }}
          onTactic={(t: TacticId) => void move("tactic", { tactic: t })} onPlay={() => void finishDraft()} onExit={exit} />
      ) : screen === "draft" && state?.phase === "ready" ? (
        <XiReady locale={locale} slots={slots} picks={myPicks} variant={state.variant} hidePicks={state.hidePicks} budget={state.budget ?? undefined} notice={moneyNotice ?? (state.notice === "academy" ? c.academyNotice : null)} undoName={state.canUndo ? state.undoName || c.academyKid : null} onUndo={() => void move("undo")} onPlay={() => void finishDraft()} onExit={exit} />
      ) : screen === "draft" && state && league ? (
        <DraftBoard locale={locale} slots={slots} spin={(state.spin ? { ...state.spin, clubId: state.spin.id, leagueId: league.id } : { id: "", clubId: "", club: "", season: "", leagueId: league.id, legend: false, finish: 0, players: [] }) as ClubSeason} league={league} variant={state.variant} round={state.round}
          hideSquad={state.hideSquad} hidePicks={state.hidePicks} links={state.links}
          seats={[ME(myPicks, c.you)]} myPicks={myPicks} taken={[]} respins={state.respins} respinCost={state.respinCost} coins={null} mode={"daily" in kind ? "daily" : "free"} notice={notice} spinning={rolling} armed={state.armed && !rolling} onSpin={() => void spinNow()} pool={state.pool}
          budget={state.budget ?? undefined} undoName={state.canUndo ? state.undoName || c.academyKid : null} onUndo={() => void move("undo")} onAcademy={(slotId) => { void move("academy", { slotId }).then((next) => { if (next) sfx("sign"); }); }}
          onPick={(playerId, slotId) => {
            void move("pick", { playerId, slotId }).then((next) => {
              if (!next) return;
              // The rating shows once he is signed: a star sounds like one.
              const signed = next.state.picks.find((p) => p?.slotId === slotId);
              sfx(signed && !next.state.hidePicks && signed.player.rating - (signed.penalty ?? 0) >= 85 ? "signStar" : "sign");
            });
          }}
          onRespin={(k) => { setRolling(true); void move("respin", { kind: k }).then((next) => { if (next && next.state.spin?.id !== state.spin?.id) { sfx("respin"); setTimeout(() => setRolling(false), ROLL_MS); } else setRolling(false); }); }} onExit={exit} />
      ) : screen === "season" && ticking && state && (state.result || halfSeason) ? (
        <SeasonTicker locale={locale} seed={state.result?.goalSeed ?? env?.run.id ?? ""} season={ticking} slots={slots} picks={myPicks} variant={state.variant} upTo={upTo} matchTime={matchMs(ticking, upTo)} holding={holding} onGoal={(mine) => sfx(mine ? "goal" : "conceded")}
          onSkip={() => setScreen(halfSeason ? "winter" : "result")} moments={tickerMoments} label={state.rules === 2 ? (halfSeason ? c.firstHalf : c.secondHalf) : undefined} />
      ) : screen === "versus" && tie ? (
        <MatchDayView key={tie.id} locale={locale} match={tie.result as MatchDay} me={ME(tie.picks ?? myPicks, c.you)} rival={{ name: tie.rivalName, avatar: null, picks: tie.opponentPicks, me: false, active: false }} slots={FORMATIONS[tie.formation]} rivalSlots={FORMATIONS[tie.opponentFormation ?? tie.formation]} seed={tie.seed} reveal={!seenTies.includes(tie.id)}
          onFinish={(won) => { if (!seenTies.includes(tie.id)) { sfx(won ? "matchWin" : "defeat"); setSeenTies((x) => [...x, tie.id]); } }} onGoal={(mine) => sfx(mine ? "goal" : "conceded")} onBack={() => setScreen(state?.result ? "result" : "intro")} onExit={exit} />
      ) : season && state?.result && league ? (
        <>
          <SeasonResultView locale={locale} number={state.number ?? 0} seed={state.result.goalSeed} budget={state.budget ?? undefined} season={season} slots={slots} picks={myPicks} league={league} variant={state.variant} coinsEarned={state.result.coinsEarned} ranked={weekly}
            shareLink={typeof window === "undefined" ? "" : `${window.location.origin}/football-draft`} challenge={challengeCode && target ? target : null} onChallenge={() => void challengeFriend()} onPlayTarget={challengeCode ? () => void playChallengeTie() : undefined}
            leaderboard={weekly ? leaderboard(league, true) : undefined} captain={state.result.extra?.captain ?? null} links={state.result.extra?.links ?? null}
            extras={state.result.extra ? <SeasonExtras locale={locale} extra={state.result.extra} slots={slots} picks={myPicks} finish={season.finish} topScorer={topScorer} /> : undefined}
            onShare={() => undefined} onAgain={backHome} onFriends={() => router.push("/friend/room/new?room=draft")} onExit={exit} />
          {shownLink && (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-surface-card p-2">
              <input readOnly value={shownLink} aria-label={c.challengeFriend} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 bg-transparent px-1 text-xs text-white/90 outline-none" />
              <button type="button" onClick={() => void copyChallengeLink()} className="shrink-0 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-black uppercase text-white">{copiedUrl === shownLink ? c.shareCopied : c.shareCopy}</button>
            </div>
          )}
          <p role="status" aria-live="polite" className="sr-only">{shownLink && copiedUrl === shownLink ? c.shareCopied : ""}</p>
        </>
      ) : null}
      {openRival && <TeamSheet c={c} name={openRival.name} slots={FORMATIONS[openRival.formation]} picks={openRival.picks} onPlay={canPlayRival ? () => void playRival() : undefined} onClose={() => setOpenRival(null)} />}
      {problem && screen !== "draft" && <p role="alert" className="mt-3 rounded-xl bg-brand-red-soft/20 px-3 py-2 text-center text-xs font-semibold text-white">{problem}</p>}
      {problem && screen === "draft" && state?.phase === "ready" && <p role="alert" className="mt-3 rounded-xl bg-brand-red-soft/20 px-3 py-2 text-center text-xs font-semibold text-white">{problem}</p>}
    </Frame>
  );
}
