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
import { DRAFT_SOUNDS, type DraftSoundMoment } from "./draft.sounds";
import { ChallengeIntro, DraftBoard, DraftIntro, DraftLeaderboard, DraftSetup, MatchDayView, SeasonResultView, SeasonTicker, TeamSheet, XiReady, type BoardRow, type BoardSeat, type DraftSetupValues } from "./DraftViews";
import { boardRowsOf } from "./DraftBoardPage";
import { draftApi, reasonOf, withRetry, type ChallengeView, type DraftToday, type RunEnvelope, type RunKind, type TieResponse } from "./draft.api";
import { FORMATIONS, SEASON_PACE, matchMs, type ClubSeason, type League, type MatchDay, type Pick, type Variant } from "./draft.rules";
import type { ChallengeTarget } from "./draft.engine";

const ROLL_MS = 1000;
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
  const sfx = useCallback((m: DraftSoundMoment) => { const name = DRAFT_SOUNDS[m]; if (name) playSfx(name); }, [playSfx]);
  const exit = useCallback(() => (onExit ? onExit() : router.push("/play")), [onExit, router]);

  const [variant, setVariant] = useState<Variant>("budget");
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
  const [linkNote, setLinkNote] = useState<string | null>(null);
  const started = useRef(false);

  const state = env?.state ?? null;
  const league: League | null = state?.league ?? today?.league ?? null;
  const slots = state ? FORMATIONS[state.formation] : FORMATIONS["4-3-3"];
  const myPicks = useMemo(() => state?.picks ?? Array(11).fill(null), [state?.picks]);
  const nextDaily = useNextDaily(screen === "intro" || screen === "result");

  // What the first screen says about today, for the version chosen.
  useEffect(() => {
    let live = true;
    void withRetry(() => draftApi.today(variant, locale, initialDay)).then((t) => { if (live) setToday(t); }).catch(() => { if (live) setProblem(c.loadFailed); });
    return () => { live = false; };
  }, [variant, locale, initialDay, authStatus, c.loadFailed]);

  useEffect(() => {
    if (!initialChallenge) return;
    let live = true;
    void withRetry(() => draftApi.challengeRead(initialChallenge, locale)).then((v) => { if (live) setChallenge(v); }).catch(() => { if (live) setScreen("gone"); });
    return () => { live = false; };
  }, [initialChallenge, locale]);

  const adopt = useCallback((next: RunEnvelope, k: RunKind) => {
    setEnv(next); setKind(k); setProblem(null);
    if (next.state.phase === "result") { setScreen("result"); return; }
    setScreen("draft");
  }, []);

  /** One move on the run. Moves are never resent: a lost or stale one re-reads the run and the player goes on from what the server holds. */
  const move = useCallback(async (path: Parameters<typeof draftApi.move>[1], body: Record<string, unknown> = {}): Promise<RunEnvelope | null> => {
    if (!env || pending) return null;
    setPending(true);
    try {
      const next = await draftApi.move(kind, path, env.run, body, locale);
      setEnv(next); setProblem(null);
      return next;
    } catch (error) {
      const reason = reasonOf(error);
      if (reason !== "invalid_pick" && reason !== "no_respins") {
        const fresh = "daily" in kind && env.state.day ? await draftApi.startDaily(kind.daily, env.state.day, locale).catch(() => null) : "free" in kind ? await draftApi.currentFree(env.run.id, locale).catch(() => null) : null;
        if (fresh) setEnv(fresh);
      }
      setProblem(reason === "day_over" ? c.dayOver : reason === "no_coins" ? c.noCoins : c.moveFailed);
      return null;
    } finally {
      setPending(false);
    }
  }, [env, pending, kind, locale, c]);

  const signedInPrompt = useCallback(() => { rememberPostAuthRedirect(initialChallenge ? `/football-draft?challenge=${initialChallenge}` : "/football-draft"); openAuthPrompt(); }, [initialChallenge, openAuthPrompt]);

  const beginTracked = useCallback(() => {
    if (started.current) onEvent?.("replay");
    started.current = true;
    onEvent?.("start");
  }, [onEvent]);

  const playDaily = useCallback(async () => {
    if (!today) return;
    setPending(true);
    try {
      const day = today.guest ? today.practiceDay : today.day;
      if (!day) { signedInPrompt(); return; }
      const next = await withRetry(() => draftApi.startDaily(variant, day, locale));
      if (next.state.phase !== "result") beginTracked();
      adopt(next, { daily: variant });
      onDay?.(day, day === today.day);
    } catch (error) {
      if (reasonOf(error) === "sign_in_for_today") signedInPrompt(); else setProblem(c.loadFailed);
    } finally { setPending(false); }
  }, [today, variant, locale, adopt, beginTracked, signedInPrompt, onDay, c.loadFailed]);

  const startSetup = useCallback(async () => {
    setPending(true);
    try {
      const next = await draftApi.startFree({ leagueId: setup.leagueId, era: setup.era, formation: setup.formation, variant: setup.variant }, locale);
      beginTracked();
      adopt(next, { free: true });
    } catch { setProblem(c.loadFailed); } finally { setPending(false); }
  }, [setup, locale, adopt, beginTracked, c.loadFailed]);

  const acceptChallenge = useCallback(async () => {
    if (!challengeCode) return;
    setPending(true);
    try {
      const out = await draftApi.challengeAccept(challengeCode, locale);
      beginTracked();
      if (out.daily && out.variant) { setVariant(out.variant); adopt(out.daily, { daily: out.variant }); }
      else if (out.free) adopt(out.free, { free: true });
    } catch (error) {
      const reason = reasonOf(error);
      if (reason === "sign_in_for_today") signedInPrompt(); else setProblem(reason === "own_challenge" ? c.ownChallenge : c.loadFailed);
    } finally { setPending(false); }
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
      if (!seenTies.includes(t.id)) sfx("kickoff");
      setScreen("versus");
    } catch { setProblem(c.loadFailed); } finally { setPending(false); }
  }, [openRival, boardDay, boardVariant, locale, seenTies, sfx, c.loadFailed]);

  const playChallengeTie = useCallback(async () => {
    if (!challengeCode || !challenge) return;
    setPending(true);
    try {
      const t = await draftApi.challengeTie(challengeCode, locale);
      setTie({ ...t, rivalName: challenge.from });
      sfx("kickoff");
      setScreen("versus");
    } catch { setProblem(c.loadFailed); } finally { setPending(false); }
  }, [challengeCode, challenge, locale, sfx, c.loadFailed]);

  /** A link a friend opens on the same draw. */
  const challengeFriend = useCallback(async () => {
    if (!env) return;
    try {
      const body = "daily" in kind && state?.day ? { variant: kind.daily, day: state.day } : { runId: env.run.id };
      const { code } = await draftApi.challengeCreate(body, locale);
      const url = `${window.location.origin}/football-draft?challenge=${code}`;
      if (navigator.share) await navigator.share({ url, text: c.challengeShare });
      else { await navigator.clipboard.writeText(url); setLinkNote(c.shareCopied); }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setProblem(c.loadFailed);
    }
  }, [env, kind, state?.day, locale, c]);

  const notice = (state?.notice === "no_fit" ? c.noFit : state?.notice === "academy" ? c.academyNotice : state?.notice === "no_money" ? c.noMoney : state?.notice === "no_other_season" ? c.noOtherSeason : state?.notice === "no_coins" ? c.noCoins : null) ?? problem;
  const target: ChallengeTarget | null = challenge ? { from: challenge.from, seed: "", leagueId: "", era: challenge.era, formation: challenge.formation, variant: challenge.variant, respins: 2, ...challenge.record, picks: challenge.picks ?? Array(11).fill(null) } : null;

  if (screen === "gone") return <Frame lang={locale}><div className="m-auto text-center"><p className="text-white/80">{c.challengeGone}</p><GreenButton className="mt-4" onClick={() => setScreen("intro")}>{c.playDaily}</GreenButton></div></Frame>;
  if (screen === "intro" && !today) return <Frame lang={locale}><div className="m-auto text-center">{problem ? <><p role="alert" className="text-white/80">{problem}</p><QuietButton className="mt-4" onClick={exit}>{c.exit}</QuietButton></> : <p className="text-sm text-white/60">{c.loading}</p>}</div></Frame>;

  return (
    <Frame lang={locale} wide>
      {screen === "intro" && today ? (
        <DraftIntro locale={locale} number={today.number} league={today.league as League} best={today.best?.rec ?? null} nextDaily={nextDaily} variant={variant} onVariant={setVariant} onExit={exit}
          dailyLabel={today.guest ? c.guestPractice : today.played ? c.dailySeen : undefined} guestNote={today.guest ? c.guestSignIn : null} onSignIn={signedInPrompt}
          onDaily={() => void playDaily()} onFree={() => { setSetup((x) => ({ ...x, variant })); setScreen("setup"); }} onFriends={() => router.push("/friend/room/new?room=draft")} />
      ) : screen === "setup" && today ? (
        <DraftSetup locale={locale} leagues={today.leagues as League[]} values={setup} friends={false} onChange={setSetup} onStart={() => void startSetup()} onExit={() => setScreen("intro")} />
      ) : screen === "challenge" ? (
        target ? <ChallengeIntro locale={locale} target={target} league={{ id: "", name: challenge!.league, short: "", teams: 0, games: 0 }} onStart={() => void acceptChallenge()} onExit={() => { setChallengeCode(null); setScreen("intro"); }} /> : <p className="m-auto text-sm text-white/60">{c.loading}</p>
      ) : screen === "draft" && state?.phase === "ready" ? (
        <XiReady locale={locale} slots={slots} picks={myPicks} variant={state.variant} budget={state.budget ?? undefined} prediction={state.prediction} undoName={state.canUndo ? state.undoName || c.academyKid : null} onUndo={() => void move("undo")} onPlay={() => void finishDraft()} onExit={exit} />
      ) : screen === "draft" && state && league ? (
        <DraftBoard locale={locale} slots={slots} spin={(state.spin ? { ...state.spin, clubId: state.spin.id, leagueId: league.id } : { id: "", clubId: "", club: "", season: "", leagueId: league.id, legend: false, finish: 0, players: [] }) as ClubSeason} league={league} variant={state.variant} round={state.round}
          seats={[ME(myPicks, c.you)]} myPicks={myPicks} taken={[]} respins={state.respins} respinCost={state.respinCost} coins={null} mode={"daily" in kind ? "daily" : "free"} notice={notice} spinning={rolling} armed={state.armed && !rolling} onSpin={() => void spinNow()} pool={state.pool}
          budget={state.budget ?? undefined} undoName={state.canUndo ? state.undoName || c.academyKid : null} onUndo={() => void move("undo")} onAcademy={(slotId) => { sfx("sign"); void move("academy", { slotId }); }}
          onPick={(playerId, slotId) => { const p = state.spin?.players.find((x) => x.id === playerId); sfx(p && p.rating >= 85 ? "signStar" : "sign"); void move("pick", { playerId, slotId }); }}
          onRespin={(k) => { sfx("respin"); setRolling(true); void move("respin", { kind: k }).then(() => setTimeout(() => setRolling(false), ROLL_MS)); }} onExit={exit} />
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
          {linkNote && <p role="status" className="mt-2 text-center text-xs font-semibold text-brand-green-light">{linkNote}</p>}
          {problem && <p role="alert" className="mt-2 text-center text-xs font-semibold text-brand-red-light">{problem}</p>}
          {openRival && <TeamSheet c={c} name={openRival.name} slots={slots} picks={openRival.picks} onPlay={() => void playRival()} onClose={() => setOpenRival(null)} />}
        </>
      ) : null}
    </Frame>
  );
}
