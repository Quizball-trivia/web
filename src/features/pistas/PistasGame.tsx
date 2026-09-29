"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CalendarDays, ChevronRight, Copy, Flag, Footprints, Globe2, Lightbulb, Lock, Share2, Shirt, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useUserPreferences } from "@/lib/preferences/userPreferences";
import { playSfx } from "@/lib/sounds/gameSounds";
import { peekGuestToken } from "@/lib/guest/guestSession";
import type { EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { findPublicGameByModeId, relatedPublishedGames } from "@/lib/seo/public-games";
import { PublicCardGrid } from "@/features/marketing/public/PublicCards";
import { SignInLink } from "@/features/marketing/public/PublicLinks";
import type { Locale } from "@/lib/i18n/locale";
import { PistasApiError, pistasApi, type PistasReview, type PistasRun, type PistasRunState } from "@/lib/repositories/pistas.repo";
import {
  CLUES_PER_ROUND, MAX_SCORE, addDays, isClosedDay, isLiveDay, playableDays, pointsFor, puzzleNumber, releaseDay, resultGrid, resultTone,
  type PistasClue, type ResultTone, type RoundResult,
} from "./pistas.logic";
import { clearRun, finishedFromServer, finishedScores, inProgressDays, loadRun, saveRun, streakFrom } from "./pistas.storage";
import { pistasCopy, textFor } from "./pistas.copy";
import { TONE_BAR, TONE_CHIP, TONE_ON_CARD } from "./pistas.tones";
import { encodePistasShare } from "./pistas.share";
import { PistasLeaderboard } from "./PistasLeaderboard";
import { PlayWithFriendButton } from "@/features/duel/PlayWithFriendButton";
import { trackActionError, trackArchiveOpen, trackLoadError, trackReport, trackRoundEnd, trackRunComplete, trackRunStart, trackShare } from "./pistas.analytics";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;
type View = "intro" | "play" | "end" | "archive";

const startedOn = (state: PistasRunState): boolean => state.round > 0 || state.revealed > 1 || state.results.length > 0 || state.wrongGuesses > 0;

export function PistasGame({ locale, onExit, onEvent, initialDay, onDay }: {
  locale: Locale;
  onExit?: () => void;
  onEvent?: (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => void;
  /** The board being shown changed (the public page keeps it in its URL so a reload reopens it). */
  onDay?: (day: string) => void;
  /** A past day from the archive link (?dia=); ignored when it isn't playable. */
  initialDay?: string | null;
}) {
  const c = pistasCopy(locale);
  const [today, setToday] = useState(() => releaseDay());
  const [versions, setVersions] = useState<Record<string, number> | null | undefined>(undefined);
  /** Bumped to re-read the published boards, e.g. after a content correction (content_changed). */
  const [boardsAttempt, setBoardsAttempt] = useState(0);
  const firstTodayRef = useRef(today);
  // Calendar-eligible days that the server has actually published (a missing day is never offered).
  const days = useMemo(() => playableDays(today).filter((d) => !versions || d in versions), [today, versions]);
  const [chosenDay, setChosenDay] = useState<string | null>(initialDay ?? null);
  const [lockedDay, setLockedDay] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  /** A reload in the middle of a board goes straight back to it (owner:day), once. */
  const [resumeKey, setResumeKey] = useState<string | null>(null);
  const replayPendingRef = useRef(false);
  /** Same-tick clicks all see the same `pending` state, so the in-flight guard has to be a ref. */
  const inFlightRef = useRef(false);
  const serverCheckedRef = useRef(new Set<string>());
  const currentDayRef = useRef<string | null>(null);
  const currentOwnerRef = useRef<string | null>(null);
  const stillCurrent = (requestOwner: string, requestDay: string) => currentOwnerRef.current === requestOwner && currentDayRef.current === requestDay;
  const authStatus = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id);
  const owner = authStatus === "authenticated" && userId ? userId : "guest";
  const authReady = authStatus !== "loading";
  const newest = days[0] ?? null;
  const guestLockedOut = owner === "guest" && newest !== null && !isClosedDay(newest, today);
  // Guests only open closed days; members also open today's (ranked) board.
  const openableDays = useMemo(() => (owner === "guest" ? days.filter((d) => isClosedDay(d, today)) : days), [days, owner, today]);
  const openable = (d: string | null) => (d && openableDays.includes(d) ? d : null);
  const day = openable(chosenDay) ?? openable(lockedDay) ?? openableDays[0] ?? null;
  const guestOnPastBoard = owner === "guest" && day !== null && isClosedDay(day, today);
  // A run is only ever shown (or saved) for the player and board it belongs to: a day or account switch can't leak it.
  const [entry, setEntry] = useState<{ owner: string; day: string; run: PistasRun } | null>(null);
  const run = entry && entry.owner === owner && entry.day === day ? entry.run : null;
  const setRun = (next: PistasRun | null) => setEntry(next && day ? { owner, day, run: next } : null);
  const [view, setView] = useState<View>("intro");
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [boardRefresh, setBoardRefresh] = useState(0);
  const contentVersion = day && versions ? versions[day] : undefined;
  const state = run?.state ?? null;
  useEffect(() => { currentDayRef.current = day; }, [day]);
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
    // After a correction or a new Argentine day the cached index is stale.
    pistasApi.boards(boardsAttempt > 0 || today !== firstTodayRef.current)
      .then((data) => { if (!cancelled) setVersions(data.days ?? {}); })
      .catch((error: unknown) => {
        if (cancelled) return;
        setVersions(null);
        trackLoadError({ puzzleId: "boards", status: error instanceof PistasApiError ? error.status : null });
      });
    return () => { cancelled = true; };
  }, [boardsAttempt, today]);

  // The cached run on this device drives the intro ("continue", finished score); the server stays the source of truth.
  useEffect(() => {
    if (!authReady || !day || contentVersion === undefined) return;
    const saved = loadRun(day, contentVersion, owner);
    const mine = saved && saved.state.day === day ? saved : null;
    setEntry(mine ? { owner, day, run: mine } : null);
    setView(mine?.state.done ? "end" : "intro");
    setResumeKey(mine && !mine.state.done && startedOn(mine.state) ? `${owner}:${day}` : null);
  }, [authReady, contentVersion, day, owner]);

  // A board finished elsewhere (new device, cleared storage) shows as finished here too: one server lookup per board and player, never the whole archive.
  useEffect(() => {
    if (!authReady || !day || contentVersion === undefined) return;
    const checkKey = `${owner}:${day}:${contentVersion}`;
    if (serverCheckedRef.current.has(checkKey) || day in finishedScores([day], owner, { [day]: contentVersion })) return;
    // A guest without a session has no run anywhere to look up.
    if (owner === "guest" && !peekGuestToken()) return;
    serverCheckedRef.current.add(checkKey);
    pistasApi.current(day, locale)
      .then((data) => {
        if (currentOwnerRef.current !== owner || currentDayRef.current !== day) return;
        setEntry((prev) => {
          const finished = finishedFromServer(prev && prev.owner === owner && prev.day === day ? prev.run : null, data);
          return finished ? { owner, day, run: finished } : prev;
        });
      })
      .catch(() => { serverCheckedRef.current.delete(checkKey); });
  }, [authReady, contentVersion, day, locale, owner]);

  useEffect(() => {
    if (!entry) return;
    const version = versions?.[entry.day];
    if (version !== undefined) saveRun(entry.day, version, entry.run, entry.owner);
  }, [entry, versions]);

  const { soundEnabled } = useUserPreferences();
  const cue = useCallback((name: "correctRanked" | "wrongAnswer") => { if (soundEnabled) playSfx(name); }, [soundEnabled]);

  const apply = (next: PistasRun) => {
    const settled = next.state.settled;
    if (day && settled && !state?.settled) {
      trackRoundEnd({ puzzleId: day, contentVersion: contentVersion ?? 0, round: next.state.round + 1, outcome: settled.outcome, clues: settled.clues, points: settled.points, wrongGuesses: next.state.wrongGuesses });
      cue(settled.outcome === "solved" ? "correctRanked" : "wrongAnswer");
    } else if (next.state.wrongGuesses > (state?.wrongGuesses ?? 0)) {
      cue("wrongAnswer");
    }
    setRun(next);
    if (day && next.state.done && state && !state.done) {
      onEvent?.("complete", { score: next.state.score });
      trackRunComplete({ puzzleId: day, ranked: next.state.ranked, score: next.state.score, solved: next.state.solved, rank: next.state.rank ?? null });
      if (next.state.ranked) setBoardRefresh((n) => n + 1);
    }
  };

  /** One server action at a time; an outdated run is re-synced from the server's copy. */
  const act = async (key: string, call: () => Promise<PistasRun | null>) => {
    if (inFlightRef.current || !day) throw new Error("action_in_flight");
    inFlightRef.current = true;
    setPending(key);
    setNotice(null);
    const requestOwner = owner;
    const requestDay = day;
    try {
      const result = await call();
      if (!stillCurrent(requestOwner, requestDay)) return;
      if (result) apply(result);
    } catch (error) {
      if (!stillCurrent(requestOwner, requestDay)) return;
      const code = error instanceof PistasApiError ? error.message : null;
      const status = error instanceof PistasApiError ? error.status : null;
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
        const closed = openableDays.find((d) => isClosedDay(d, today));
        if (closed) {
          setChosenDay(closed);
          setLockedDay(null);
        }
        setView("intro");
        setNotice(c.guestYesterday);
      } else if (status === 503) {
        setNotice(c.maintenance);
      } else if (code === "stale_state" && run) {
        try {
          const current = await pistasApi.start(requestDay, contentVersion, locale);
          if (!stillCurrent(requestOwner, requestDay)) return;
          setRun(current);
          setView(current.state.done ? "end" : "play");
        } catch {
          if (stillCurrent(requestOwner, requestDay)) setNotice(c.actionError);
        }
      } else if (status === 409 || status === 401 || status === 403 || status === 404) {
        replayPendingRef.current ||= startedRef.current;
        startedRef.current = false;
        clearRun(day, owner);
        setRun(null);
        setView("intro");
        setNotice(status === 409 ? c.restarted : c.sessionChanged);
        // The server holds corrected content: re-read the boards so the next start uses the new version.
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
    setLockedDay(requestedDay);
    void act("start", async () => {
      const fresh = await pistasApi.start(requestedDay, contentVersion, locale);
      if (!stillCurrent(requestOwner, requestedDay)) return null;
      markStarted();
      trackRunStart({ puzzleId: requestedDay, contentVersion: contentVersion ?? 0, ranked: fresh.state.ranked, resumed: fresh.state.round > 0 || fresh.state.revealed > 1 || fresh.state.results.length > 0, round: fresh.state.round + 1 });
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

  const reveal = () => { if (run) void act("reveal", () => pistasApi.reveal(run, locale)).catch(() => {}); };
  const guess = (text: string) => (run ? act("guess", () => pistasApi.guess(run, text, locale)) : Promise.resolve());
  const giveUp = () => { if (run) void act("giveup", () => pistasApi.giveUp(run, locale)).catch(() => {}); };
  const advance = () => {
    if (!run) return;
    if (run.state.done) {
      setView("end");
      scrollRef.current?.scrollTo({ top: 0 });
      return;
    }
    void act("next", () => pistasApi.next(run, locale)).then(() => scrollRef.current?.scrollTo({ top: 0 })).catch(() => {});
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
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6 pt-3">
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
            {guestLockedOut && <SignInLink placement="pistas_intro" modeId="pistas" returnTo="/pistas" className="mt-4 inline-flex h-10 items-center rounded-full bg-brand-yellow px-5 text-xs font-black uppercase text-black hover:bg-brand-yellow-deep">{c.playToday}</SignInLink>}
            {onExit && <ExitLink label={c.exit} onExit={onExit} />}
          </Centered>
        ) : view === "archive" ? (
          <Archive locale={locale} days={openableDays} lockedLiveDay={guestLockedOut ? newest : null} versions={versions} today={today} current={day} currentState={state} onBack={() => setView(state?.done ? "end" : "intro")} onOpen={openDay} />
        ) : view === "end" && state ? (
          <EndScreen locale={locale} day={day} today={today} state={state} days={days} versions={versions} boardRefresh={boardRefresh} guestOnPastBoard={guestOnPastBoard} onArchive={() => setView("archive")} onExit={onExit} />
        ) : view === "play" && state ? (
          <Play key={`${run?.run.id ?? "run"}-${state.round}`} locale={locale} day={day} contentVersion={contentVersion ?? 0} state={state} pending={pending} notice={notice} onReveal={reveal} onGuess={guess} onGiveUp={giveUp} onNext={advance} onExit={onExit} />
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

function Brand({ locale, className }: { locale: Locale; className?: string }) {
  const c = pistasCopy(locale);
  return (
    <p className={cn("font-black uppercase tracking-tight", className)} style={poppins}>
      {c.brandA} <span className="text-brand-green-light">{c.brandB}</span>
    </p>
  );
}

export function Intro({ locale, number, state, busy, notice, guestOnPastBoard, guestLockedOut, onStart, onArchive, onExit }: {
  locale: Locale; number: number; state: PistasRunState | null; busy: boolean; notice: string | null; guestOnPastBoard: boolean; guestLockedOut: boolean;
  onStart: () => void; onArchive: () => void; onExit?: () => void;
}) {
  const c = pistasCopy(locale);
  const inProgress = Boolean(state && !state.done && startedOn(state));
  const finished = Boolean(state?.done);
  return (
    <div className="flex flex-1 flex-col">
      {onExit && (
        <header className="mb-6 flex h-10 items-center">
          <button type="button" onClick={onExit} aria-label={c.exit} className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
        </header>
      )}
      <div className="flex flex-1 flex-col justify-center">
        <Brand locale={locale} className="text-3xl leading-none" />
        <p className="mt-2 text-sm font-bold text-white/60" style={poppins}>#{number}</p>
        {guestOnPastBoard && guestLockedOut && notice !== c.guestYesterday && (
          <div className="mt-4 rounded-2xl border border-brand-yellow/60 bg-brand-yellow/10 px-4 py-3">
            <p className="text-sm text-white/90">{c.guestYesterday}</p>
            <SignInLink placement="pistas_intro" modeId="pistas" returnTo="/pistas" className="mt-2 inline-flex h-9 items-center rounded-full bg-brand-yellow px-4 text-xs font-black uppercase text-black hover:bg-brand-yellow-deep">{c.playToday}</SignInLink>
          </div>
        )}
        <div className="relative mt-5 aspect-video w-full overflow-hidden rounded-2xl bg-game-art-night" aria-hidden>
          <Image src="/assets/demos/game-modes/pistas.webp" alt="" fill sizes="(max-width: 480px) 100vw, 448px" className="object-cover" priority />
        </div>
        <ul className="mt-6 space-y-2.5">
          {c.intro.lines.map((line) => (
            <li key={line} className="flex gap-2.5 text-[15px] leading-snug text-white/85"><span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-green-light" />{line}</li>
          ))}
        </ul>
        {notice && <p role="alert" className="mt-6 rounded-xl bg-brand-red-soft/20 px-3 py-2 text-sm font-semibold text-white">{notice}</p>}
        <button type="button" onClick={onStart} disabled={busy} className="mt-8 h-14 rounded-full bg-brand-green text-base font-black uppercase tracking-wide text-white hover:bg-brand-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-60" style={poppins}>
          {busy ? c.loading : finished ? c.finish : inProgress && state ? c.intro.resume(state.round + 1) : c.intro.start}
        </button>
        <PlayWithFriendButton game="pistas" locale={locale} className="mt-3" />
        <button type="button" onClick={onArchive} disabled={busy} className="mt-3 h-11 rounded-full bg-white/10 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/15 disabled:opacity-50" style={poppins}>{c.intro.past}</button>
        <p className="mt-4 text-center text-xs text-white/50">{c.intro.newBoard}</p>
      </div>
    </div>
  );
}

/** The chip shown next to a revealed clue, like the badges on the stream's screen. */
/** Labelled chips sit in the summary (like the stream's icon row); ladder rows use the compact square. */
function ClueIcon({ clue, locale, compact = false }: { clue: PistasClue; locale: Locale; compact?: boolean }) {
  const c = pistasCopy(locale);
  const base = cn("flex h-7 shrink-0 items-center justify-center gap-1 rounded-lg text-[10px] font-black uppercase", compact ? "w-7" : "min-w-7 px-1.5");
  const label = (text: string | null | undefined) => (compact ? null : text);
  if (clue.kind === "confed") return <span className={cn(base, "bg-brand-blue text-white")}><Globe2 className="size-3.5" />{label(clue.icon)}</span>;
  if (clue.kind === "position") return <span className={cn(base, "bg-brand-green text-white")}><Shirt className="size-3.5" />{label(c.positions[clue.icon ?? ""] ?? clue.icon)}</span>;
  if (clue.kind === "foot") return <span className={cn(base, "bg-brand-purple text-white")}><Footprints className={cn("size-3.5", clue.icon === "left" && "-scale-x-100")} />{label(c.feet[clue.icon ?? ""])}</span>;
  if (clue.kind === "decade") return <span className={cn(base, "bg-brand-orange text-white")}><CalendarDays className="size-3.5" />{label(clue.icon ? `${String(clue.icon).slice(2)}s` : "")}</span>;
  return <span className={cn(base, "w-7 bg-white/10 px-0 text-brand-yellow")}><Lightbulb className="size-3.5" /></span>;
}

export function Play({ locale, day, contentVersion, state, pending, notice, onReveal, onGuess, onGiveUp, onNext, onExit }: {
  locale: Locale; day: string; contentVersion: number; state: PistasRunState; pending: string | null; notice: string | null;
  onReveal: () => void; onGuess: (text: string) => Promise<void>; onGiveUp: () => void; onNext: () => void; onExit?: () => void;
}) {
  const c = pistasCopy(locale);
  const [text, setText] = useState("");
  const [reported, setReported] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const newestClueRef = useRef<HTMLLIElement>(null);
  const revealRowRef = useRef<HTMLLIElement>(null);
  const panelObserverRef = useRef<ResizeObserver | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const settled = state.settled;
  const roundKey = `${day}-${state.round}`;
  const iconClues = state.clues.filter((clue) => clue.kind !== "fact");
  const ceiling = state.ceiling ?? CLUES_PER_ROUND;
  const cluesLeft = Math.max(0, ceiling - state.revealed);

  useEffect(() => {
    if (settled) nextRef.current?.focus({ preventScroll: true });
    else inputRef.current?.focus({ preventScroll: true });
  }, [settled, roundKey]);

  // The bottom panel is sticky and grows (wrong-guess banner, result card): measure it so rows can keep clear of it. Callback ref, not useEffect+useRef.
  const panelRef = useCallback((node: HTMLDivElement | null) => {
    panelObserverRef.current?.disconnect();
    panelObserverRef.current = null;
    if (!node) return;
    const update = () => setPanelHeight(Math.round(node.getBoundingClientRect().height));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    panelObserverRef.current = observer;
  }, []);

  // Keep the newest clue and the next "reveal" row above the panel after every reveal, wrong guess or settle (scroll-margin below holds the panel's height).
  const clueCount = state.clues.length;
  useEffect(() => {
    newestClueRef.current?.scrollIntoView({ block: "nearest" });
    revealRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [roundKey, clueCount, state.wrongGuesses, settled, panelHeight]);
  const clearOfPanel = { scrollMarginBottom: panelHeight + 8 };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || pending || settled) return;
    onGuess(value).then(() => setText("")).catch(() => {});
  };
  const report = () => {
    trackReport({ puzzleId: day, contentVersion, round: state.round + 1, revealed: state.revealed, locale });
    setReported(roundKey);
  };

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3">
        {onExit && (
          <button type="button" onClick={onExit} aria-label={c.exit} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-4" /></button>
        )}
        <Brand locale={locale} className="min-w-0 flex-1 truncate text-[13px]" />
        <span className="shrink-0 text-xs font-black uppercase tabular-nums text-white/80" style={poppins}>{c.player(state.round + 1, state.totalRounds)}</span>
      </header>

      <ol className="mt-3 flex gap-1" aria-hidden>
        {Array.from({ length: state.totalRounds }, (_, i) => {
          const result: RoundResult | null | undefined = state.results[i];
          return (
            <li key={i} className={cn("h-1.5 flex-1 rounded-full", result ? TONE_BAR[resultTone(result)] : i === state.round ? "bg-white/60" : "bg-white/15")} />
          );
        })}
      </ol>

      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-2">
        <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-yellow text-black">
          <motion.span key={settled ? "s" : state.pointsInPlay} initial={{ scale: 1.25 }} animate={{ scale: 1 }} className="text-2xl font-black leading-none tabular-nums" style={poppins}>
            {settled ? settled.points : state.pointsInPlay}
          </motion.span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-wide text-white/60" style={poppins}>{settled ? c.end.score : c.pointsInPlay}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <AnimatePresence initial={false}>
              {iconClues.map((clue, i) => (
                <motion.span key={`${roundKey}-${i}`} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}>
                  <ClueIcon clue={clue} locale={locale} />
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-bold uppercase text-white/50">{c.score}</p>
          <p className="text-lg font-black tabular-nums" style={poppins}>{state.score}</p>
        </div>
      </div>

      <ol className="mt-3 flex flex-col gap-1.5" aria-label={c.kinds.fact}>
        {Array.from({ length: CLUES_PER_ROUND }, (_, i) => {
          const n = i + 1;
          const clue = state.clues[i];
          const points = pointsFor(n);
          const isNext = !clue && n === state.revealed + 1;
          const beyondCeiling = n > ceiling;
          if (clue) {
            return (
              <motion.li key={`${roundKey}-c${n}`} ref={n === clueCount ? newestClueRef : undefined} style={clearOfPanel} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 rounded-xl border border-brand-green-light/35 bg-brand-green-light/[0.08] py-1.5 pl-1.5 pr-2">
                <ClueIcon clue={clue} locale={locale} compact />
                <p className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug text-white/95">{textFor(clue.text, locale)}</p>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-[11px] font-black tabular-nums text-white/70" style={poppins}>{points}</span>
              </motion.li>
            );
          }
          if (isNext && !settled && state.canReveal) {
            return (
              <li key={`${roundKey}-next`} ref={revealRowRef} style={clearOfPanel}>
                <button type="button" onClick={onReveal} disabled={pending !== null} className="flex h-10 w-full items-center gap-2 rounded-xl border border-dashed border-white/35 bg-white/[0.06] pl-3 pr-2 text-left text-[13px] font-black uppercase tracking-wide text-white hover:border-white/60 hover:bg-white/10 disabled:opacity-60" style={poppins}>
                  <ChevronRight className="size-4 text-brand-green-light" />
                  <span className="flex-1">{pending === "reveal" ? c.loading : c.revealClue}</span>
                  <span className="flex size-6 items-center justify-center rounded-md bg-brand-yellow text-[11px] text-black tabular-nums">{points}</span>
                </button>
              </li>
            );
          }
          return (
            <li key={`${roundKey}-l${n}`} aria-label={c.clueLocked} className={cn("flex h-8 items-center gap-2 rounded-xl border border-white/[0.06] bg-black/20 pl-3 pr-2", beyondCeiling && "opacity-35")}>
              <Lock className="size-3 text-white/30" />
              <span className={cn("flex-1", beyondCeiling && "h-px bg-white/20")} />
              <span className="flex size-6 items-center justify-center rounded-md text-[11px] font-black tabular-nums text-white/35" style={poppins}>{points}</span>
            </li>
          );
        })}
      </ol>

      <div ref={panelRef} className="sticky bottom-0 mt-auto bg-gradient-to-t from-surface-page-alt via-surface-page-alt/95 to-transparent pb-1 pt-4">
        {notice && <p role="alert" className="mb-2 rounded-xl bg-brand-red-soft/20 px-3 py-2 text-center text-sm font-semibold">{notice}</p>}
        {settled ? (
          <div className="flex flex-col gap-2">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} role="status" className={cn("rounded-2xl px-4 py-3 text-center", settled.outcome === "solved" ? "bg-brand-green/25" : "bg-brand-red-soft/20")}>
              <p className={cn("text-base font-black", settled.outcome === "solved" ? "text-brand-green-light" : "text-brand-red-soft")} style={poppins}>
                {settled.outcome === "solved" ? c.solved(settled.points) : c.missed}
              </p>
              {settled.answer ? (
                <p className="mt-0.5 text-lg font-black uppercase" style={poppins}>{c.was(textFor(settled.answer.display, locale))}</p>
              ) : (
                <p className="mt-0.5 text-[12px] text-white/65">{c.revealLater}</p>
              )}
            </motion.div>
            <button ref={nextRef} type="button" onClick={onNext} disabled={pending !== null} className="h-14 rounded-full bg-brand-green text-base font-black uppercase tracking-wide text-white hover:bg-brand-green-deep disabled:opacity-60" style={poppins}>
              {state.done ? c.finish : c.next}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-2">
            <AnimatePresence>
              {state.wrongGuesses > 0 && (
                <motion.div key={`wrong-${roundKey}`} initial={{ opacity: 0, x: 0 }} animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }} transition={{ duration: 0.35 }} role="alert" className="flex items-center gap-2 rounded-xl border border-brand-red-soft/70 bg-brand-red-soft/15 px-3 py-2">
                  <X className="size-4 shrink-0 text-brand-red-soft" strokeWidth={3} />
                  <p className="text-[12.5px] font-semibold leading-snug"><span className="font-black uppercase text-brand-red-soft">{c.wrong}</span> · {c.lastChance(cluesLeft)}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="pistas-guess" className="shrink-0 text-[11px] font-black uppercase tracking-wide text-white/60" style={poppins}>{c.inputLabel}</label>
              <span id="pistas-guess-hint" className="truncate text-[10.5px] text-white/40">{c.inputHint}</span>
            </div>
            <div className="flex gap-2">
              <input
                id="pistas-guess"
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 60))}
                placeholder={c.inputPlaceholder}
                aria-describedby="pistas-guess-hint"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="words"
                spellCheck={false}
                enterKeyHint="go"
                className="h-12 min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 text-base font-bold text-white placeholder:text-white/35 focus:border-brand-green-light focus:outline-none"
              />
              <button type="submit" disabled={!text.trim() || pending !== null} className="h-12 shrink-0 rounded-xl bg-brand-green px-4 text-sm font-black uppercase text-white hover:bg-brand-green-deep disabled:opacity-45" style={poppins}>
                {pending === "guess" ? "…" : c.guess}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <button type="button" onClick={onGiveUp} disabled={pending !== null} className="text-[12px] font-bold text-white/50 underline-offset-4 hover:text-white/80 hover:underline disabled:opacity-50">{c.giveUp}</button>
              <button type="button" onClick={report} disabled={reported === roundKey} className="flex items-center gap-1.5 text-[11px] font-semibold text-white/40 hover:text-white/70 disabled:text-white/60">
                <Flag className="size-3" /> {reported === roundKey ? c.reported : c.report}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function EndScreen({ locale, day, today, state, days, versions, boardRefresh, guestOnPastBoard, onArchive, onExit }: {
  locale: Locale; day: string; today: string; state: PistasRunState; days: string[]; versions?: Record<string, number>; boardRefresh: number; guestOnPastBoard: boolean;
  onArchive: () => void; onExit?: () => void;
}) {
  const c = pistasCopy(locale);
  const results = state.results;
  const score = state.score;
  const solved = results.filter((r) => r.outcome === "solved");
  const avgClues = solved.length ? (solved.reduce((sum, r) => sum + r.clues, 0) / solved.length).toFixed(1) : "–";
  const number = puzzleNumber(day);
  const grid = resultGrid(results);
  const owner = useAuthStore((s) => (s.status === "authenticated" && s.user?.id ? s.user.id : "guest"));
  const guest = owner === "guest";
  const streak = useMemo(() => streakFrom(days, { ...finishedScores(days, owner, versions), [day]: score }), [day, days, owner, score, versions]);
  const [copied, setCopied] = useState(false);
  const sharePath = `/r/${encodePistasShare(number, results, locale)}`;
  const shareUrl = typeof window === "undefined" ? sharePath : `${window.location.origin}${sharePath}`;
  const text = c.shareText(number, score, grid, shareUrl);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const self = findPublicGameByModeId("pistas");
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
          {results.map((r, i) => <li key={i} className="flex"><ResultChip result={r} tones={TONE_ON_CARD} className="h-7 w-full text-[11px]" /></li>)}
        </ol>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label={c.end.solved} value={`${solved.length}/10`} />
          <Stat label={c.end.avgClues} value={avgClues} />
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
      <PlayWithFriendButton game="pistas" locale={locale} className="mt-3" />
      <button type="button" onClick={onArchive} className="mt-3 h-11 rounded-full border border-white/15 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/10" style={poppins}>{c.end.past}</button>

      <Answers locale={locale} day={day} closed={closed} results={results} />

      {/* A past board still shows who is on top today: the reason to come back (and to sign in). */}
      <PistasLeaderboard locale={locale} day={live ? day : undefined} refreshKey={boardRefresh} placement="end" className="mt-4" />

      {related.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-bold uppercase" style={poppins}>{c.end.more}</h2>
          <PublicCardGrid games={related} locale={locale} surface="game_result" />
        </section>
      )}
    </div>
  );
}

/** Closed days list every answer (with how many clues the player used); a live day keeps them hidden until midnight. */
function Answers({ locale, day, closed, results }: { locale: Locale; day: string; closed: boolean; results: RoundResult[] }) {
  const c = pistasCopy(locale);
  const [review, setReview] = useState<PistasReview | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!closed) return;
    let cancelled = false;
    pistasApi.review(day, locale)
      .then((data) => { if (!cancelled) { setReview(data); setFailed(false); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [attempt, closed, day, locale]);
  // Right after midnight the database may not have closed the day yet: coming back to the tab retries.
  useEffect(() => {
    if (!failed) return;
    const retry = () => setAttempt((n) => n + 1);
    window.addEventListener("focus", retry);
    return () => window.removeEventListener("focus", retry);
  }, [failed]);

  return (
    <section className="mt-5">
      <h2 className="mb-2 text-lg font-bold uppercase" style={poppins}>{c.end.answers}</h2>
      {!closed ? (
        <p className="rounded-2xl bg-white/5 px-4 py-4 text-center text-sm text-white/70">{c.end.answersLater}</p>
      ) : failed && !review ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3">
          <p className="text-sm text-white/70">{c.loadError}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="h-9 shrink-0 rounded-full bg-brand-yellow px-4 text-xs font-black uppercase text-black" style={poppins}>{c.retry}</button>
        </div>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {results.map((r, i) => {
            const answer = review?.rounds.find((round) => round.number === i + 1)?.answer;
            return (
              <li key={i} className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-2.5 py-2">
                <ResultChip result={r} className="size-9 shrink-0 text-xs" />
                <span className={cn("min-w-0 flex-1 truncate text-sm font-bold", r.outcome === "solved" ? "text-white" : "text-white/60")}>{answer ? textFor(answer.display, locale) : "…"}</span>
                <span className="shrink-0 text-xs text-white/45">{r.outcome === "solved" ? c.end.clues(r.clues) : c.missed}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/** A round as a soft tinted chip: the points when solved, a dash when missed. */
function ResultChip({ result, tones = TONE_CHIP, className }: { result: RoundResult; tones?: Record<ResultTone, string>; className?: string }) {
  return (
    <span className={cn("flex items-center justify-center rounded-lg font-black tabular-nums", tones[resultTone(result)], className)} style={poppins}>
      {result.outcome === "solved" ? result.points : "–"}
    </span>
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
  locale: Locale; days: string[]; lockedLiveDay: string | null; versions?: Record<string, number>; today: string; current: string; currentState: PistasRunState | null;
  onBack: () => void; onOpen: (day: string) => void;
}) {
  const c = pistasCopy(locale);
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
          <SignInLink placement="pistas_archive" modeId="pistas" returnTo="/pistas" className="inline-flex h-9 items-center rounded-full bg-brand-yellow px-4 text-xs font-black uppercase text-black hover:bg-brand-yellow-deep">{c.playToday}</SignInLink>
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
