"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Copy, Flag, Share2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useUserPreferences } from "@/lib/preferences/userPreferences";
import { playSfx } from "@/lib/sounds/gameSounds";
import { peekGuestToken } from "@/lib/guest/guestSession";
import type { EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { findPublicGameByModeId, publicGamePath, relatedPublishedGames } from "@/lib/seo/public-games";
import { PublicCardGrid } from "@/features/marketing/public/PublicCards";
import { SignInLink } from "@/features/marketing/public/PublicLinks";
import { PlayWithFriendButton } from "@/features/duel/PlayWithFriendButton";
import type { Locale } from "@/lib/i18n/locale";
import { MinutoApiError, isNetworkFailure, minutoApi, type MinutoReview, type MinutoRun, type MinutoRunState } from "@/lib/repositories/minuto.repo";
import {
  MAX_SCORE, addDays, formatMinute, isClosedDay, isLiveDay, playableDays, puzzleNumber, releaseDay, resultGrid, resultTone,
  type GoalResult, type MinutoGoalCard, type ResultTone,
} from "./minuto.logic";
import { clearRun, finishedFromServer, finishedScores, inProgressDays, loadRun, saveRun, streakFrom } from "./minuto.storage";
import { minutoCopy, nameFor } from "./minuto.copy";
import { GoalCard, GoalPicture } from "./MinutoCard";
import { MinuteInput } from "./MinuteInput";
import { MinutoLeaderboard } from "./MinutoLeaderboard";
import { trackActionError, trackArchiveOpen, trackLoadError, trackReport, trackRoundEnd, trackRunComplete, trackRunStart, trackShare } from "./minuto.analytics";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;
type View = "intro" | "play" | "end" | "archive";
/** A dropped connection usually comes back within a second or two: wait before re-syncing or resending. */
const RECOVERY_DELAY_MS = 800;

export const TONE_CHIP: Record<ResultTone, string> = {
  exact: "bg-brand-green text-white",
  close: "bg-brand-yellow text-black",
  near: "bg-brand-orange text-white",
  far: "bg-brand-red-soft/80 text-white",
};
const TONE_BAR: Record<ResultTone, string> = { exact: "bg-brand-green", close: "bg-brand-yellow", near: "bg-brand-orange", far: "bg-brand-red-soft" };

const startedOn = (state: MinutoRunState): boolean => state.round > 0 || state.results.length > 0;

/** Cards this device saw, per board and player: the end screen names each goal (a live day has no review yet). */
const cardsKey = (day: string, owner: string) => `qb.minuto.cards.v1.${day}.${owner}`;
function loadCards(day: string, owner: string): Record<string, MinutoGoalCard> {
  try {
    const raw = window.localStorage.getItem(cardsKey(day, owner));
    return raw ? (JSON.parse(raw) as Record<string, MinutoGoalCard>) : {};
  } catch {
    return {};
  }
}
function saveCard(day: string, owner: string, card: MinutoGoalCard): void {
  try {
    const cards = loadCards(day, owner);
    if (cards[card.id]) return;
    window.localStorage.setItem(cardsKey(day, owner), JSON.stringify({ ...cards, [card.id]: card }));
  } catch {
    // Private mode or a full quota: the end screen then lists minutes without names.
  }
}

export function MinutoGame({ locale, onExit, onEvent, initialDay, onDay }: {
  locale: Locale;
  onExit?: () => void;
  onEvent?: (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => void;
  /** The board being shown changed (the public page keeps it in its URL so a reload reopens it). */
  onDay?: (day: string) => void;
  /** A past day from the archive link (?dia=); ignored when it isn't playable. */
  initialDay?: string | null;
}) {
  const c = minutoCopy(locale);
  const [today, setToday] = useState(() => releaseDay());
  const [versions, setVersions] = useState<Record<string, number> | null | undefined>(undefined);
  const [boardsAttempt, setBoardsAttempt] = useState(0);
  const firstTodayRef = useRef(today);
  const days = useMemo(() => playableDays(today).filter((d) => !versions || d in versions), [today, versions]);
  const [chosenDay, setChosenDay] = useState<string | null>(initialDay ?? null);
  const [lockedDay, setLockedDay] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const [resumeKey, setResumeKey] = useState<string | null>(null);
  const replayPendingRef = useRef(false);
  /** Same-tick clicks all see the same `pending` state, so the in-flight guard has to be a ref. */
  const inFlightRef = useRef(false);
  const serverCheckedRef = useRef(new Set<string>());
  const currentDayRef = useRef<string | null>(null);
  const currentOwnerRef = useRef<string | null>(null);
  const currentVersionRef = useRef<number | undefined>(undefined);
  /** An answer belongs to the player, board and content version it was asked for. */
  const stillCurrent = (requestOwner: string, requestDay: string, requestVersion: number | undefined) =>
    currentOwnerRef.current === requestOwner && currentDayRef.current === requestDay && currentVersionRef.current === requestVersion;
  const authStatus = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id);
  const owner = authStatus === "authenticated" && userId ? userId : "guest";
  const authReady = authStatus !== "loading";
  const newest = days[0] ?? null;
  /**
   * The first day the server refused a guest as still open (this device's clock runs ahead): it and later days are out
   * until this device's day changes, by which time the server has closed that day too.
   */
  const [guestRefusal, setGuestRefusal] = useState<{ from: string; today: string } | null>(null);
  const guestLiveFrom = guestRefusal && guestRefusal.today === today ? guestRefusal.from : null;
  const guestLockedOut = owner === "guest" && newest !== null && (!isClosedDay(newest, today) || guestLiveFrom !== null);
  const openableDays = useMemo(
    () => (owner === "guest" ? days.filter((d) => isClosedDay(d, today) && (guestLiveFrom === null || d < guestLiveFrom)) : days),
    [days, owner, today, guestLiveFrom],
  );
  const openable = (d: string | null) => (d && openableDays.includes(d) ? d : null);
  const day = openable(chosenDay) ?? openable(lockedDay) ?? openableDays[0] ?? null;
  const guestOnPastBoard = owner === "guest" && day !== null && isClosedDay(day, today);
  // A run is only ever shown (or saved) for the player and board it belongs to: a day or account switch can't leak it.
  const [entry, setEntry] = useState<{ owner: string; day: string; version: number | undefined; run: MinutoRun } | null>(null);
  const contentVersion = day && versions ? versions[day] : undefined;
  // A run belongs to its board's content version too: after a correction it is never shown (or saved) as the new one.
  const run = entry && entry.owner === owner && entry.day === day && entry.version === contentVersion ? entry.run : null;
  const setRun = (next: MinutoRun | null) => setEntry(next && day ? { owner, day, version: contentVersion, run: next } : null);
  const [view, setView] = useState<View>("intro");
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [boardRefresh, setBoardRefresh] = useState(0);
  const state = run?.state ?? null;
  useEffect(() => { currentDayRef.current = day; }, [day]);
  useEffect(() => { currentVersionRef.current = contentVersion; }, [contentVersion]);
  useEffect(() => {
    if (currentOwnerRef.current !== null && currentOwnerRef.current !== owner) {
      startedRef.current = false;
      replayPendingRef.current = false;
    }
    currentOwnerRef.current = owner;
  }, [owner]);
  useEffect(() => () => { currentDayRef.current = null; }, []);

  useEffect(() => {
    const check = () => setToday(releaseDay());
    const timer = window.setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", check); window.removeEventListener("focus", check); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    minutoApi.boards(boardsAttempt > 0 || today !== firstTodayRef.current)
      .then((data) => { if (!cancelled) setVersions(data.days ?? {}); })
      .catch((error: unknown) => {
        if (cancelled) return;
        setVersions(null);
        trackLoadError({ puzzleId: "boards", status: error instanceof MinutoApiError ? error.status : null });
      });
    return () => { cancelled = true; };
  }, [boardsAttempt, today]);

  useEffect(() => {
    if (!authReady || !day || contentVersion === undefined) return;
    const saved = loadRun(day, contentVersion, owner);
    const mine = saved && saved.state.day === day ? saved : null;
    setEntry(mine ? { owner, day, version: contentVersion, run: mine } : null);
    setView(mine?.state.done ? "end" : "intro");
    setResumeKey(mine && !mine.state.done && startedOn(mine.state) ? `${owner}:${day}` : null);
  }, [authReady, contentVersion, day, owner]);

  // A board finished elsewhere (new device, cleared storage) shows as finished here too: one lookup per board and player.
  useEffect(() => {
    if (!authReady || !day || contentVersion === undefined) return;
    const checkKey = `${owner}:${day}:${contentVersion}`;
    if (serverCheckedRef.current.has(checkKey) || day in finishedScores([day], owner, { [day]: contentVersion })) return;
    if (owner === "guest" && !peekGuestToken()) return;
    serverCheckedRef.current.add(checkKey);
    minutoApi.current(day, locale)
      .then((data) => {
        // Answered after the player moved on: look again when they come back to this board.
        if (!stillCurrent(owner, day, contentVersion)) {
          serverCheckedRef.current.delete(checkKey);
          return;
        }
        setEntry((prev) => {
          const finished = finishedFromServer(prev && prev.owner === owner && prev.day === day && prev.version === contentVersion ? prev.run : null, data);
          return finished ? { owner, day, version: contentVersion, run: finished } : prev;
        });
      })
      .catch(() => { serverCheckedRef.current.delete(checkKey); });
  }, [authReady, contentVersion, day, locale, owner]);

  useEffect(() => {
    if (!entry) return;
    const version = versions?.[entry.day];
    if (version === undefined || version !== entry.version) return;
    saveRun(entry.day, version, entry.run, entry.owner);
    if (entry.run.state.goal) saveCard(entry.day, entry.owner, entry.run.state.goal);
  }, [entry, versions]);

  const { soundEnabled } = useUserPreferences();
  const cue = useCallback((name: "correctRanked" | "wrongAnswer") => { if (soundEnabled) playSfx(name); }, [soundEnabled]);

  const apply = (next: MinutoRun) => {
    const settled = next.state.settled ?? (next.state.done ? next.state.results[next.state.results.length - 1] : null);
    if (day && settled && !state?.settled && next.state.results.length > (state?.results.length ?? 0)) {
      trackRoundEnd({ puzzleId: day, contentVersion: contentVersion ?? 0, round: next.state.results.length, diff: settled.diff, points: settled.points });
      cue(settled.points > 0 ? "correctRanked" : "wrongAnswer");
    }
    setRun(next);
    if (day && next.state.done && state && !state.done) {
      onEvent?.("complete", { score: next.state.score });
      trackRunComplete({ puzzleId: day, ranked: next.state.ranked, score: next.state.score, exact: next.state.exact, rank: next.state.rank ?? null });
      if (next.state.ranked) setBoardRefresh((n) => n + 1);
    }
  };

  /** One server action at a time; an outdated run is re-synced from the server's copy. */
  const act = async (key: string, call: () => Promise<MinutoRun | null>) => {
    if (inFlightRef.current || !day) throw new Error("action_in_flight");
    inFlightRef.current = true;
    setPending(key);
    setNotice(null);
    const requestOwner = owner;
    const requestDay = day;
    const requestVersion = contentVersion;
    const current = () => stillCurrent(requestOwner, requestDay, requestVersion);
    try {
      let result: MinutoRun | null;
      try {
        result = await call();
      } catch (error) {
        if (!isNetworkFailure(error) || key === "start" || !run || !current()) throw error;
        // No answer: the move may still have reached the server. Look at the run, and resend only if it did not
        // (a resend is safe: every move is version-checked, so one already applied comes back stale_state).
        trackActionError({ puzzleId: day, action: key, status: null, code: null });
        await new Promise((resolve) => window.setTimeout(resolve, RECOVERY_DELAY_MS));
        if (!current()) return;
        const before = run;
        const look = async () => {
          const latest = await minutoApi.start(requestDay, requestVersion, locale);
          const unchanged = latest.run.id === before.run.id && latest.run.version === before.run.version;
          return { current: latest, unchanged };
        };
        let seen = await look();
        if (!current()) return;
        if (seen.unchanged) {
          try {
            result = await call();
          } catch (resendError) {
            if (!(resendError instanceof MinutoApiError && resendError.message === "stale_state") || !current()) throw resendError;
            seen = await look();
            if (!current()) return;
            if (seen.unchanged) throw resendError;
            result = seen.current;
          }
        } else {
          result = seen.current;
        }
      }
      if (!current()) return;
      if (result) apply(result);
    } catch (error) {
      if (!current()) return;
      const code = error instanceof MinutoApiError ? error.message : null;
      const status = error instanceof MinutoApiError ? error.status : null;
      trackActionError({ puzzleId: day, action: key, status, code });
      if (code === "day_over") {
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
        // The server said this day is still open (this device's clock may run ahead): only earlier days are offered
        // now, and with none left the screen says why and offers sign-in.
        setGuestRefusal((prev) => ({ from: prev && prev.today === today && prev.from < day ? prev.from : day, today }));
        setChosenDay(openableDays.find((d) => d < day) ?? null);
        setLockedDay(null);
        setView("intro");
        setNotice(c.guestYesterday);
      } else if (status === 503) {
        setNotice(c.maintenance);
      } else if (code === "stale_state" && run) {
        try {
          const fresh = await minutoApi.start(requestDay, requestVersion, locale);
          if (!current()) return;
          apply(fresh);
          setView(fresh.state.done ? "end" : "play");
        } catch {
          if (current()) setNotice(c.actionError);
        }
      } else if (status === 409 || status === 401 || status === 403 || status === 404) {
        replayPendingRef.current ||= startedRef.current;
        startedRef.current = false;
        clearRun(day, owner);
        setRun(null);
        setView("intro");
        setNotice(status === 409 ? c.restarted : c.sessionChanged);
        if (code === "content_changed") {
          setVersions(undefined);
          setBoardsAttempt((n) => n + 1);
        }
      } else {
        setNotice(c.actionError);
      }
      throw error;
    } finally {
      inFlightRef.current = false;
      setPending(null);
    }
  };

  const markStarted = () => {
    if (replayPendingRef.current) { replayPendingRef.current = false; onEvent?.("replay"); }
    if (!startedRef.current) { startedRef.current = true; onEvent?.("start"); }
  };

  const start = () => {
    if (!day) return;
    if (state?.done) {
      setView("end");
      return;
    }
    const requestedDay = day;
    const requestOwner = owner;
    const requestVersion = contentVersion;
    setLockedDay(requestedDay);
    void act("start", async () => {
      const fresh = await minutoApi.start(requestedDay, requestVersion, locale);
      if (!stillCurrent(requestOwner, requestedDay, requestVersion)) return null;
      markStarted();
      trackRunStart({ puzzleId: requestedDay, contentVersion: contentVersion ?? 0, ranked: fresh.state.ranked, resumed: startedOn(fresh.state), round: fresh.state.round + 1 });
      setView(fresh.state.done ? "end" : "play");
      return fresh;
    }).catch(() => {});
  };
  const onDayRef = useRef(onDay);
  onDayRef.current = onDay;
  useEffect(() => { if (day) onDayRef.current?.(day); }, [day]);

  // The resume goes through /start like a click, so the server state (another tab, a correction) wins over the cache.
  const startLatest = useRef(start);
  startLatest.current = start;
  useEffect(() => {
    if (view !== "intro" || pending || !day || resumeKey !== `${owner}:${day}`) return;
    setResumeKey(null);
    startLatest.current();
  }, [view, pending, day, owner, resumeKey]);

  const guess = (minute: number) => { if (run) void act("guess", () => minutoApi.guess(run, minute, locale)).catch(() => {}); };
  const advance = () => {
    if (!run) return;
    if (run.state.done) {
      setView("end");
      scrollRef.current?.scrollTo({ top: 0 });
      return;
    }
    void act("next", () => minutoApi.next(run, locale)).then(() => scrollRef.current?.scrollTo({ top: 0 })).catch(() => {});
  };
  const openDay = (target: string) => {
    trackArchiveOpen({ puzzleId: target, daysBack: days.indexOf(target) });
    if (target !== day && !(target in finishedScores([target], owner, versions ?? undefined))) {
      replayPendingRef.current ||= startedRef.current;
      startedRef.current = false;
    }
    if (target !== day) setNotice(null);
    setChosenDay(target);
    setLockedDay(null);
    setView(target === day && state?.done ? "end" : "intro");
  };

  return (
    <div ref={scrollRef} className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center text-white">
      <div className={cn("mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6 pt-3", view === "play" && "lg:max-w-4xl lg:px-8", view === "end" && "md:max-w-3xl md:px-6")}>
        {versions === null ? (
          <Centered>
            <p className="text-center text-sm text-white/80">{c.loadError}</p>
            <button type="button" onClick={() => { setVersions(undefined); setBoardsAttempt((n) => n + 1); }} className="mt-4 h-11 rounded-full bg-brand-yellow px-6 text-sm font-black uppercase text-black" style={poppins}>{c.retry}</button>
            {onExit && <ExitLink label={c.exit} onExit={onExit} />}
          </Centered>
        ) : versions === undefined || !authReady ? (
          <Centered><p className="animate-pulse text-sm text-white/70">{c.loading}</p></Centered>
        ) : !day ? (
          <Centered>
            <Brand locale={locale} className="text-3xl" />
            <p className="mt-3 text-center text-sm text-white/75">{guestLockedOut ? c.guestYesterday : c.intro.soon}</p>
            {guestLockedOut && <SignInLink placement="minuto_intro" modeId="minuto" returnTo="/minuto" className="mt-4 inline-flex h-10 items-center rounded-full bg-brand-yellow px-5 text-xs font-black uppercase text-black hover:bg-brand-yellow-deep">{c.playToday}</SignInLink>}
            {onExit && <ExitLink label={c.exit} onExit={onExit} />}
          </Centered>
        ) : view === "archive" ? (
          <Archive locale={locale} days={openableDays} lockedLiveDay={guestLockedOut ? newest : null} versions={versions} today={today} current={day} currentState={state} onBack={() => setView(state?.done ? "end" : "intro")} onOpen={openDay} />
        ) : view === "end" && state ? (
          <EndScreen locale={locale} day={day} today={today} state={state} days={days} versions={versions} boardRefresh={boardRefresh} guestOnPastBoard={guestOnPastBoard} onArchive={() => setView("archive")} onExit={onExit} />
        ) : view === "play" && state ? (
          <Play key={`${run?.run.id ?? "run"}-${state.round}`} locale={locale} day={day} contentVersion={contentVersion ?? 0} state={state} pending={pending} notice={notice} onGuess={guess} onNext={advance} onExit={onExit} />
        ) : (
          <Intro locale={locale} number={puzzleNumber(day)} state={state} busy={pending === "start"} notice={notice} guestOnPastBoard={guestOnPastBoard} guestLockedOut={guestLockedOut} onStart={start} onArchive={() => setView("archive")} onExit={onExit} />
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

export function Brand({ locale, className }: { locale: Locale; className?: string }) {
  const c = minutoCopy(locale);
  return (
    <p className={cn("font-black uppercase tracking-tight", className)} style={poppins}>
      {c.brandA} <span className="text-brand-orange">{c.brandB}</span>
    </p>
  );
}

export function Intro({ locale, number, state, busy, notice, guestOnPastBoard, guestLockedOut, onStart, onArchive, onExit }: {
  locale: Locale; number: number; state: MinutoRunState | null; busy: boolean; notice: string | null; guestOnPastBoard: boolean; guestLockedOut: boolean;
  onStart: () => void; onArchive: () => void; onExit?: () => void;
}) {
  const c = minutoCopy(locale);
  const inProgress = Boolean(state && !state.done && startedOn(state));
  const finished = Boolean(state?.done);
  const refusedToday = notice === c.guestYesterday;
  return (
    <div className="flex flex-1 flex-col">
      {onExit && (
        <header className="mb-6 flex h-10 items-center">
          <button type="button" onClick={onExit} aria-label={c.exit} className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
        </header>
      )}
      <div className="flex flex-1 flex-col justify-center">
        <Brand locale={locale} className="text-4xl leading-none" />
        <p className="mt-2 text-sm font-bold text-white/60" style={poppins}>{c.pageName} · #{number}</p>
        {guestLockedOut && (guestOnPastBoard || refusedToday) && (
          <div role={refusedToday ? "alert" : undefined} className="mt-4 rounded-2xl border border-brand-yellow/60 bg-brand-yellow/10 px-4 py-3">
            <p className="text-sm text-white/90">{c.guestYesterday}</p>
            <SignInLink placement="minuto_intro" modeId="minuto" returnTo="/minuto" className="mt-2 inline-flex h-9 items-center rounded-full bg-brand-yellow px-4 text-xs font-black uppercase text-black hover:bg-brand-yellow-deep">{c.playToday}</SignInLink>
          </div>
        )}
        <div aria-hidden className="relative mt-5 flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-game-art-night bg-[url('/assets/stadium-green.webp')] bg-cover bg-center">
          <div className="absolute inset-0 bg-black/35" />
          <span className="relative rounded-2xl border-4 border-dashed border-brand-orange bg-black/40 px-6 py-3 text-6xl font-black text-brand-orange" style={poppins}>??&apos;</span>
        </div>
        <ul className="mt-6 space-y-2.5">
          {c.intro.lines.map((line) => (
            <li key={line} className="flex gap-2.5 text-[15px] leading-snug text-white/85"><span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-orange" />{line}</li>
          ))}
        </ul>
        {notice && !refusedToday && <p role="alert" className="mt-6 rounded-xl bg-brand-red-soft/20 px-3 py-2 text-sm font-semibold text-white">{notice}</p>}
        <button type="button" onClick={onStart} disabled={busy} className="mt-8 h-14 rounded-full bg-brand-green text-base font-black uppercase tracking-wide text-white hover:bg-brand-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-60" style={poppins}>
          {busy ? c.loading : finished ? c.finish : inProgress && state ? c.intro.resume(state.round + 1) : c.intro.start}
        </button>
        <PlayWithFriendButton game="minuto" locale={locale} className="mt-3" />
        <button type="button" onClick={onArchive} disabled={busy} className="mt-3 h-11 rounded-full bg-white/10 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/15 disabled:opacity-50" style={poppins}>{c.intro.past}</button>
        <p className="mt-4 text-center text-xs text-white/50">{c.intro.newBoard}</p>
      </div>
    </div>
  );
}

/** The settled goal: the real minute, the guess and the points. */
function ResultBanner({ locale, result }: { locale: Locale; result: GoalResult }) {
  const c = minutoCopy(locale);
  const tone = resultTone(result);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} role="status" className={cn("rounded-2xl px-4 py-3 text-center", tone === "exact" ? "bg-brand-green/25" : tone === "far" ? "bg-brand-red-soft/20" : "bg-brand-yellow/15")}>
      <p className={cn("text-base font-black", tone === "exact" ? "text-brand-green-light" : tone === "far" ? "text-brand-red-soft" : "text-brand-yellow")} style={poppins}>
        {result.diff === 0 ? c.exact : c.off(result.diff, result.points)}
      </p>
      <p className="mt-0.5 text-lg font-black uppercase" style={poppins}>{c.was(formatMinute(result.answer))}</p>
      <p className="text-[12px] text-white/65">{c.yourGuess(`${result.guess}'`)}</p>
    </motion.div>
  );
}

export function Play({ locale, day, contentVersion, state, pending, notice, onGuess, onNext, onExit }: {
  locale: Locale; day: string; contentVersion: number; state: MinutoRunState; pending: string | null; notice: string | null;
  onGuess: (minute: number) => void; onNext: () => void; onExit?: () => void;
}) {
  const c = minutoCopy(locale);
  const [reported, setReported] = useState<string | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const settled = state.settled ?? (state.done ? state.results[state.results.length - 1] ?? null : null);
  const roundKey = `${day}-${state.round}`;
  const goal = state.goal;
  // The bar flows under the picture, so focusing may scroll it into view on a short screen.
  useEffect(() => { if (settled) nextRef.current?.focus(); }, [settled, roundKey]);

  const report = () => {
    trackReport({ puzzleId: day, contentVersion, round: state.round + 1, locale });
    setReported(roundKey);
  };

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3">
        {onExit && (
          <button type="button" onClick={onExit} aria-label={c.exit} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-4" /></button>
        )}
        <Brand locale={locale} className="min-w-0 flex-1 truncate text-[13px]" />
        <span className="shrink-0 rounded-full bg-surface-page px-2.5 py-1 text-[11px] font-black uppercase tabular-nums text-white" style={poppins}>{c.round(state.round + 1, state.totalRounds)}</span>
        <span className="hidden shrink-0 rounded-full border border-white/30 px-2.5 py-1 text-[10px] font-black uppercase text-white/80 min-[400px]:inline" style={poppins}>{c.withData}</span>
      </header>

      <ol className="mt-3 flex gap-1" aria-hidden>
        {Array.from({ length: state.totalRounds }, (_, i) => {
          const result = state.results[i];
          return <li key={i} className={cn("h-1.5 flex-1 rounded-full", result ? TONE_BAR[resultTone(result)] : i === state.round ? "bg-white/60" : "bg-white/15")} />;
        })}
      </ol>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-bold text-white/60">{c.score}</span>
        <span className="text-xl font-black tabular-nums" style={poppins}>{state.score}<span className="text-sm text-white/45"> / {MAX_SCORE}</span></span>
      </div>

      {goal ? (
        <div className="mt-2 flex flex-col gap-3">
          <GoalCard goal={goal} locale={locale} minute={settled ? settled.answer : null} />
          <GoalPicture goal={goal} locale={locale} minute={settled ? settled.answer : null} className="lg:aspect-[21/9]" />
        </div>
      ) : (
        <p className="mt-6 text-center text-sm text-white/60">{c.loading}</p>
      )}

      <div className="mt-auto pb-1 pt-4">
        {notice && <p role="alert" className="mb-2 rounded-xl bg-brand-red-soft/20 px-3 py-2 text-center text-sm font-semibold">{notice}</p>}
        {settled ? (
          <div className="flex flex-col gap-2">
            <ResultBanner locale={locale} result={settled} />
            <button ref={nextRef} type="button" onClick={onNext} disabled={pending !== null} className="h-14 rounded-full bg-brand-green text-base font-black uppercase tracking-wide text-white hover:bg-brand-green-deep disabled:opacity-60" style={poppins}>
              {state.done ? c.finish : c.next}
            </button>
          </div>
        ) : (
          <MinuteInput key={roundKey} locale={locale} busy={pending !== null} onSubmit={onGuess} />
        )}
        <div className="mt-2 flex justify-end">
          <button type="button" onClick={report} disabled={reported === roundKey} className="flex items-center gap-1.5 text-[11px] font-semibold text-white/40 hover:text-white/70 disabled:text-white/60">
            <Flag className="size-3" /> {reported === roundKey ? c.reported : c.report}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EndScreen({ locale, day, today, state, days, versions, boardRefresh, guestOnPastBoard, onArchive, onExit }: {
  locale: Locale; day: string; today: string; state: MinutoRunState; days: string[]; versions?: Record<string, number>; boardRefresh: number; guestOnPastBoard: boolean;
  onArchive: () => void; onExit?: () => void;
}) {
  const c = minutoCopy(locale);
  const results = state.results;
  const score = state.score;
  const avgOff = results.length ? (results.reduce((sum, r) => sum + r.diff, 0) / results.length).toFixed(1) : "–";
  const number = puzzleNumber(day);
  const grid = resultGrid(results);
  const owner = useAuthStore((s) => (s.status === "authenticated" && s.user?.id ? s.user.id : "guest"));
  const guest = owner === "guest";
  const streak = useMemo(() => streakFrom(days, { ...finishedScores(days, owner, versions), [day]: score }), [day, days, owner, score, versions]);
  const [copied, setCopied] = useState(false);
  const self = findPublicGameByModeId("minuto");
  const sharePath = `${self ? publicGamePath(self, locale as "en" | "ka" | "es" | "tr") : "/minuto"}?utm_source=share&utm_medium=minuto&dia=${day}`;
  const shareUrl = typeof window === "undefined" ? sharePath : `${window.location.origin}${sharePath}`;
  const text = c.shareText(number, score, grid, shareUrl);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const related = self ? relatedPublishedGames(self) : [];
  const live = isLiveDay(day, today);
  const closed = isClosedDay(day, today);

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

  return (
    <div className="flex flex-1 flex-col">
      {onExit && (
        <header className="mb-5 flex h-10 items-center">
          <button type="button" onClick={onExit} aria-label={c.exit} className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
        </header>
      )}
      <div className="rounded-3xl bg-brand-blue p-5 text-center">
        <Brand locale={locale} className="text-lg" />
        <p className="text-xs font-bold text-white/70" style={poppins}>#{number}</p>
        <p className="mt-4 text-6xl font-black tabular-nums" style={poppins}>{score}</p>
        <p className="text-xs font-bold uppercase tracking-wide text-white/70">{c.end.score} · {c.end.of(MAX_SCORE)}</p>
        {state.ranked && state.rank ? (
          <p className="mx-auto mt-3 w-fit rounded-full bg-brand-yellow px-4 py-1 text-sm font-black text-black" style={poppins}>{c.board.rank(state.rank)}</p>
        ) : (
          <p className="mt-3 text-xs text-white/70">{guest ? (guestOnPastBoard ? c.guestYesterday : c.board.guestPlay) : live ? null : c.board.unranked}</p>
        )}
        <ol aria-hidden className="mx-auto mt-4 grid max-w-[18rem] grid-cols-10 gap-1">
          {results.map((r, i) => <li key={i} className={cn("flex h-7 items-center justify-center rounded-lg text-[11px] font-black tabular-nums", TONE_CHIP[resultTone(r)])} style={poppins}>{r.points}</li>)}
        </ol>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label={c.end.exact} value={`${state.exact}/10`} />
          <Stat label={c.end.avgOff} value={c.end.minutes(avgOff)} />
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

      {day === days[0] && !closed && <p className="mt-3 text-center text-sm text-white/60">{c.end.comeBack}</p>}
      <PlayWithFriendButton game="minuto" locale={locale} className="mt-3" />
      <button type="button" onClick={onArchive} className="mt-3 h-11 rounded-full border border-white/15 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/10" style={poppins}>{c.end.past}</button>

      <Goals locale={locale} day={day} closed={closed} results={results} />

      <MinutoLeaderboard locale={locale} day={live ? day : undefined} refreshKey={boardRefresh} placement="end" className="mt-4" />

      {related.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-bold uppercase" style={poppins}>{c.end.more}</h2>
          <PublicCardGrid games={related} locale={locale} surface="game_result" />
        </section>
      )}
    </div>
  );
}

/** Every goal of the board with its minute and the player's guess (names from the cards this device saw, or the closed day's review). */
function Goals({ locale, day, closed, results }: { locale: Locale; day: string; closed: boolean; results: GoalResult[] }) {
  const c = minutoCopy(locale);
  const owner = useAuthStore((s) => (s.status === "authenticated" && s.user?.id ? s.user.id : "guest"));
  const [review, setReview] = useState<MinutoReview | null>(null);
  const cards = useMemo(() => (typeof window === "undefined" ? {} : loadCards(day, owner)), [day, owner]);
  useEffect(() => {
    if (!closed) return;
    let cancelled = false;
    minutoApi.review(day, locale).then((data) => { if (!cancelled) setReview(data); }).catch(() => {});
    return () => { cancelled = true; };
  }, [closed, day, locale]);
  const cardOf = (id: string) => cards[id] ?? review?.goals.find((g) => g.goal.id === id)?.goal ?? null;
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-lg font-bold uppercase" style={poppins}>{c.end.answers}</h2>
      <ol className="flex flex-col gap-1.5">
        {results.map((r, i) => {
          const card = cardOf(r.goal);
          return (
            <li key={r.goal} className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-2.5 py-2">
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-black tabular-nums", TONE_CHIP[resultTone(r)])} style={poppins}>{r.points}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{card ? nameFor(card.scorer.name, locale) : `#${i + 1}`}</p>
                {card && <p className="truncate text-[11px] text-white/50">{nameFor(card.home.name, locale)} {card.score[0]}-{card.score[1]} {nameFor(card.away.name, locale)} · {card.year}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-black tabular-nums text-brand-green-light" style={poppins}>{formatMinute(r.answer)}</p>
                <p className="text-[10px] text-white/45">{c.end.you}: {r.guess}&apos;</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
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

function Archive({ locale, days, lockedLiveDay, versions, today, current, currentState, onBack, onOpen }: {
  locale: Locale; days: string[]; lockedLiveDay: string | null; versions?: Record<string, number>; today: string; current: string; currentState: MinutoRunState | null;
  onBack: () => void; onOpen: (day: string) => void;
}) {
  const c = minutoCopy(locale);
  const owner = useAuthStore((s) => (s.status === "authenticated" && s.user?.id ? s.user.id : "guest"));
  const scores = useMemo(() => finishedScores(days, owner, versions), [days, owner, versions]);
  const unfinished = useMemo(() => inProgressDays(days, owner, versions), [days, owner, versions]);
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label={c.archive.back} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
        <h2 className="text-2xl font-black uppercase" style={poppins}>{c.archive.title}</h2>
      </header>
      {lockedLiveDay && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-brand-yellow/60 bg-brand-yellow/10 px-4 py-3">
          <span className="font-black" style={poppins}>#{puzzleNumber(lockedLiveDay)} <span className="ml-2 text-xs font-bold text-white/55">{c.archive.today}</span></span>
          <SignInLink placement="minuto_archive" modeId="minuto" returnTo="/minuto" className="inline-flex h-9 items-center rounded-full bg-brand-yellow px-4 text-xs font-black uppercase text-black hover:bg-brand-yellow-deep">{c.playToday}</SignInLink>
        </div>
      )}
      <ul className="mt-4 flex flex-col gap-2">
        {days.map((d) => {
          const score = d === current && currentState?.done ? currentState.score : scores[d];
          const started = (d === current && currentState && !currentState.done) || unfinished.has(d);
          return (
            <li key={d}>
              <button type="button" onClick={() => onOpen(d)} className={cn("flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left hover:bg-white/10", d === current ? "border-brand-green-light bg-white/[0.08]" : "border-white/10 bg-white/[0.05]")}>
                <span className="font-black" style={poppins}>#{puzzleNumber(d)} <span className="ml-2 text-xs font-bold text-white/55">{d === today ? c.archive.today : d}</span></span>
                <span className={cn("text-sm font-bold", score !== undefined ? "text-brand-green-light" : "text-white/45")}>{score !== undefined ? c.archive.played(score) : started ? c.archive.inProgress : c.archive.notPlayed}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
