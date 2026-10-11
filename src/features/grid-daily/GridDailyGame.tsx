"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import {
  FOOTBALL_GRID_COPY,
  FootballGridTurnPanel,
  GRID_BACKGROUND_STYLE,
  GridRulesPanel,
  MatchBoard,
} from "@/features/football-grid/FootballGridFlowScreen";
import { rememberPostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { DailyGameApiError } from "@/lib/repositories/dailyGameApi";
import type { Locale } from "@/lib/i18n/messages";
import type { FootballGridCommandResultPayload, FootballGridState } from "@/lib/realtime/socket.types";
import { useAuthStore } from "@/stores/auth.store";
import { useAuthPromptStore } from "@/stores/authPrompt.store";
import { cn } from "@/lib/utils";
import { gridDailyApi, type GridDailyBoard, type GridDailyRun } from "./gridDaily.api";
import { fillDaily, GRID_DAILY_COPY } from "./gridDaily.copy";
import { candidateDays, elapsedFromSpeed, formatClock, puzzleNumber, releaseDay, shareGrid, TOTAL_CELLS } from "./gridDaily.logic";

const SELF = "daily-me";
/** A run past the hour has no exact time on the board. */
const rowTime = (speed: number): string => { const seconds = elapsedFromSpeed(speed); return seconds === null ? "60:00+" : formatClock(seconds * 1_000); };
type Feedback = FootballGridCommandResultPayload["outcome"] | undefined;
type Load = { kind: "loading" } | { kind: "unavailable" } | { kind: "signin" } | { kind: "ready"; day: string; run: GridDailyRun };

function boardState(run: GridDailyRun, locale: Locale): FootballGridState | null {
  if (!run.board) return null;
  return {
    matchId: `daily:${run.state.day}`,
    status: run.state.done ? "completed" : "active",
    phase: run.state.done ? "terminal" : "turn",
    board: run.board,
    players: [
      { userId: SELF, seat: 1, isBot: false, handoffAcknowledged: true, ready: true, noActionTimeouts: 0, pauseBudgetRemainingMs: 0 },
      { userId: "daily-none", seat: 2, isBot: false, handoffAcknowledged: true, ready: true, noActionTimeouts: 0, pauseBudgetRemainingMs: 0 },
    ],
    openerUserId: SELF,
    currentPlayerUserId: run.state.done ? null : SELF,
    winnerUserId: null,
    turnNumber: run.run.version,
    stateVersion: run.run.version,
    claims: run.state.cells.flatMap((cell, cellIndex) => (cell ? [{
      cellIndex,
      footballPlayerId: cell.playerId,
      displayName: locale === "ka" && cell.nameKa ? cell.nameKa : cell.name,
      imageUrl: cell.imageUrl,
      claimantUserId: SELF,
      turnNumber: 0,
    }] : [])),
    phaseDeadlineAt: null,
    turnDeadlineAt: null,
    turnRemainingMs: null,
    pausedAt: null,
    reconnectDeadlineAt: null,
    completionReason: null,
  };
}

/** Time since the kick-off; frozen at the finish. Zero until the kick-off. */
function useElapsed(startedAt: number | null, finishedAt: number | null, clockOffsetMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null || finishedAt !== null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(interval);
  }, [finishedAt, startedAt]);
  if (startedAt === null) return 0;
  return Math.max(0, (finishedAt ?? now + clockOffsetMs) - startedAt);
}

export function GridDailyGame({ locale, initialDay, onExit }: { locale: Locale; initialDay?: string | null; onExit: () => void }) {
  const copy = GRID_DAILY_COPY[locale];
  const gridCopy = FOOTBALL_GRID_COPY[locale];
  const authStatus = useAuthStore((state) => state.status);
  const myId = useAuthStore((state) => state.user?.id);
  const openAuthPrompt = useAuthPromptStore((state) => state.open);
  const member = authStatus === "authenticated";
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(undefined);
  const [pending, setPending] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  /** data: null = the rankings could not be fetched (the player can ask again). */
  const [loadedBoard, setBoard] = useState<{ day: string; data: GridDailyBoard | null } | null>(null);
  const [boardAttempt, setBoardAttempt] = useState(0);
  const finishButton = useRef<HTMLButtonElement | null>(null);
  const [copied, setCopied] = useState(false);
  // The server stamps the first guess with its own clock; the timer follows that clock, not this device's.
  const clockOffset = useRef(0);
  const pendingRef = useRef(false);
  /** Changes with every (re)load: an answer to an earlier load, or for another day, is dropped. */
  const generation = useRef(0);

  const open = useCallback(async () => {
    const mine = ++generation.current;
    setLoad({ kind: "loading" });
    setSelectedCell(null);
    setAnswer("");
    setFeedback(undefined);
    try {
      const { days } = await gridDailyApi.boards(locale);
      const candidates = candidateDays(days, member);
      const wanted = initialDay && days[initialDay] ? [initialDay, ...candidates.filter((day) => day !== initialDay)] : candidates;
      let refused = false;
      for (const day of wanted) {
        try {
          const run = await gridDailyApi.start(day, locale);
          if (mine !== generation.current) return;
          clockOffset.current = run.serverNow - Date.now();
          setLoad({ kind: "ready", day, run });
          return;
        } catch (error) {
          // A guest is refused the day still open on the server's clock: the next candidate is an older day.
          if (!(error instanceof DailyGameApiError && error.message === "sign_in_for_today")) throw error;
          refused = true;
        }
      }
      // Every listed day is still open and this visitor is a guest: what they need is an account, not a retry.
      if (mine === generation.current) setLoad({ kind: refused ? "signin" : "unavailable" });
    } catch {
      if (mine === generation.current) setLoad({ kind: "unavailable" });
    }
  }, [initialDay, locale, member]);

  useEffect(() => {
    if (authStatus === "loading") return;
    void open();
  }, [authStatus, open]);

  const run = load.kind === "ready" ? load.run : null;
  const day = load.kind === "ready" ? load.day : null;
  const done = run?.state.done ?? false;

  useEffect(() => {
    if (!day || !done) return;
    let cancelled = false;
    gridDailyApi.leaderboard(day, locale).then((data) => { if (!cancelled) setBoard({ day, data }); }, () => { if (!cancelled) setBoard({ day, data: null }); });
    return () => { cancelled = true; };
  }, [boardAttempt, day, done, locale, myId]);

  // A finished grid left open overnight: when the player comes back to the tab on a new day, that day's grid loads.
  useEffect(() => {
    if (!day || !done || !member || initialDay) return;
    const onVisible = () => { if (document.visibilityState === "visible" && releaseDay() > day) void open(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [day, done, initialDay, member, open]);

  // Rankings fetched for another day are never shown under this one.
  const boardEntry = loadedBoard && loadedBoard.day === day ? loadedBoard : null;
  const board = boardEntry?.data ?? null;
  const boardFailed = boardEntry !== null && boardEntry.data === null;
  const elapsed = useElapsed(run?.state.startedAt ?? null, run?.state.finishedAt ?? null, clockOffset.current);
  const state = useMemo(() => (run ? boardState(run, locale) : null), [locale, run]);

  /** Shows a run the server returned for this load of this day; anything else arrived too late to matter. */
  const apply = (next: GridDailyRun, mine: number): boolean => {
    if (mine !== generation.current || load.kind !== "ready" || next.state.day !== load.day) return false;
    clockOffset.current = next.serverNow - Date.now();
    setLoad({ kind: "ready", day: load.day, run: next });
    return true;
  };

  /**
   * The server's copy of the run wins: after a refused move, or one whose answer never arrived, the screen shows
   * what the server holds and the sheet closes (the cell may have been filled from another tab).
   */
  const resync = async (mine: number) => {
    if (load.kind !== "ready" || mine !== generation.current) return;
    setSelectedCell(null);
    setAnswer("");
    setFeedback(undefined);
    try { apply(await gridDailyApi.start(load.day, locale), mine); } catch { if (mine === generation.current) setLoad({ kind: "unavailable" }); }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!run || !day || selectedCell === null || pendingRef.current || !answer.trim()) return;
    const mine = generation.current;
    pendingRef.current = true;
    setPending(true);
    try {
      const result = await gridDailyApi.guess({ day, runId: run.run.id, version: run.run.version, cellIndex: selectedCell, text: answer.trim() }, locale);
      if (!apply(result, mine)) return;
      setFeedback(result.outcome);
      if (result.outcome !== "ambiguous") { setSelectedCell(null); setAnswer(""); }
    } catch {
      // Refused, or no answer at all (the guess may have landed): either way the server's run is the truth.
      await resync(mine);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const kickOff = async () => {
    if (!run || pendingRef.current) return;
    const mine = generation.current;
    pendingRef.current = true;
    setPending(true);
    try {
      apply(await gridDailyApi.kickOff({ runId: run.run.id, version: run.run.version }, locale), mine);
    } catch {
      await resync(mine);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const finish = async () => {
    if (!run || pendingRef.current) return;
    const mine = generation.current;
    pendingRef.current = true;
    setPending(true);
    setConfirmFinish(false);
    try {
      if (apply(await gridDailyApi.finish({ runId: run.run.id, version: run.run.version }, locale), mine)) setSelectedCell(null);
    } catch {
      await resync(mine);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const share = async () => {
    if (!run || !day) return;
    const text = fillDaily(copy.shareText, {
      n: puzzleNumber(day),
      score: run.state.score,
      time: formatClock(elapsed),
      grid: shareGrid(run.state.cells),
      url: `${window.location.origin}/daily-grid`,
    });
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 2_000); }
    } catch { /* the share sheet was dismissed */ }
  };

  // Before the kick-off the squares are not on this device at all: the first look and the clock start together.
  if (load.kind === "ready" && run && day && !run.state.done && run.state.startedAt === null) {
    return (
      <main className="min-h-dvh bg-surface-page-alt bg-cover bg-center bg-no-repeat px-4 pb-16 pt-6 text-white" style={GRID_BACKGROUND_STYLE} data-daily-grid="intro">
        <div className="mx-auto flex w-full max-w-[26rem] flex-col font-poppins sm:max-w-[28rem]">
          <header className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">{gridCopy.title}</p>
            <h1 className="mt-1 text-3xl font-black uppercase leading-tight">{copy.title} <span className="text-white/45">#{puzzleNumber(day)}</span></h1>
            <p className="mx-auto mt-1.5 max-w-xs text-sm text-white/60">{copy.subtitle}</p>
          </header>
          {!member && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-blue px-4 py-3">
              <p className="min-w-0 flex-1 text-sm font-semibold text-white/90">{copy.guestNote}</p>
              <button type="button" onClick={() => { rememberPostAuthRedirect("/daily-grid"); openAuthPrompt(); }} className="h-10 shrink-0 rounded-xl bg-brand-yellow px-4 text-xs font-black uppercase text-black">{copy.signIn}</button>
            </div>
          )}
          <div aria-hidden="true" className="mx-auto mt-6 grid w-full max-w-[17rem] grid-cols-3 gap-2">
            {Array.from({ length: TOTAL_CELLS }, (_, index) => (
              <span key={index} className="grid aspect-square place-items-center rounded-[18px] border-2 border-white/10 bg-white/[0.03] text-2xl font-black text-white/20">?</span>
            ))}
          </div>
          <p className="mx-auto mt-5 max-w-xs text-center text-sm font-semibold text-white/70">{copy.kickOffNote}</p>
          <button type="button" disabled={pending} onClick={() => void kickOff()} data-daily-action="kickoff"
            className="mt-4 h-14 w-full rounded-2xl bg-brand-green text-base font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green-deep disabled:opacity-50">
            {copy.kickOff}
          </button>
          <button type="button" onClick={onExit} className="mt-5 text-center text-sm font-bold text-white/55 underline underline-offset-4">{copy.back}</button>
        </div>
      </main>
    );
  }

  if (load.kind !== "ready" || !run || !state || !day) {
    return (
      <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-6 text-center font-poppins text-white">
        {load.kind === "loading" || authStatus === "loading" ? (
          <>
            <LoaderCircle className="size-8 animate-spin text-brand-yellow" aria-hidden="true" />
            <p className="text-sm font-bold uppercase tracking-wide text-white/70">{copy.loading}</p>
          </>
        ) : load.kind === "signin" ? (
          <>
            <p className="max-w-xs text-sm font-semibold text-white/75">{copy.signInToday}</p>
            <button type="button" onClick={() => { rememberPostAuthRedirect("/daily-grid"); openAuthPrompt(); }} className="h-12 rounded-2xl bg-brand-yellow px-8 text-sm font-black uppercase text-black">{copy.signIn}</button>
            <button type="button" onClick={onExit} className="text-sm font-bold text-white/60 underline underline-offset-4">{copy.back}</button>
          </>
        ) : (
          <>
            <p className="max-w-xs text-sm font-semibold text-white/75">{copy.unavailable}</p>
            <button type="button" onClick={() => void open()} className="h-12 rounded-2xl bg-brand-green px-8 text-sm font-black uppercase text-white">{copy.retry}</button>
            <button type="button" onClick={onExit} className="text-sm font-bold text-white/60 underline underline-offset-4">{copy.back}</button>
          </>
        )}
      </main>
    );
  }

  const feedbackLine = feedback === "correct" ? copy.correct : feedback === "wrong" ? copy.wrong
    : feedback === "ambiguous" ? copy.ambiguous : feedback === "already_used" ? copy.alreadyUsed : null;
  return (
    <main className="min-h-dvh bg-surface-page-alt bg-cover bg-center bg-no-repeat px-4 pb-16 pt-6 text-white" style={GRID_BACKGROUND_STYLE} data-daily-grid={done ? "done" : "play"}>
      <div className="mx-auto flex w-full max-w-[26rem] flex-col font-poppins sm:max-w-[28rem]">
        <header className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">{gridCopy.title}</p>
          <h1 className="mt-1 text-3xl font-black uppercase leading-tight">{copy.title} <span className="text-white/45">#{puzzleNumber(day)}</span></h1>
          {!done && <p className="mx-auto mt-1.5 max-w-xs text-sm text-white/60">{copy.subtitle}</p>}
        </header>
        {!member && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-blue px-4 py-3">
            <p className="min-w-0 flex-1 text-sm font-semibold text-white/90">{copy.guestNote}</p>
            <button type="button" onClick={() => { rememberPostAuthRedirect("/daily-grid"); openAuthPrompt(); }} className="h-10 shrink-0 rounded-xl bg-brand-yellow px-4 text-xs font-black uppercase text-black">{copy.signIn}</button>
          </div>
        )}
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            { label: copy.guesses, value: `${run.state.guessesLeft}`, key: "guesses" },
            { label: copy.filled, value: `${run.state.score}/${TOTAL_CELLS}`, key: "score" },
            { label: copy.time, value: formatClock(elapsed), key: "time" },
          ].map((stat) => (
            <div key={stat.key} className="rounded-xl bg-surface-card/80 px-2 py-2" data-daily-stat={stat.key}>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-white/50">{stat.label}</dt>
              <dd className="text-xl font-black tabular-nums text-brand-yellow">{stat.value}</dd>
            </div>
          ))}
        </dl>

        {done && (
          <section className="mt-4 rounded-2xl border border-white/10 bg-surface-card/80 p-4 text-center" data-daily-result>
            <h2 className={cn("text-3xl font-black uppercase", run.state.score === TOTAL_CELLS ? "text-brand-green" : "text-brand-yellow")}>
              {run.state.score === TOTAL_CELLS ? copy.resultPerfect : fillDaily(copy.resultTitle, { score: run.state.score })}
            </h2>
            <p className="mt-1 text-sm font-semibold text-white/65">{fillDaily(copy.resultTime, { time: formatClock(elapsed) })}</p>
            <p className="mt-2 text-xs font-bold text-white/55">
              {run.state.ranked && run.state.rank ? fillDaily(copy.rank, { rank: run.state.rank }) : run.state.ranked ? "" : copy.practice}
            </p>
            <button type="button" onClick={() => void share()} data-daily-action="share"
              className="mt-3 h-12 w-full rounded-2xl bg-brand-green text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green-deep">
              {copied ? copy.copied : copy.share}
            </button>
            <p className="mt-2 text-xs text-white/45">{copy.comeBack}</p>
          </section>
        )}

        <div className="mt-4">
          <MatchBoard state={state} selfUserId={SELF} locale={locale} selectedCell={selectedCell}
            onSelect={(cell) => { if (!pending) { setSelectedCell(cell); setAnswer(""); setFeedback(undefined); } }} />
        </div>

        {!done && (
          <>
            <p role="status" data-daily-feedback={feedback ?? ""} className={cn("mt-3 min-h-5 text-center text-xs font-bold",
              feedback === "correct" ? "text-brand-green-light" : feedback === "ambiguous" ? "text-brand-yellow" : feedback ? "text-brand-red-soft" : "text-white/55")}>
              {feedbackLine ?? copy.tapCell}
            </p>
            <FootballGridTurnPanel
              state={state}
              locale={locale}
              isMyTurn
              selectedCell={selectedCell}
              answer={answer}
              onAnswerChange={setAnswer}
              onSubmit={(event) => { void submit(event); }}
              onCancel={() => { setSelectedCell(null); setAnswer(""); }}
              pending={pending}
              sheetNotice={feedback === "ambiguous" ? copy.ambiguous : null}
            />
            {confirmFinish ? (
              <div role="dialog" aria-label={fillDaily(copy.finishConfirm, { n: run.state.guessesLeft })} className="mt-3 rounded-2xl border-2 border-brand-orange bg-brand-orange/10 p-3 text-center">
                <p className="text-sm font-black uppercase tracking-wide text-brand-orange">{fillDaily(copy.finishConfirm, { n: run.state.guessesLeft })}</p>
                <div className="mt-2.5 flex gap-2">
                  <button type="button" data-daily-action="finish-yes" onClick={() => void finish()} className="h-10 flex-1 rounded-xl bg-brand-green text-xs font-black uppercase text-white">{copy.yes}</button>
                  <button type="button" autoFocus onClick={() => { setConfirmFinish(false); window.requestAnimationFrame(() => finishButton.current?.focus()); }}
                    className="h-10 flex-1 rounded-xl border-2 border-white/15 text-xs font-black uppercase text-white/80">{copy.no}</button>
                </div>
              </div>
            ) : (
              <button ref={finishButton} type="button" disabled={pending} onClick={() => setConfirmFinish(true)} data-daily-action="finish"
                className="mt-3 h-10 w-full rounded-xl border-2 border-white/15 text-xs font-black uppercase tracking-wide text-white/70 transition-colors hover:bg-white/5 disabled:opacity-40">
                {copy.finish}
              </button>
            )}
          </>
        )}

        {done && (
          <section className="mt-6" aria-label={copy.leaderboard} data-daily-leaderboard>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-black uppercase">{copy.leaderboard}</h2>
              {board && board.players > 0 && <span className="text-xs text-white/60">{fillDaily(copy.players, { n: board.players })}</span>}
            </div>
            {boardFailed ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/5 px-4 py-6 text-center">
                <p className="text-sm text-white/75">{copy.leaderboardFailed}</p>
                <button type="button" onClick={() => { setBoard(null); setBoardAttempt((current) => current + 1); }} data-daily-action="leaderboard-retry"
                  className="h-10 rounded-xl border-2 border-white/15 px-5 text-xs font-black uppercase tracking-wide text-white/80">{copy.retry}</button>
              </div>
            ) : !board ? (
              <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
            ) : board.top.length === 0 ? (
              <p className="rounded-2xl bg-white/5 px-4 py-6 text-center text-sm text-white/75">{copy.empty}</p>
            ) : (
              <ol className="overflow-hidden rounded-2xl bg-surface-card/80">
                {[...board.top.slice(0, 10), ...(board.me && !board.top.slice(0, 10).some((row) => row.userId === board.me!.userId) ? [board.me] : [])].map((row) => (
                  <li key={row.userId} className={cn("flex items-center gap-3 border-b border-white/5 px-3 py-2 last:border-b-0", row.userId === myId && "bg-brand-blue/25")}>
                    <span className="w-6 text-center text-sm font-black tabular-nums text-white/60">{row.rank}</span>
                    <AvatarDisplay customization={row.avatarCustomization ?? { base: row.avatarUrl ?? undefined }} size="sm" shape="square" />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{row.username}</span>
                    <span className="text-sm font-black tabular-nums text-brand-yellow">{row.score}/{TOTAL_CELLS}</span>
                    <span className="w-14 text-right text-xs tabular-nums text-white/55">{rowTime(row.speed)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        <GridRulesPanel board={state.board} locale={locale} />
        <button type="button" onClick={onExit} className="mt-5 text-center text-sm font-bold text-white/55 underline underline-offset-4">{copy.back}</button>
      </div>
    </main>
  );
}
