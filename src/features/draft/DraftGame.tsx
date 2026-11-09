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
import { ChallengeIntro, DraftBoard, DraftIntro, DraftLeaderboard, DraftSetup, MatchDayView, SeasonResultView, SeasonTicker, TeamSheet, XiReady, type BoardRow, type BoardSeat, type DraftSetupValues } from "./DraftViews";
import { boardRowsOf } from "./DraftBoardPage";
import { draftApi, reasonOf, withRetry, type ChallengeView, type DraftToday, type RunEnvelope, type RunKind, type TieResponse } from "./draft.api";
import { FORMATIONS, SEASON_PACE, matchMs, type ClubSeason, type League, type MatchDay, type Pick, type Variant } from "./draft.rules";
import type { ChallengeTarget } from "./draft.engine";

const ROLL_MS = 1000;
/** Stored a moment ago: this is the first time it is played. An older one opens straight at its result. */
const isNewTie = (t: TieResponse) => Date.now() - Date.parse(t.at) < 20_000;
const ME = (picks: (Pick | null)[], name: string): BoardSeat => ({ name, avatar: null, picks, me: true, active: true });

/** Time to the next Buenos Aires midnight, like every daily. */
function useNextDaily(active: boolean): string | null {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const left = Math.ceil(86_400 - (((Date.now() - 3 * 3_600_000) / 1000) % 86_400));
      const pad = (n: number) => String(n).padStart(2, "0");
      setText(`${pad(Math.floor(left / 3600))}:${pad(Math.floor(left / 60) % 60)}:${pad(left % 60)}`);
    };
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [active]);
  return text;
}

const FREE_RUN_KEY = "football-draft-free-run";
const VARIANT_KEY = "football-draft-variant";
const savedFreeRun = (): string | null => { try { return localStorage.getItem(FREE_RUN_KEY); } catch { return null; } };
const rememberFreeRun = (id: string) => { try { localStorage.setItem(FREE_RUN_KEY, id); } catch { /* private window */ } };
const forgetFreeRun = () => { try { localStorage.removeItem(FREE_RUN_KEY); } catch { /* private window */ } };
const savedVariant = (): Variant => { try { const v = typeof window === "undefined" ? null : sessionStorage.getItem(VARIANT_KEY); return v === "classic" || v === "knowledge" ? v : "budget"; } catch { return "budget"; } };
const rememberVariant = (v: Variant) => { try { sessionStorage.setItem(VARIANT_KEY, v); } catch { /* private window */ } };

type Screen = "intro" | "setup" | "challenge" | "draft" | "season" | "result" | "versus" | "gone";

export function DraftGame({ locale, onExit, onEvent, initialDay, onDay, initialChallenge }: {
  locale: string; onExit?: () => void; onEvent?: (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => void;
  initialDay?: string | null; onDay?: (day: string, newest: boolean) => void; initialChallenge?: string | null;
}) {
  const c = draftCopy(locale);
  const router = useRouter();
  const authStatus = useAuthStore((s) => s.status);
  const openAuthPrompt = useAuthPromptStore((s) => s.open);
  const { playSfx } = useGameSounds();
  useEffect(() => { preloadDraftSounds(); }, []);
  const sfx = useCallback((m: DraftSoundMoment) => { const name = DRAFT_SOUNDS[m]; if (name) playSfx(name); }, [playSfx]);
  const exit = useCallback(() => (onExit ? onExit() : router.push("/play")), [onExit, router]);

  const [variant, setVariant] = useState<Variant>(savedVariant);
  const [today, setToday] = useState<DraftToday | null>(null);
  const [screen, setScreen] = useState<Screen>(initialChallenge ? "challenge" : "intro");
  const [env, setEnv] = useState<RunEnvelope | null>(null);
  const [kind, setKind] = useState<RunKind>({ daily: "budget" });
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [upTo, setUpTo] = useState(0);
  const [heldFor, setHeldFor] = useState<string | null>(null);
  const [setup, setSetup] = useState<DraftSetupValues>({ leagueId: "pl", era: "all", formation: "4-3-3", variant: "budget", seats: 2 });
  const [challenge, setChallenge] = useState<ChallengeView | null>(null);
  const [challengeCode, setChallengeCode] = useState<string | null>(initialChallenge ?? null);
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [openRival, setOpenRival] = useState<(BoardRow & { picks: (Pick | null)[] }) | null>(null);
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
  const league: League | null = state?.league ?? today?.league ?? null;
  const slots = state ? FORMATIONS[state.formation] : FORMATIONS["4-3-3"];
  const myPicks = useMemo(() => state?.picks ?? Array(11).fill(null), [state?.picks]);
  const nextDaily = useNextDaily(screen === "intro" || screen === "result");

  // What the first screen says about today, for the version chosen.
  useEffect(() => {
    let live = true;
    void withRetry(() => draftApi.today(variant, locale, initialDay)).then((t) => { if (!live) return; setToday(t); setProblem((p) => (p === c.loadFailed ? null : p)); }).catch(() => { if (live) setProblem(c.loadFailed); });
    return () => { live = false; };
  }, [variant, locale, initialDay, authStatus, c.loadFailed]);

  // An unfinished free draft stays on the server: a reload offers it back.
  useEffect(() => {
    const id = savedFreeRun();
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

  /** Answers can arrive out of order: an older copy of the same run never replaces a newer one. */
  const take = useCallback((next: RunEnvelope) => setEnv((cur) => (cur && cur.run.id === next.run.id && cur.run.version > next.run.version ? cur : next)), []);
  const adopt = useCallback((next: RunEnvelope, k: RunKind) => {
    take(next); setKind(k); setProblem(null);
    setScreen(next.state.phase === "result" ? "result" : "draft");
  }, [take]);

  const resume = useCallback(async () => {
    if (!resumable) return;
    setChallengeCode(null); setChallenge(null); linkRequest.current++; setChallengeLink(null); setCopiedUrl(null);
    try { adopt(await draftApi.currentFree(resumable, locale), { free: true }); } catch { setProblem(c.loadFailed); }
  }, [resumable, locale, adopt, c.loadFailed]);

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

  const signedInPrompt = useCallback(() => { rememberVariant(variant); rememberPostAuthRedirect(initialChallenge ? `/football-draft?challenge=${initialChallenge}` : initialDay ? `/football-draft?dia=${initialDay}` : "/football-draft"); openAuthPrompt(); }, [initialChallenge, initialDay, variant, openAuthPrompt]);

  const beginTracked = useCallback(() => {
    if (started.current) onEvent?.("replay");
    started.current = true;
    onEvent?.("start");
  }, [onEvent]);

  const playDaily = useCallback(async () => {
    if (!today || starting.current) return;
    starting.current = true;
    setPending(true);
    setChallengeCode(null); setChallenge(null); linkRequest.current++; setChallengeLink(null); setCopiedUrl(null);
    try {
      // A guest opens yesterday from today's entry, and a closed day chosen from the address as it is.
      const day = today.guest && today.day >= today.live ? today.practiceDay : today.day;
      if (!day) { signedInPrompt(); return; }
      const next = await withRetry(() => draftApi.startDaily(variant, day, locale));
      if (next.state.phase !== "result") beginTracked();
      adopt(next, { daily: variant });
      onDay?.(day, day === today.live);
    } catch (error) {
      if (reasonOf(error) === "sign_in_for_today") signedInPrompt(); else setProblem(c.loadFailed);
    } finally { setPending(false); starting.current = false; }
  }, [today, variant, locale, adopt, beginTracked, signedInPrompt, onDay, c.loadFailed]);

  const startSetup = useCallback(async () => {
    if (starting.current) return;
    starting.current = true;
    setPending(true);
    setChallengeCode(null); setChallenge(null); linkRequest.current++; setChallengeLink(null); setCopiedUrl(null);
    try {
      const next = await draftApi.startFree({ leagueId: setup.leagueId, era: setup.era, formation: setup.formation, variant: setup.variant }, locale);
      beginTracked();
      rememberFreeRun(next.run.id);
      adopt(next, { free: true });
    } catch (error) { setProblem(reasonOf(error) === "unknown_league" ? c.noSuchEra : c.loadFailed); } finally { setPending(false); starting.current = false; }
  }, [setup, locale, adopt, beginTracked, c.loadFailed, c.noSuchEra]);

  const acceptChallenge = useCallback(async () => {
    linkRequest.current++; setChallengeLink(null); setCopiedUrl(null);
    if (!challengeCode || starting.current) return;
    starting.current = true;
    setPending(true);
    try {
      const out = await draftApi.challengeAccept(challengeCode, locale);
      if ((out.daily ?? out.free)?.state.phase !== "result") beginTracked();
      if (out.daily && out.variant) { setVariant(out.variant); adopt(out.daily, { daily: out.variant }); }
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

  const finishDraft = useCallback(async () => {
    const next = await move("finish");
    if (!next) return;
    sfx("kickoff"); setUpTo(0); setHeldFor(null); setScreen("season");
    onEvent?.("complete", { score: next.state.result?.season.points } as EngineEventDetail);
  }, [move, sfx, onEvent]);

  // The season on the clock.
  const season = state?.result?.season ?? null;
  const firstDrop = season ? season.matches.findIndex((m) => m.gf <= m.ga) : -1;
  const holding = !!season && firstDrop >= 0 && upTo === firstDrop + 1 && heldFor !== env?.run.id;
  useEffect(() => {
    if (screen !== "season" || !season) return;
    if (upTo >= season.games) { sfx("fullTime"); const t = setTimeout(() => setScreen("result"), SEASON_PACE.end); return () => clearTimeout(t); }
    if (holding) { const t = setTimeout(() => setHeldFor(env?.run.id ?? null), SEASON_PACE.runEnded); return () => clearTimeout(t); }
    const t = setTimeout(() => setUpTo((v) => v + 1), matchMs(season, upTo));
    return () => clearTimeout(t);
  }, [screen, season, upTo, holding, sfx, env?.run.id]);

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

  // The board of the day just played.
  const boardDay = "daily" in kind ? state?.day : null;
  const boardVariant = state?.variant ?? variant;
  useEffect(() => {
    if (screen !== "result" || !boardDay) return;
    let live = true;
    void withRetry(() => draftApi.leaderboard(boardVariant, boardDay, locale)).then((b) => {
      if (!live) return;
      const rows = boardRowsOf(b.top);
      const mine = b.me ? boardRowsOf([b.me])[0] : null;
      setBoard((mine ? [...rows.filter((r) => r.userId !== mine.userId), { ...mine, me: true }] : rows).sort((x, y) => x.rank - y.rank));
    }).catch(() => undefined);
    return () => { live = false; };
  }, [screen, boardDay, boardVariant, locale]);

  const openTeam = useCallback(async (row: BoardRow) => {
    if (!boardDay || !row.userId) return;
    try {
      const team = await draftApi.team(boardVariant, boardDay, row.userId, locale);
      setOpenRival({ ...row, picks: team.picks });
    } catch { setProblem(c.loadFailed); }
  }, [boardDay, boardVariant, locale, c.loadFailed]);

  const playRival = useCallback(async () => {
    if (!openRival || !boardDay || !openRival.userId) return;
    setPending(true);
    try {
      const t = await draftApi.tie(boardVariant, boardDay, openRival.userId, locale);
      setTie({ ...t, rivalName: openRival.name });
      setOpenRival(null);
      if (!seenTies.includes(t.id) && isNewTie(t)) sfx("kickoff"); else setSeenTies((x) => [...x, t.id]);
      setScreen("versus");
    } catch { setProblem(c.loadFailed); } finally { setPending(false); }
  }, [openRival, boardDay, boardVariant, locale, seenTies, sfx, c.loadFailed]);

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
  // Leaving the result (another screen, version or run) cancels a challenge still on its way: a late reply neither shares nor shows an error.
  useEffect(() => {
    const requests = linkRequest;
    requests.current++;
    return () => { requests.current++; };
  }, [screen, variant, env?.run.id]);
  const shownLink = challengeLink && env && challengeLink.run === env.run.id ? challengeLink.url : null;
  const copyChallengeLink = useCallback(async () => {
    if (!shownLink) return;
    const request = linkRequest.current;
    try { await navigator.clipboard.writeText(shownLink); if (request === linkRequest.current) setCopiedUrl(shownLink); } catch { /* the field stays selectable */ }
  }, [shownLink]);

  const notice = (state?.notice === "no_fit" ? c.noFit : state?.notice === "academy" ? c.academyNotice : state?.notice === "no_money" ? c.noMoney : state?.notice === "no_other_season" ? c.noOtherSeason : state?.notice === "no_coins" ? c.noCoins : null) ?? problem;
  const target: ChallengeTarget | null = challenge ? { from: challenge.from, seed: "", leagueId: "", era: challenge.era, formation: challenge.formation, variant: challenge.variant, respins: 2, ...challenge.record, picks: challenge.picks ?? Array(11).fill(null) } : null;

  if (screen === "gone") return <Frame lang={locale}><div className="m-auto text-center"><p className="text-white/80">{c.challengeGone}</p><GreenButton className="mt-4" onClick={() => setScreen("intro")}>{c.playDaily}</GreenButton></div></Frame>;
  if (screen === "intro" && !today) return <Frame lang={locale}><div className="m-auto text-center">{problem ? <><p role="alert" className="text-white/80">{problem}</p><QuietButton className="mt-4" onClick={exit}>{c.exit}</QuietButton></> : <p className="text-sm text-white/60">{c.loading}</p>}</div></Frame>;

  return (
    <Frame lang={locale} wide>
      {screen === "intro" && today ? (
        <DraftIntro locale={locale} number={today.number} league={today.league as League} best={today.best?.rec ?? null} nextDaily={nextDaily} variant={variant} onVariant={setVariant} onExit={exit}
          dailyLabel={today.guest ? c.guestPractice : today.played ? c.dailySeen : undefined} guestNote={today.guest ? c.guestSignIn : null} onSignIn={signedInPrompt}
          resumeLabel={resumable ? c.resumeDraft : null} onResume={() => void resume()} onDaily={() => void playDaily()} onFree={() => { setSetup((x) => ({ ...x, variant })); setScreen("setup"); }} onFriends={() => router.push("/friend/room/new?room=draft")} />
      ) : screen === "setup" && today ? (
        <DraftSetup locale={locale} leagues={today.leagues as League[]} values={setup} friends={false} onChange={setSetup} onStart={() => void startSetup()} onExit={() => setScreen("intro")} />
      ) : screen === "challenge" ? (
        target ? <ChallengeIntro locale={locale} target={target} league={{ id: "", name: challenge!.league, short: "", teams: 0, games: 0 }} onStart={() => void acceptChallenge()} onExit={() => { setChallengeCode(null); setScreen("intro"); }} /> : <p className="m-auto text-sm text-white/60">{c.loading}</p>
      ) : screen === "draft" && state?.phase === "ready" ? (
        <XiReady locale={locale} slots={slots} picks={myPicks} variant={state.variant} budget={state.budget ?? undefined} prediction={state.prediction} notice={state.notice === "academy" ? c.academyNotice : null} undoName={state.canUndo ? state.undoName || c.academyKid : null} onUndo={() => void move("undo")} onPlay={() => void finishDraft()} onExit={exit} />
      ) : screen === "draft" && state && league ? (
        <DraftBoard locale={locale} slots={slots} spin={(state.spin ? { ...state.spin, clubId: state.spin.id, leagueId: league.id } : { id: "", clubId: "", club: "", season: "", leagueId: league.id, legend: false, finish: 0, players: [] }) as ClubSeason} league={league} variant={state.variant} round={state.round}
          seats={[ME(myPicks, c.you)]} myPicks={myPicks} taken={[]} respins={state.respins} respinCost={state.respinCost} coins={null} mode={"daily" in kind ? "daily" : "free"} notice={notice} spinning={rolling} armed={state.armed && !rolling} onSpin={() => void spinNow()} pool={state.pool}
          budget={state.budget ?? undefined} undoName={state.canUndo ? state.undoName || c.academyKid : null} onUndo={() => void move("undo")} onAcademy={(slotId) => { void move("academy", { slotId }).then((next) => { if (next) sfx("sign"); }); }}
          onPick={(playerId, slotId) => { const p = state.spin?.players.find((x) => x.id === playerId); void move("pick", { playerId, slotId }).then((next) => { if (next) sfx(p && state.variant !== "knowledge" && p.rating >= 85 ? "signStar" : "sign"); }); }}
          onRespin={(k) => { setRolling(true); void move("respin", { kind: k }).then((next) => { if (next && next.state.spin?.id !== state.spin?.id) { sfx("respin"); setTimeout(() => setRolling(false), ROLL_MS); } else setRolling(false); }); }} onExit={exit} />
      ) : screen === "season" && season && state?.result ? (
        <SeasonTicker locale={locale} seed={state.result.goalSeed} season={season} slots={slots} picks={myPicks} variant={state.variant} upTo={upTo} matchTime={matchMs(season, upTo)} holding={holding} onGoal={(mine) => sfx(mine ? "goal" : "conceded")} onSkip={() => setScreen("result")} />
      ) : screen === "versus" && tie && state ? (
        <MatchDayView key={tie.id} locale={locale} match={tie.result as MatchDay} me={ME(myPicks, c.you)} rival={{ name: tie.rivalName, avatar: null, picks: tie.opponentPicks, me: false, active: false }} slots={slots} seed={tie.seed} reveal={!seenTies.includes(tie.id)}
          onFinish={(won) => { if (!seenTies.includes(tie.id)) { sfx(won ? "matchWin" : "defeat"); setSeenTies((x) => [...x, tie.id]); } }} onGoal={(mine) => sfx(mine ? "goal" : "conceded")} onBack={() => setScreen("result")} onExit={exit} />
      ) : season && state?.result && league ? (
        <>
          <SeasonResultView locale={locale} number={state.number ?? today?.number ?? 0} seed={state.result.goalSeed} prediction={state.prediction} budget={state.budget ?? undefined} season={season} slots={slots} picks={myPicks} league={league} variant={state.variant} coinsEarned={state.result.coinsEarned} ranked={!!state.ranked}
            shareLink={typeof window === "undefined" ? "" : `${window.location.origin}/football-draft`} challenge={challengeCode && target ? target : null} nextDaily={boardDay ? nextDaily : null} onChallenge={() => void challengeFriend()} onPlayTarget={challengeCode ? () => void playChallengeTie() : undefined}
            leaderboard={boardDay ? <DraftLeaderboard locale={locale} rows={board} variant={boardVariant} onVariant={(v) => { setVariant(v); setScreen("intro"); }} onOpen={(row) => void openTeam(row)} /> : undefined}
            onShare={() => undefined} onAgain={() => { setSetup((x) => ({ ...x, variant: state.variant })); setScreen("setup"); }} onFriends={() => router.push("/friend/room/new?room=draft")} onExit={exit} />
          {shownLink && (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-surface-card p-2">
              <input readOnly value={shownLink} aria-label={c.challengeFriend} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 bg-transparent px-1 text-xs text-white/90 outline-none" />
              <button type="button" onClick={() => void copyChallengeLink()} className="shrink-0 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-black uppercase text-white">{copiedUrl === shownLink ? c.shareCopied : c.shareCopy}</button>
            </div>
          )}
          <p role="status" aria-live="polite" className="sr-only">{shownLink && copiedUrl === shownLink ? c.shareCopied : ""}</p>
          {openRival && <TeamSheet c={c} name={openRival.name} slots={slots} picks={openRival.picks} onPlay={() => void playRival()} onClose={() => setOpenRival(null)} />}
        </>
      ) : null}
      {problem && screen !== "draft" && <p role="alert" className="mt-3 rounded-xl bg-brand-red-soft/20 px-3 py-2 text-center text-xs font-semibold text-white">{problem}</p>}
      {problem && screen === "draft" && state?.phase === "ready" && <p role="alert" className="mt-3 rounded-xl bg-brand-red-soft/20 px-3 py-2 text-center text-xs font-semibold text-white">{problem}</p>}
    </Frame>
  );
}
