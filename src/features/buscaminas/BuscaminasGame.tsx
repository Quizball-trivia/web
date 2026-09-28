"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowLeft, Bomb, Check, Copy, Flag, Share2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/config";
import { useAuthStore } from "@/stores/auth.store";
import { useUserPreferences } from "@/lib/preferences/userPreferences";
import { playSfx } from "@/lib/sounds/gameSounds";
import type { EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { findPublicGameByModeId, relatedPublishedGames } from "@/lib/seo/public-games";
import { PublicCardGrid } from "@/features/marketing/public/PublicCards";
import type { Locale } from "@/lib/i18n/locale";
import {
  MAX_SCORE, TARGETS_PER_ROUND, addDays, defaultDayFor, isLiveDay, playableDays, puzzleDayFor, puzzleNumber, releaseDay, resultGrid,
  type BuscaminasCard, type BuscaminasDay, type BuscaminasRound, type RoundResult,
} from "./buscaminas.logic";
import { clearRun, finishedScores, inProgressDays, loadRun, saveRun, streakFrom } from "./buscaminas.storage";
import { BuscaminasLeaderboard } from "./BuscaminasLeaderboard";
import { SignInLink } from "@/features/marketing/public/PublicLinks";
import { BuscaminasApiError, buscaminasApi, type BuscaminasRun, type BuscaminasRunState } from "@/lib/repositories/buscaminas.repo";
import { buscaminasCopy, promptFor } from "./buscaminas.copy";
import { encodeShare } from "./buscaminas.share";
import { trackActionError, trackArchiveOpen, trackLoadError, trackReport, trackRoundEnd, trackRunComplete, trackRunStart, trackShare } from "./buscaminas.analytics";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;
// Boards come from the backend, which serves a day only once it is playable (future boards stay private).
const boardsUrl = `${API_BASE_URL}/api/v1/buscaminas/boards`;
const dayUrl = (day: string) => `${boardsUrl}/${day}`;
type View = "intro" | "play" | "end" | "archive";

export function BuscaminasGame({ locale, onExit, onEvent, initialDay }: {
  locale: Locale;
  onExit?: () => void;
  onEvent?: (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => void;
  /** A past day from the archive link (?dia=); ignored when it isn't playable yet. */
  initialDay?: string | null;
}) {
  const c = buscaminasCopy(locale);
  const [today, setToday] = useState(() => releaseDay());
  const days = useMemo(() => playableDays(today), [today]);
  // An archive pick or a started board stays put; otherwise the screen follows today's puzzle across midnight.
  const [chosenDay, setChosenDay] = useState<string | null>(() => (initialDay && playableDays(releaseDay()).includes(initialDay) ? initialDay : null));
  const [lockedDay, setLockedDay] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const replayPendingRef = useRef(false);
  const currentDayRef = useRef<string | null>(null);
  const currentOwnerRef = useRef<string | null>(null);
  /** True while the player and board a request was made for are still the ones on screen. */
  const stillCurrent = (requestOwner: string, requestDay: string) => currentOwnerRef.current === requestOwner && currentDayRef.current === requestDay;
  const authStatus = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id);
  const owner = authStatus === "authenticated" && userId ? userId : "guest";
  const liveDay = puzzleDayFor(today);
  const day = chosenDay ?? lockedDay ?? defaultDayFor(today, owner !== "guest");
  const guestOnPastBoard = owner === "guest" && !isLiveDay(day, today) && isLiveDay(liveDay, today);
  const guestOnYesterday = guestOnPastBoard && day === addDays(liveDay, -1);
  // Guests can't open today's live board; they see it listed as needing an account instead.
  const openableDays = useMemo(() => (owner === "guest" && isLiveDay(liveDay, today) ? days.filter((d) => d !== liveDay) : days), [days, liveDay, owner, today]);
  const [versions, setVersions] = useState<Record<string, number> | undefined>(undefined);
  const authReady = authStatus !== "loading";
  const [attempt, setAttempt] = useState(0);
  const loadKey = `${day}#${attempt}#${owner}`;
  const [loaded, setLoaded] = useState<{ key: string; data: BuscaminasDay } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const content = loaded?.key === loadKey ? loaded.data : null;
  const loadFailed = failedKey === loadKey;
  const [run, setRun] = useState<BuscaminasRun | null>(null);
  const [view, setView] = useState<View>("intro");
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [boardRefresh, setBoardRefresh] = useState(0);
  const contentVersion = content?.contentVersion ?? 1;
  const state = run?.state ?? null;
  useEffect(() => { currentDayRef.current = day; }, [day]);
  // Signing in or out mid-visit is a new player: drop in-flight results and start a fresh funnel session.
  useEffect(() => {
    if (currentOwnerRef.current !== null && currentOwnerRef.current !== owner) {
      startedRef.current = false;
      replayPendingRef.current = false;
    }
    currentOwnerRef.current = owner;
  }, [owner]);
  // Leaving the game invalidates any start still in flight (no run or funnel event after exit).
  useEffect(() => () => { currentDayRef.current = null; }, []);

  useEffect(() => {
    const check = () => setToday(releaseDay());
    const timer = window.setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", check); window.removeEventListener("focus", check); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(boardsUrl, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { days?: Record<string, number> } | null) => { if (data?.days) setVersions(data.days); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    // The saved run belongs to a guest or an account; wait until we know which.
    if (!authReady) return;
    const controller = new AbortController();
    // A retry after a content correction must not get the old board back from the HTTP cache.
    fetch(attempt > 0 ? `${dayUrl(day)}?r=${attempt}` : dayUrl(day), { signal: controller.signal, cache: attempt > 0 ? "no-store" : "default" })
      .then(async (res) => {
        if (!res.ok) throw Object.assign(new Error("load"), { status: res.status });
        const data = (await res.json()) as BuscaminasDay;
        const saved = loadRun(day, data.contentVersion ?? 1, owner);
        setLoaded({ key: loadKey, data });
        setRun(saved);
        setView(saved?.state.done ? "end" : "intro");
      })
      .catch((error: { name?: string; status?: number }) => {
        if (error?.name === "AbortError") return;
        setFailedKey(loadKey);
        trackLoadError({ puzzleId: day, status: error?.status ?? null });
      });
    return () => controller.abort();
  }, [attempt, authReady, day, loadKey, owner]);

  useEffect(() => {
    if (content && run) saveRun(day, contentVersion, run, owner);
  }, [content, contentVersion, day, owner, run]);

  const round = state && content ? content.rounds[state.round] ?? null : null;

  // Warm the next round's portraits while this one is played.
  useEffect(() => {
    const next = state ? content?.rounds[state.round + 1] : undefined;
    if (!next) return;
    const handle = window.setTimeout(() => next.cards.forEach((card) => { const img = new window.Image(); img.src = card.img; }), 600);
    return () => window.clearTimeout(handle);
  }, [content, state]);

  const { soundEnabled } = useUserPreferences();
  const cue = useCallback((name: "correctRanked" | "wrongAnswer") => { if (soundEnabled) playSfx(name); }, [soundEnabled]);

  const apply = (next: BuscaminasRun, r: BuscaminasRound | null) => {
    const settled = next.state.settled;
    if (settled && !state?.settled && r) {
      trackRoundEnd({ puzzleId: day, contentVersion, round: next.state.round + 1, difficulty: r.difficulty, outcome: settled.outcome, found: settled.found, points: settled.points });
      if (settled.outcome === "mine") cue("wrongAnswer");
      if (settled.outcome === "perfect") cue("correctRanked");
    }
    setRun(next);
    // Only a run that finishes on this screen counts as a completion (not reopening one that was already done).
    if (next.state.done && state && !state.done) {
      onEvent?.("complete", { score: next.state.score });
      trackRunComplete({ puzzleId: day, ranked: next.state.ranked, score: next.state.score, perfects: next.state.results.filter((x) => x.outcome === "perfect").length, mines: next.state.results.filter((x) => x.outcome === "mine").length, rank: next.state.rank ?? null });
      if (next.state.ranked) setBoardRefresh((n) => n + 1);
      setView("end");
    }
  };

  /** One server action at a time; a forked or outdated run is dropped and restarted from the server's copy. */
  const act = async (key: string, call: () => Promise<BuscaminasRun | null>, r: BuscaminasRound | null) => {
    if (pending) return;
    setPending(key);
    setNotice(null);
    const requestOwner = owner;
    const requestDay = day;
    try {
      const result = await call();
      // The player changed (sign-in/out) or left this board while the request was in flight.
      if (!stillCurrent(requestOwner, requestDay)) return;
      if (result) apply(result, r);
    } catch (error) {
      if (!stillCurrent(requestOwner, requestDay)) return;
      trackActionError({ puzzleId: day, action: key.length > 8 ? "tap" : key, status: error instanceof BuscaminasApiError ? error.status : null, code: error instanceof BuscaminasApiError ? error.message : null });
      const code = error instanceof BuscaminasApiError ? error.message : null;
      const status = error instanceof BuscaminasApiError ? error.status : null;
      const newer = code === "stale_state" && run ? loadRun(day, contentVersion, owner) : null;
      if (code === "day_over") {
        // Argentine midnight passed mid-run: that board is closed (its token is useless), move on to today's.
        clearRun(day, owner);
        setToday((t) => (t > day ? t : addDays(day, 1)));
        setLockedDay(null);
        setChosenDay(null);
        setRun(null);
        setView("intro");
        setNotice(c.dayOver);
      } else if (code === "sign_in_for_today") {
        clearRun(day, owner);
        setRun(null);
        setView("intro");
        setNotice(c.guestYesterday);
      } else if (status === 503) {
        setView(run ? view : "intro");
        setNotice(c.maintenance);
      } else if (code === "stale_state" && run && newer && newer.run.version > run.run.version) {
        // Another tab moved this run on: continue from its newer copy.
        setRun(newer);
        setView(newer.state.done ? "end" : "play");
      } else if (code === "stale_state" && run) {
        // Every run is a server row: re-sync from it.
        try {
          const current = await buscaminasApi.start(requestDay, contentVersion, locale);
          if (!stillCurrent(requestOwner, requestDay)) return;
          setRun(current);
          setView(current.state.done ? "end" : "play");
        } catch (resyncError) {
          if (!stillCurrent(requestOwner, requestDay)) return;
          setNotice(resyncError instanceof BuscaminasApiError && resyncError.status === 503 ? c.maintenance : c.actionError);
        }
      } else if (code === "too_many_runs") {
        setView("intro");
        setNotice(c.tooManyRuns);
      } else if (status === 409 || status === 401 || status === 403 || status === 404) {
        // 404: the run is gone (e.g. its guest session expired and was purged); retrying the same id never recovers.
        clearRun(day, owner);
        setRun(null);
        setView("intro");
        setNotice(status === 409 ? c.restarted : c.sessionChanged);
        // The server holds a newer version of this day: reload the board so cards and answers match again.
        if (code === "content_changed") setAttempt((n) => n + 1);
      } else {
        setNotice(c.actionError);
      }
    } finally {
      setPending(null);
    }
  };

  /** Funnel events fire once a board is really open (resumed locally or confirmed by the server). */
  const markStarted = () => {
    if (replayPendingRef.current) { replayPendingRef.current = false; onEvent?.("replay"); }
    if (!startedRef.current) { startedRef.current = true; onEvent?.("start"); }
  };
  const start = () => {
    const requestedDay = day;
    const requestOwner = owner;
    setLockedDay(requestedDay);
    if (run) {
      markStarted();
      trackRunStart({ puzzleId: requestedDay, contentVersion, ranked: run.state.ranked, resumed: true, round: run.state.round + 1 });
      setView(run.state.done ? "end" : "play");
      return;
    }
    void act("start", async () => {
      const fresh = await buscaminasApi.start(requestedDay, contentVersion, locale);
      // The player switched boards while this was in flight: never attach day A's run to day B.
      if (!stillCurrent(requestOwner, requestedDay)) return null;
      markStarted();
      trackRunStart({ puzzleId: requestedDay, contentVersion, ranked: fresh.state.ranked, resumed: fresh.state.round > 0 || fresh.state.results.length > 0, round: fresh.state.round + 1 });
      setView(fresh.state.done ? "end" : "play");
      return fresh;
    }, null);
  };
  const pick = (card: BuscaminasCard) => { if (run && round) void act(card.id, () => buscaminasApi.tap(run, card.id, locale), round); };
  const bank = () => { if (run && round) void act("bank", () => buscaminasApi.bank(run, locale), round); };
  const advance = () => {
    if (!run) return;
    void act("next", () => buscaminasApi.next(run, locale), null).then(() => scrollRef.current?.scrollTo({ top: 0 }));
  };
  const openDay = (target: string) => {
    trackArchiveOpen({ puzzleId: target, daysBack: days.indexOf(target) });
    // A finished day opens on its result: that is a look back, not a new session.
    if (target !== day && !(target in finishedScores([target], owner, versions))) {
      // Counted when this day's board is actually started, not on browsing.
      replayPendingRef.current = startedRef.current;
      startedRef.current = false;
    }
    setChosenDay(target);
    setLockedDay(null);
    setView(target === day && state?.done ? "end" : "intro");
  };

  return (
    <div ref={scrollRef} className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6 pt-3">
        {loadFailed ? (
          <Centered>
            <p className="text-center text-sm text-white/80">{c.loadError}</p>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-4 h-11 rounded-full bg-brand-yellow px-6 text-sm font-black uppercase text-black" style={poppins}>{c.retry}</button>
            {onExit && <ExitLink label={c.exit} onExit={onExit} />}
          </Centered>
        ) : !content ? (
          <Centered><p className="animate-pulse text-sm text-white/70">{c.loading}</p></Centered>
        ) : view === "archive" ? (
          <Archive locale={locale} days={openableDays} lockedLiveDay={openableDays.length !== days.length ? liveDay : null} versions={versions} today={today} current={day} currentState={state} onBack={() => setView(state?.done ? "end" : "intro")} onOpen={openDay} />
        ) : view === "end" && state ? (
          <EndScreen locale={locale} day={day} liveDay={isLiveDay(liveDay, today) ? liveDay : null} guestOnYesterday={guestOnYesterday} state={state} days={days} versions={versions} boardRefresh={boardRefresh} onArchive={() => setView("archive")} onExit={onExit} />
        ) : view === "intro" || !round || !state ? (
          <Intro locale={locale} number={puzzleNumber(day)} state={state} busy={pending === "start"} notice={notice} guestOnPastBoard={guestOnPastBoard} guestOnYesterday={guestOnYesterday} onStart={start} onArchive={() => setView("archive")} onExit={onExit} />
        ) : (
          <Board locale={locale} content={content} round={round} state={state} pending={pending} notice={notice} onPick={pick} onBank={bank} onNext={advance} onExit={onExit} />
        )}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col items-center justify-center">{children}</div>;
}

function ExitLink({ label, onExit }: { label: string; onExit: () => void }) {
  return <button type="button" onClick={onExit} className="mt-4 text-sm font-bold text-white/60 underline-offset-4 hover:text-white hover:underline">{label}</button>;
}

function Brand({ locale, className }: { locale: Locale; className?: string }) {
  const c = buscaminasCopy(locale);
  return (
    <p className={cn("font-black uppercase tracking-tight", className)} style={poppins}>
      {c.brandA} <span className="text-brand-yellow">{c.brandB}</span>
    </p>
  );
}

function Intro({ locale, number, state, busy, notice, guestOnPastBoard, guestOnYesterday, onStart, onArchive, onExit }: { locale: Locale; number: number; state: BuscaminasRunState | null; busy: boolean; notice: string | null; guestOnPastBoard: boolean; guestOnYesterday: boolean; onStart: () => void; onArchive: () => void; onExit?: () => void }) {
  const c = buscaminasCopy(locale);
  const inProgress = Boolean(state && (state.round > 0 || state.picked.length > 0 || state.results.length > 0));
  return (
    <div className="flex flex-1 flex-col">
      {onExit && (
        <button type="button" onClick={onExit} aria-label={c.exit} className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
      )}
      <div className="flex flex-1 flex-col justify-center">
        <Brand locale={locale} className="text-3xl leading-none" />
        <p className="mt-2 text-sm font-bold text-white/60" style={poppins}>#{number}</p>
        {guestOnPastBoard && notice !== buscaminasCopy(locale).guestYesterday && (
          <div className="mt-4 rounded-2xl border border-brand-yellow/60 bg-brand-yellow/10 px-4 py-3">
            <p className="text-sm text-white/90">{guestOnYesterday ? c.guestYesterday : c.board.guestPlay}</p>
            <SignInLink placement="buscaminas_intro" modeId="buscaminas" returnTo="/buscaminas" className="mt-2 inline-flex h-9 items-center rounded-full bg-brand-yellow px-4 text-xs font-black uppercase text-black hover:bg-brand-yellow-deep">{c.playToday}</SignInLink>
          </div>
        )}
        <div className="relative mt-5 aspect-video w-full overflow-hidden rounded-2xl bg-game-art-night" aria-hidden>
          <Image
            src="/assets/demos/game-modes/buscaminas.webp"
            alt=""
            fill
            sizes="(max-width: 480px) 100vw, 448px"
            className="object-cover"
          />
        </div>
        <ul className="mt-6 space-y-2.5">
          {c.intro.lines.map((line) => (
            <li key={line} className="flex gap-2.5 text-[15px] leading-snug text-white/85"><span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-yellow" />{line}</li>
          ))}
        </ul>
        {notice && <p role="alert" className="mt-6 rounded-xl bg-brand-red-soft/20 px-3 py-2 text-sm font-semibold text-white">{notice}</p>}
        <button type="button" onClick={onStart} disabled={busy} className="mt-8 h-14 rounded-full bg-brand-green text-base font-black uppercase tracking-wide text-white hover:bg-brand-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-60" style={poppins}>
          {busy ? c.loading : inProgress && state ? c.intro.resume(state.round + 1) : c.intro.start}
        </button>
        <button type="button" onClick={onArchive} disabled={busy} className="mt-3 h-11 rounded-full bg-white/10 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/15 disabled:opacity-50" style={poppins}>{c.intro.past}</button>
        <p className="mt-4 text-center text-xs text-white/50">{c.intro.newBoard}</p>
      </div>
    </div>
  );
}

function Board({ locale, content, round, state, pending, notice, onPick, onBank, onNext, onExit }: {
  locale: Locale; content: BuscaminasDay; round: BuscaminasRound; state: BuscaminasRunState; pending: string | null; notice: string | null;
  onPick: (card: BuscaminasCard) => void; onBank: () => void; onNext: () => void; onExit?: () => void;
}) {
  const c = buscaminasCopy(locale);
  const targets = TARGETS_PER_ROUND;
  const found = state.found;
  const settled = state.settled;
  const reveal = settled?.reveal;
  const total = content.rounds.length;
  const [reported, setReported] = useState<string | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (settled) nextRef.current?.focus({ preventScroll: true }); }, [settled]);
  const report = () => {
    trackReport({ puzzleId: content.day, contentVersion: content.contentVersion ?? 1, round: state.round + 1, roundId: round.id, playerIds: round.cards.map((card) => card.id) });
    setReported(round.id);
  };
  const chip = { easy: "border-brand-green-light text-brand-green-light", medium: "border-brand-yellow text-brand-yellow", hard: "border-brand-orange text-brand-orange" }[round.difficulty];

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3">
        {onExit && (
          <button type="button" onClick={onExit} aria-label={c.exit} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-4" /></button>
        )}
        <Brand locale={locale} className="min-w-0 flex-1 truncate text-[13px]" />
        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase", chip)} style={poppins}>{c.difficulty[round.difficulty]}</span>
      </header>

      <div className="mt-3 flex items-center gap-3">
      <p className="shrink-0 text-xs font-black uppercase tabular-nums text-white/80" style={poppins}>{c.round(state.round + 1, total)}</p>
      <ol className="flex flex-1 gap-1" aria-hidden>
        {content.rounds.map((r, i) => {
          const result: RoundResult | null | undefined = i < state.results.length ? state.results[i] : i === state.round ? settled : undefined;
          return (
            <li key={r.id} className={cn("h-1.5 flex-1 rounded-full", result?.outcome === "perfect" ? "bg-brand-green-light" : result?.outcome === "banked" ? "bg-brand-yellow" : result?.outcome === "mine" ? "bg-brand-red-soft" : i === state.round ? "bg-white/60" : "bg-white/15")} />
          );
        })}
      </ol>
      </div>

      <motion.div key={round.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3">
        <h2 className="text-balance text-center text-[17px] font-black leading-snug" style={poppins}>{promptFor(round.prompt, locale)}</h2>
      </motion.div>

      <div className="mt-3 flex items-center gap-3">
        <p className="shrink-0 text-xs font-black uppercase tracking-wide text-white/70" style={poppins}>
          {c.found}: <span className="text-brand-green-light">{found}</span> / {targets}
        </p>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-brand-green-light transition-[width] duration-300" style={{ width: `${(found / targets) * 100}%` }} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {round.cards.map((card, index) => (
          <PlayerCard
            key={card.id}
            card={card}
            index={index}
            picked={state.picked.includes(card.id)}
            mine={state.mine === card.id}
            revealOk={Boolean(reveal?.ok.includes(card.id))}
            revealMine={Boolean(reveal?.mines.includes(card.id))}
            revealed={Boolean(settled)}
            checking={pending === card.id}
            locked={pending !== null}
            labels={{ mine: c.mineCard, fit: c.fitCard }}
            onPick={() => onPick(card)}
          />
        ))}
      </div>

      <div className="mt-auto pt-4">
        {notice && <p role="alert" className="mb-2 rounded-xl bg-brand-red-soft/20 px-3 py-2 text-center text-sm font-semibold">{notice}</p>}
        {settled ? (
          <div className="flex flex-col gap-2">
            {!reveal && <p className="text-center text-[11px] text-white/55">{c.revealLater}</p>}
            <p className={cn("text-center text-sm font-black", settled.outcome === "mine" ? "text-brand-red-soft" : settled.outcome === "perfect" ? "text-brand-green-light" : "text-brand-yellow")} style={poppins} role="status">
              {settled.outcome === "mine" ? c.mine(settled.found) : settled.outcome === "perfect" ? c.perfect(settled.points) : c.banked(settled.points)}
            </p>
            <button ref={nextRef} type="button" onClick={onNext} disabled={pending !== null} className="disabled:opacity-60 h-14 rounded-full bg-brand-green text-base font-black uppercase tracking-wide text-white hover:bg-brand-green-deep" style={poppins}>
              {state.results.length + 1 >= total ? c.finish : c.next}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <button type="button" onClick={onBank} disabled={found < 1 || pending !== null} className="h-14 rounded-full bg-brand-yellow text-base font-black uppercase tracking-wide text-black transition-opacity hover:bg-brand-yellow-deep disabled:opacity-40" style={poppins}>
              {c.bank(found)}
            </button>
            {found < 1 && <p className="text-center text-xs text-white/50">{c.bankHint}</p>}
          </div>
        )}
        <button type="button" onClick={report} disabled={reported === round.id} className="mx-auto mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-white/45 hover:text-white/75 disabled:text-white/60">
          <Flag className="size-3" /> {reported === round.id ? c.reported : c.report}
        </button>
      </div>
    </div>
  );
}

function PlayerCard({ card, index, picked, mine, revealOk, revealMine, revealed, checking, locked, labels, onPick }: {
  card: BuscaminasCard; index: number; picked: boolean; mine: boolean; revealOk: boolean; revealMine: boolean; revealed: boolean; checking: boolean; locked: boolean;
  labels: { mine: string; fit: string }; onPick: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const hit = picked && !mine;
  const missedTarget = revealed && !picked && revealOk;
  const hiddenMine = revealed && !picked && revealMine;
  const initials = card.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2);
  return (
    <motion.button
      type="button"
      onClick={() => { if (!picked && !revealed && !locked) onPick(); }}
      aria-disabled={picked || revealed || locked}
      aria-label={`${card.name}${hit ? " ✓" : mine || hiddenMine ? ` — ${labels.mine}` : missedTarget ? ` — ${labels.fit}` : ""}`}
      aria-pressed={picked}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={mine ? { opacity: 1, scale: 1, x: [0, -5, 5, -4, 4, 0] } : { opacity: 1, scale: 1, x: 0 }}
      transition={mine ? { duration: 0.4 } : { delay: index * 0.015, duration: 0.18 }}
      whileTap={picked || revealed || locked ? undefined : { scale: 0.95 }}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border-2 bg-surface-page-deep text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
        hit ? "border-brand-green-light shadow-[0_0_14px_rgba(88,204,2,0.35)]"
          : mine ? "border-brand-red-soft shadow-[0_0_14px_rgba(255,75,75,0.45)]"
          : missedTarget ? "border-dashed border-brand-green-light/60 opacity-70"
          : hiddenMine ? "border-brand-red-soft/60 opacity-80"
          : checking ? "animate-pulse border-white/70"
          : "border-white/10 hover:border-white/35",
      )}
    >
      <div className="relative aspect-[4/5] w-full bg-white/[0.04]">
        {failed ? (
          <div className="flex size-full items-center justify-center text-lg font-black text-white/40" style={poppins}>{initials}</div>
        ) : (
          <Image src={card.img} alt="" fill unoptimized sizes="96px" draggable={false} onError={() => setFailed(true)} className={cn("object-cover", mine && "saturate-50")} />
        )}
        {mine && <div className="absolute inset-0 bg-brand-red-soft/35" />}
        {(hit || mine || hiddenMine) && (
          <span className={cn("absolute right-1 top-1 flex size-5 items-center justify-center rounded-full", hit ? "bg-brand-green-light text-black" : "bg-brand-red-soft text-white")}>
            {hit ? <Check className="size-3.5" strokeWidth={3.5} /> : <Bomb className="size-3" strokeWidth={2.5} />}
          </span>
        )}
      </div>
      <span className={cn("flex min-h-[26px] items-center justify-center px-1 py-0.5 text-center font-black uppercase leading-[1.1] [overflow-wrap:anywhere]", card.name.length > 11 ? "text-[9px]" : "text-[10px]", hit ? "text-brand-green-light" : mine ? "text-brand-red-soft" : "text-white")} style={poppins}>{card.name}</span>
    </motion.button>
  );
}

function EndScreen({ locale, day, liveDay, guestOnYesterday, state, days, versions, boardRefresh, onArchive, onExit }: { locale: Locale; day: string; liveDay: string | null; guestOnYesterday: boolean; state: BuscaminasRunState; days: string[]; versions?: Record<string, number>; boardRefresh: number; onArchive: () => void; onExit?: () => void }) {
  const rankedDay = day === liveDay;
  const c = buscaminasCopy(locale);
  const results: RoundResult[] = state.results;
  const score = state.score;
  const perfects = results.filter((r) => r.outcome === "perfect").length;
  const mines = results.filter((r) => r.outcome === "mine").length;
  const number = puzzleNumber(day);
  const grid = resultGrid(results);
  // This day's result may not be persisted yet when the screen first renders.
  const owner = useAuthStore((s) => (s.status === "authenticated" && s.user?.id ? s.user.id : "guest"));
  const streak = useMemo(() => streakFrom(days, { ...finishedScores(days, owner, versions), [day]: score }), [day, days, owner, score, versions]);
  const [copied, setCopied] = useState(false);
  const guest = useAuthStore((s) => s.status) !== "authenticated";
  const sharePath = `/r/${encodeShare(number, results, locale)}`;
  const shareUrl = typeof window === "undefined" ? sharePath : `${window.location.origin}${sharePath}`;
  const text = c.shareText(number, score, grid, shareUrl);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const self = findPublicGameByModeId("buscaminas");
  const related = self ? relatedPublishedGames(self) : [];

  const whatsapp = () => {
    trackShare({ puzzleId: day, method: "whatsapp", result: "attempted", score });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };
  const native = async () => {
    try {
      await navigator.share({ text });
      trackShare({ puzzleId: day, method: "native", result: "succeeded", score });
    } catch (error) {
      trackShare({ puzzleId: day, method: "native", result: (error as { name?: string })?.name === "AbortError" ? "cancelled" : "failed", score });
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      trackShare({ puzzleId: day, method: "copy", result: "succeeded", score });
    } catch {
      trackShare({ puzzleId: day, method: "copy", result: "failed", score });
    }
  };
  const isToday = day === days[0];

  return (
    <div className="flex flex-1 flex-col">
      {onExit && (
        <button type="button" onClick={onExit} aria-label={c.exit} className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
      )}
      <div className="mt-2 rounded-3xl bg-brand-blue p-5 text-center">
        <Brand locale={locale} className="text-lg" />
        <p className="text-xs font-bold text-white/70" style={poppins}>#{number}</p>
        <p className="mt-4 text-6xl font-black tabular-nums" style={poppins}>{score}</p>
        <p className="text-xs font-bold uppercase tracking-wide text-white/70">{c.end.score} · {c.end.of(MAX_SCORE)}</p>
        {state.ranked && state.rank ? (
          <p className="mx-auto mt-3 w-fit rounded-full bg-brand-yellow px-4 py-1 text-sm font-black text-black" style={poppins}>{c.board.rank(state.rank)}</p>
        ) : (
          <p className="mt-3 text-xs text-white/70">{guest ? (guestOnYesterday ? c.guestYesterday : c.board.guestPlay) : rankedDay ? null : c.board.unranked}</p>
        )}
        <p aria-hidden className="mt-4 whitespace-pre text-xl leading-snug tracking-[0.12em]">{grid}</p>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label={c.end.perfects} value={String(perfects)} />
          <Stat label={c.end.mines} value={String(mines)} />
          <Stat label={c.end.streak} value={c.end.days(streak)} />
        </dl>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={whatsapp} className="col-span-2 flex h-14 items-center justify-center gap-2 rounded-full bg-brand-green text-base font-black uppercase tracking-wide text-white hover:bg-brand-green-deep" style={poppins}>
          <Share2 className="size-5" /> {c.end.whatsapp}
        </button>
        {canNativeShare && (
          <button type="button" onClick={native} className="flex h-11 items-center justify-center gap-2 rounded-full bg-white/10 text-sm font-bold uppercase text-white hover:bg-white/15" style={poppins}>
            <Share2 className="size-4" /> {c.end.share}
          </button>
        )}
        <button type="button" onClick={copy} className={cn("flex h-11 items-center justify-center gap-2 rounded-full bg-white/10 text-sm font-bold uppercase text-white hover:bg-white/15", !canNativeShare && "col-span-2")} style={poppins}>
          <Copy className="size-4" /> {copied ? c.end.copied : c.end.copy}
        </button>
      </div>

      {isToday && <p className="mt-3 text-center text-sm text-white/60">{c.end.comeBack}</p>}
      <button type="button" onClick={onArchive} className="mt-3 h-11 rounded-full border border-white/15 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/10" style={poppins}>{c.end.past}</button>

      {liveDay && <BuscaminasLeaderboard locale={locale} day={liveDay} refreshKey={boardRefresh} placement="end" className="mt-4" />}

      {related.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-bold uppercase" style={poppins}>{c.end.more}</h2>
          <PublicCardGrid games={related} locale={locale} surface="game_result" />
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 px-2 py-2">
      <dt className="text-[10px] font-bold uppercase leading-tight text-white/60">{label}</dt>
      <dd className="mt-0.5 text-lg font-black tabular-nums" style={poppins}>{value}</dd>
    </div>
  );
}

function Archive({ locale, days, lockedLiveDay, versions, today, current, currentState, onBack, onOpen }: { locale: Locale; days: string[]; lockedLiveDay: string | null; versions?: Record<string, number>; today: string; current: string; currentState: BuscaminasRunState | null; onBack: () => void; onOpen: (day: string) => void }) {
  const c = buscaminasCopy(locale);
  const owner = useAuthStore((s) => (s.status === "authenticated" && s.user?.id ? s.user.id : "guest"));
  const scores = useMemo(() => finishedScores(days, owner, versions), [days, owner, versions]);
  const unfinished = useMemo(() => inProgressDays(days, owner, versions), [days, owner, versions]);
  const todayPuzzle = puzzleDayFor(today);
  return (
    <div className="flex flex-1 flex-col">
      <button type="button" onClick={onBack} aria-label={c.archive.back} className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
      <h2 className="mt-3 text-2xl font-black uppercase" style={poppins}>{c.archive.title}</h2>
      {lockedLiveDay && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-brand-yellow/60 bg-brand-yellow/10 px-4 py-3">
          <span className="font-black" style={poppins}>#{puzzleNumber(lockedLiveDay)} <span className="ml-2 text-xs font-bold text-white/55">{c.archive.today}</span></span>
          <SignInLink placement="buscaminas_archive" modeId="buscaminas" returnTo="/buscaminas" className="inline-flex h-9 items-center rounded-full bg-brand-yellow px-4 text-xs font-black uppercase text-black hover:bg-brand-yellow-deep">{c.playToday}</SignInLink>
        </div>
      )}
      <ul className="mt-4 flex flex-col gap-2">
        {days.map((d) => {
          const score = d === current && currentState?.done ? currentState.score : scores[d];
          const started = (d === current && currentState && !currentState.done) || unfinished.has(d);
          return (
            <li key={d}>
              <button type="button" onClick={() => onOpen(d)} className={cn("flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left hover:bg-white/10", d === current ? "border-brand-yellow bg-white/[0.08]" : "border-white/10 bg-white/[0.05]")}>
                <span className="font-black" style={poppins}>#{puzzleNumber(d)} <span className="ml-2 text-xs font-bold text-white/55">{d === todayPuzzle ? c.archive.today : d}</span></span>
                <span className={cn("text-sm font-bold", score !== undefined ? "text-brand-green-light" : "text-white/45")}>{score !== undefined ? c.archive.played(score) : started ? c.archive.inProgress : c.archive.notPlayed}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
