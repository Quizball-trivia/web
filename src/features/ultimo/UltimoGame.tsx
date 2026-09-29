"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, Copy, Crown, Flag, Share2, Timer, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { usePlayer } from "@/contexts/PlayerContext";
import { useUserPreferences } from "@/lib/preferences/userPreferences";
import { playSfx } from "@/lib/sounds/gameSounds";
import { peekGuestToken } from "@/lib/guest/guestSession";
import type { EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { SignInLink } from "@/features/marketing/public/PublicLinks";
import type { Locale } from "@/lib/i18n/locale";
import { DuelAvatar, seatAvatar } from "@/features/duel/DuelAvatar";
import { PlayWithFriendButton } from "@/features/duel/PlayWithFriendButton";
import { UltimoApiError, isNetworkFailure, ultimoApi, type UltimoAnswerResult, type UltimoRun, type UltimoRunState } from "@/lib/repositories/ultimo.repo";
import {
  CATEGORIES_PER_DAY, MAX_MISSES, REVEAL_MS, TIER_EMOJI, addDays, isClosedDay, isLiveDay, playableDays, puzzleNumber, releaseDay, tierOf,
  type CategoryResult, type Tier,
} from "./ultimo.logic";
import { textFor, ultimoCopy } from "./ultimo.copy";
import { encodeUltimoShare } from "./ultimo.share";
import { UltimoLeaderboard } from "./UltimoLeaderboard";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;
type View = "intro" | "play" | "end" | "archive";
/** A dropped connection usually comes back within a second: wait briefly before re-syncing (turns can be six seconds). */
const RECOVERY_DELAY_MS = 300;
const RESYNC_TIMEOUT_MS = 4_000;
/** Answers a fast typist can have waiting behind the one in flight. */
const MAX_QUEUED = 5;

interface ServerClock { serverMs: number; perfMs: number }
/** The server keeps an answer valid this long past its deadline; after it, the category is over. */
const GRACE_MS = 1_500;

/** Brand tiles, never red: a short list is still a result. */
const TIER_TILE: Record<Tier, string> = {
  complete: "bg-brand-yellow text-black",
  good: "bg-brand-green text-white",
  some: "bg-brand-blue text-white ring-1 ring-white/50",
  none: "bg-white/10 text-white/50",
};

type Feedback = { id: number; kind: UltimoAnswerResult; text: string; misses: number };

const startedOn = (s: UltimoRunState): boolean => s.open || s.results.length > 0 || s.settled !== null;
const freshCategory = (s: UltimoRunState): boolean => !s.done && !s.open && s.settled === null;

export function UltimoGame({ locale, onExit, onEvent, initialDay, onDay }: {
  locale: Locale;
  onExit?: () => void;
  onEvent?: (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => void;
  /** The board being shown changed (the public page keeps it in its URL so a reload reopens it). */
  onDay?: (day: string) => void;
  /** A past day from the archive link (?dia=); ignored when it isn't playable. */
  initialDay?: string | null;
}) {
  const c = ultimoCopy(locale);
  const [today, setToday] = useState(() => releaseDay());
  const [versions, setVersions] = useState<Record<string, number> | null | undefined>(undefined);
  const [boardsAttempt, setBoardsAttempt] = useState(0);
  const firstTodayRef = useRef(today);
  const days = useMemo(() => playableDays(today).filter((d) => !versions || d in versions), [today, versions]);
  const [chosenDay, setChosenDay] = useState<string | null>(initialDay ?? null);
  const authStatus = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id);
  const owner = authStatus === "authenticated" && userId ? userId : "guest";
  const authReady = authStatus !== "loading";
  const newest = days[0] ?? null;
  const guestLockedOut = owner === "guest" && newest !== null && !isClosedDay(newest, today);
  // Guests only open closed days; members also open today's (ranked) board.
  const openableDays = useMemo(() => (owner === "guest" ? days.filter((d) => isClosedDay(d, today)) : days), [days, owner, today]);
  const day = (chosenDay && openableDays.includes(chosenDay) ? chosenDay : null) ?? openableDays[0] ?? null;
  const guestOnPastBoard = owner === "guest" && day !== null && isClosedDay(day, today);
  const contentVersion = day && versions ? versions[day] : undefined;

  // A run is only ever shown for the player and board it belongs to: a day or account switch can't leak it.
  const [entry, setEntry] = useState<{ owner: string; day: string; run: UltimoRun } | null>(null);
  const run = entry && entry.owner === owner && entry.day === day ? entry.run : null;
  const state = run?.state ?? null;
  const [view, setView] = useState<View>("intro");
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [boardRefresh, setBoardRefresh] = useState(0);
  const feedbackId = useRef(0);
  /** The server's clock sampled with each response, against the monotonic clock: countdowns ignore device-clock jumps. */
  const [firstClock] = useState<ServerClock>(() => ({ serverMs: Date.now(), perfMs: performance.now() }));
  const clockRef = useRef<ServerClock>(firstClock);
  const [clock, setClock] = useState<ServerClock>(firstClock);
  const runRef = useRef<UltimoRun | null>(null);
  const inFlightRef = useRef(false);
  /** Answers typed while a move is in flight, sent in order; cleared when the category or run changes. */
  const queueRef = useRef<string[]>([]);
  /** The clock ran out while a move was in flight: re-sync right after it. */
  const expiryDueRef = useRef(false);
  const startedRef = useRef(false);
  const currentRef = useRef({ owner, day });
  useEffect(() => { currentRef.current = { owner, day }; }, [owner, day]);
  useEffect(() => { runRef.current = run; }, [run]);
  const stillCurrent = (o: string, d: string) => currentRef.current.owner === o && currentRef.current.day === d;
  const serverNow = () => clockRef.current.serverMs + (performance.now() - clockRef.current.perfMs);

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
    ultimoApi.boards(boardsAttempt > 0 || today !== firstTodayRef.current)
      .then((data) => { if (!cancelled) setVersions(data.days ?? {}); })
      .catch(() => { if (!cancelled) setVersions(null); });
    return () => { cancelled = true; };
  }, [boardsAttempt, today]);

  // What the server holds for this board and player drives the intro (continue, finished); a guest without a session has none.
  useEffect(() => {
    if (!authReady || !day || contentVersion === undefined) return;
    if (owner === "guest" && !peekGuestToken()) return;
    let cancelled = false;
    ultimoApi.current(day, locale)
      .then((data) => {
        if (cancelled || !("state" in data) || !accept(data)) return;
        setEntry({ owner, day, run: data });
        if (data.state.done) setView((v) => (v === "intro" ? "end" : v));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [authReady, contentVersion, day, locale, owner]);

  const onDayRef = useRef(onDay);
  useEffect(() => { onDayRef.current = onDay; }, [onDay]);
  useEffect(() => { if (day) onDayRef.current?.(day); }, [day]);

  const { soundEnabled } = useUserPreferences();
  const sfx = useCallback((name: "correctRanked" | "wrongAnswer" | "whistle") => { if (soundEnabled) playSfx(name); }, [soundEnabled]);

  /**
   * The one gate every response passes: only a newer version of this run (or another run) replaces what is shown, so a
   * slow read can never rewind a category whose clock already runs.
   */
  const accept = (next: UltimoRun): boolean => {
    const current = runRef.current;
    if (current && current.run.id === next.run.id && next.run.version < current.run.version) return false;
    clockRef.current = { serverMs: Date.parse(next.state.serverNow), perfMs: performance.now() };
    setClock(clockRef.current);
    if (current && (current.run.id !== next.run.id || current.state.category !== next.state.category || !next.state.open)) queueRef.current = [];
    runRef.current = next;
    return true;
  };

  const apply = (next: UltimoRun, result?: UltimoAnswerResult, typed?: string) => {
    const before = runRef.current?.state ?? null;
    if (!accept(next)) return;
    if (day) setEntry({ owner, day, run: next });
    if (result && result !== "ok") {
      setFeedback({ id: ++feedbackId.current, kind: result, text: typed ?? "", misses: next.state.misses });
      if (result === "wrong" || result === "repeat") sfx("wrongAnswer");
    } else if (result === "ok") {
      setFeedback({ id: ++feedbackId.current, kind: "ok", text: textFor(next.state.said.at(-1) ?? null, locale), misses: 0 });
      sfx("correctRanked");
    }
    if (next.state.settled && !before?.settled) sfx("whistle");
    if (next.state.done && before && !before.done) {
      onEvent?.("complete", { score: next.state.score });
      if (next.state.ranked) setBoardRefresh((n) => n + 1);
    }
  };

  /** What a refused move means for the screen (every move and every re-sync ends up here). */
  const handleError = (error: unknown, d: string) => {
    const code = error instanceof UltimoApiError ? error.message : null;
    const status = error instanceof UltimoApiError ? error.status : null;
    queueRef.current = [];
    if (code === "day_over") {
      setToday((t) => (t > d ? t : addDays(d, 1)));
      setChosenDay(null);
      setEntry(null);
      setView("intro");
      setNotice(c.dayOver);
    } else if (code === "sign_in_for_today") {
      setEntry(null);
      setView("intro");
      setNotice(c.guestYesterday);
    } else if (status === 503) {
      setNotice(c.maintenance);
    } else if (code === "content_changed") {
      setEntry(null);
      setView("intro");
      setNotice(c.restarted);
      setVersions(undefined);
      setBoardsAttempt((n) => n + 1);
    } else if (status === 401 || status === 403) {
      setEntry(null);
      setView("intro");
      setNotice(c.sessionChanged);
    } else {
      setNotice(c.actionError);
    }
  };

  /** The server's copy of the run (after a lost answer, a stale version or an expired clock), retried; never a blind resend. */
  const resync = async (o: string, d: string) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const current = await ultimoApi.start(d, contentVersion, locale, RESYNC_TIMEOUT_MS);
        if (stillCurrent(o, d)) { apply(current); setNotice(null); }
        return;
      } catch (error) {
        if (!stillCurrent(o, d)) return;
        if (!isNetworkFailure(error)) { handleError(error, d); return; }
        setNotice(c.connection);
        await new Promise((resolve) => window.setTimeout(resolve, RECOVERY_DELAY_MS * (attempt + 1)));
      }
    }
    if (stillCurrent(o, d)) setNotice(c.actionError);
  };

  /** Next in line once nothing is in flight: an expiry re-sync first, then the typed answers in order. */
  const pump = () => {
    if (inFlightRef.current) return;
    if (expiryDueRef.current) {
      expiryDueRef.current = false;
      void exclusive("sync", async () => { const { owner: o, day: d } = currentRef.current; if (d) await resync(o, d); });
      return;
    }
    const text = queueRef.current.shift();
    const current = runRef.current;
    if (text && current?.state.open) void act("answer", () => ultimoApi.answer(current, text, locale), text);
  };

  /** One server call at a time (moves and re-syncs alike). */
  const exclusive = async <T,>(key: string, fn: () => Promise<T>): Promise<T | null> => {
    if (inFlightRef.current) return null;
    inFlightRef.current = true;
    setPending(key);
    try {
      return await fn();
    } finally {
      inFlightRef.current = false;
      setPending(null);
      window.setTimeout(pump, 0);
    }
  };

  const act = (key: string, call: () => Promise<(UltimoRun & { result?: UltimoAnswerResult }) | null>, typed?: string) => {
    if (!day) return Promise.resolve(null);
    const o = owner;
    const d = day;
    return exclusive(key, async () => {
      setNotice(null);
      try {
        const result = await call();
        if (result && stillCurrent(o, d)) apply(result, result.result, typed);
        return result;
      } catch (error) {
        if (!stillCurrent(o, d)) return null;
        if (isNetworkFailure(error) || (error instanceof UltimoApiError && error.message === "stale_state")) {
          if (isNetworkFailure(error)) setNotice(c.connection);
          await new Promise((resolve) => window.setTimeout(resolve, RECOVERY_DELAY_MS));
          await resync(o, d);
        } else {
          handleError(error, d);
        }
        return null;
      }
    });
  };

  const begin = () => act("begin", () => (runRef.current ? ultimoApi.begin(runRef.current, locale) : Promise.resolve(null)));

  const play = async () => {
    if (!day) return;
    if (state?.done) { setView("end"); return; }
    if (!startedRef.current) { startedRef.current = true; onEvent?.("start"); }
    const fresh = await act("start", () => ultimoApi.start(day, contentVersion, locale));
    if (!fresh) return;
    setView(fresh.state.done ? "end" : "play");
    // A category is started only by a click: a reload never burns its clock.
    if (freshCategory(fresh.state)) await begin();
  };

  const say = (text: string) => {
    const value = text.trim();
    if (!value || !runRef.current?.state.open) return;
    if (queueRef.current.length < MAX_QUEUED) queueRef.current.push(value);
    pump();
  };

  const nextCategory = async () => {
    const current = runRef.current;
    if (!current) return;
    if (current.state.done) { setView("end"); return; }
    setFeedback(null);
    const moved = await act("next", () => ultimoApi.next(current, locale));
    if (moved && freshCategory(moved.state)) await begin();
  };

  // The clock ran out (past the grace): the server settles it. Ask for its copy (after any move in flight).
  const deadline = state?.open ? state.deadline : null;
  useEffect(() => {
    if (!deadline || !day) return;
    const wait = Date.parse(deadline) + GRACE_MS + 250 - serverNow();
    const timer = window.setTimeout(() => { expiryDueRef.current = true; pump(); }, Math.max(0, wait));
    return () => window.clearTimeout(timer);
    // pump reads the latest refs; the deadline is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline, day, owner]);

  const openDay = (target: string) => {
    if (target !== day) { setNotice(null); setFeedback(null); }
    setChosenDay(target);
    setView("intro");
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center text-white">
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
            <p className="mt-3 text-center text-sm text-white/75">{guestLockedOut ? c.guestYesterday : c.soon}</p>
            {guestLockedOut && <SignInLink placement="ultimo_intro" modeId="ultimo" returnTo="/ultimo" className="mt-4 inline-flex h-10 items-center rounded-full bg-brand-yellow px-5 text-xs font-black uppercase text-black hover:bg-brand-yellow-deep">{c.playToday}</SignInLink>}
            {onExit && <ExitLink label={c.exit} onExit={onExit} />}
          </Centered>
        ) : view === "archive" ? (
          <Archive locale={locale} days={openableDays} today={today} current={day} onBack={() => setView(state?.done ? "end" : "intro")} onOpen={openDay} />
        ) : view === "end" && state?.done ? (
          <EndScreen locale={locale} day={day} today={today} state={state} boardRefresh={boardRefresh} guestOnPastBoard={guestOnPastBoard} onArchive={() => setView("archive")} onExit={onExit} />
        ) : view === "play" && state && run ? (
          <Play key={run.run.id} locale={locale} state={state} clock={clock} pending={pending} notice={notice} feedback={feedback}
            onBegin={() => void begin()} onSay={(t) => void say(t)} onNext={() => void nextCategory()} onResult={() => setView("end")} onExit={onExit} />
        ) : (
          <Intro locale={locale} number={puzzleNumber(day)} state={state} busy={pending !== null} notice={notice} guestOnPastBoard={guestOnPastBoard} guestLockedOut={guestLockedOut}
            onStart={() => void play()} onArchive={() => setView("archive")} onExit={onExit} />
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
  const c = ultimoCopy(locale);
  return (
    <p className={cn("font-black uppercase tracking-tight", className)} style={poppins}>
      {c.brandA} <span className="text-brand-green-light">{c.brandB}</span>
    </p>
  );
}

function Intro({ locale, number, state, busy, notice, guestOnPastBoard, guestLockedOut, onStart, onArchive, onExit }: {
  locale: Locale; number: number; state: UltimoRunState | null; busy: boolean; notice: string | null; guestOnPastBoard: boolean; guestLockedOut: boolean;
  onStart: () => void; onArchive: () => void; onExit?: () => void;
}) {
  const c = ultimoCopy(locale);
  const inProgress = Boolean(state && !state.done && startedOn(state));
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
            <SignInLink placement="ultimo_intro" modeId="ultimo" returnTo="/ultimo" className="mt-2 inline-flex h-9 items-center rounded-full bg-brand-yellow px-4 text-xs font-black uppercase text-black hover:bg-brand-yellow-deep">{c.playToday}</SignInLink>
          </div>
        )}
        <div className="relative mt-5 aspect-video w-full overflow-hidden rounded-2xl bg-game-art-night" aria-hidden>
          <Image src="/assets/demos/game-modes/ultimo.webp" alt="" fill sizes="(max-width: 480px) 100vw, 448px" className="object-cover" priority />
        </div>
        <ul className="mt-6 space-y-2.5">
          {c.intro.lines.map((line) => (
            <li key={line} className="flex gap-2.5 text-[15px] leading-snug text-white/85"><span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-green-light" />{line}</li>
          ))}
        </ul>
        {notice && <p role="alert" className="mt-6 rounded-xl bg-brand-red-soft/20 px-3 py-2 text-sm font-semibold text-white">{notice}</p>}
        <button type="button" onClick={onStart} disabled={busy} className="mt-8 h-14 rounded-full bg-brand-green text-base font-black uppercase tracking-wide text-white hover:bg-brand-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-60" style={poppins}>
          {busy ? c.loading : state?.done ? c.intro.finished : inProgress && state ? c.intro.resume(state.category + 1) : c.intro.start}
        </button>
        <PlayWithFriendButton game="ultimo" locale={locale} className="mt-3" />
        <button type="button" onClick={onArchive} disabled={busy} className="mt-3 h-11 rounded-full bg-white/10 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/15 disabled:opacity-50" style={poppins}>{c.intro.past}</button>
        <p className="mt-4 text-center text-xs text-white/50">{c.intro.newBoard}</p>
      </div>
    </div>
  );
}

/** Ticks on the server's clock (its last sample plus monotonic time since) while a category is open. */
function useServerNow(active: boolean, clock: ServerClock): number {
  const read = () => clock.serverMs + (performance.now() - clock.perfMs);
  const [now, setNow] = useState(read);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(clock.serverMs + (performance.now() - clock.perfMs));
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 100);
    return () => { window.clearTimeout(first); window.clearInterval(id); };
  }, [active, clock]);
  return now;
}

function usePlayerAvatar() {
  const { player } = usePlayer();
  const signedIn = useAuthStore((s) => s.status) === "authenticated";
  const userId = useAuthStore((s) => s.user?.id);
  const [guestSeed] = useState(() => peekGuestToken() ?? "guest");
  return seatAvatar({ userId: signedIn ? userId ?? "member" : guestSeed, avatarCustomization: signedIn ? player?.avatarCustomization ?? null : null, avatarUrl: null, isGuest: !signedIn });
}

function Play({ locale, state, clock, pending, notice, feedback, onBegin, onSay, onNext, onResult, onExit }: {
  locale: Locale; state: UltimoRunState; clock: ServerClock; pending: string | null; notice: string | null; feedback: Feedback | null;
  onBegin: () => void; onSay: (text: string) => void; onNext: () => void; onResult: () => void; onExit?: () => void;
}) {
  const c = ultimoCopy(locale);
  const avatar = usePlayerAvatar();
  const now = useServerNow(state.open, clock);
  const msLeft = state.open && state.deadline ? Date.parse(state.deadline) - now : 0;
  // The first answer's clock includes the reveal: while more than a turn is left, the title is being revealed.
  const revealing = state.open && state.said.length === 0 && msLeft > state.turnMs;
  const playing = state.open && !revealing;
  const secs = Math.max(0, Math.ceil(msLeft / 1000));
  const livePoints = state.score + (state.open ? state.said.length : 0);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3">
        {onExit && <button type="button" onClick={onExit} aria-label={c.exit} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-4" /></button>}
        <Brand locale={locale} className="min-w-0 flex-1 truncate text-[13px]" />
        {playing && <Clock seconds={secs} />}
      </header>

      <div className={cn("mt-3 flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors", playing ? "bg-brand-green/15 ring-2 ring-brand-green" : "bg-white/[0.05]")}>
        <DuelAvatar customization={avatar} size="xs" ringClassName="ring-brand-green" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white/80">{c.you}</p>
          <p className="text-2xl font-black leading-none tabular-nums" style={poppins}>{livePoints}<span className="ml-1 text-xs font-bold text-white/55">{c.pts}</span></p>
        </div>
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: state.totalCategories }, (_, i) => {
            const r = state.results[i];
            return <span key={i} className={cn("h-2 w-5 rounded-full", r ? (r.complete ? "bg-brand-yellow" : "bg-brand-green") : i === state.category ? "bg-white/40" : "bg-white/15")} />;
          })}
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-transparent px-4 py-3">
        <div className="flex items-center justify-between gap-2 text-[11px] font-black uppercase tracking-wide text-white/55">
          <span>{c.category(state.category + 1, state.totalCategories)}</span>
          {state.title && <span className="flex items-center gap-1"><Timer className="size-3" />{c.perTurn(Math.round(state.turnMs / 1000))}</span>}
        </div>
        {state.title ? (
          <>
            <h2 className="mt-1 text-lg font-black leading-snug" style={poppins}>{textFor(state.title, locale)}</h2>
            {state.total !== null && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div className="h-full rounded-full bg-brand-yellow" animate={{ width: `${(state.said.length / state.total) * 100}%` }} />
                </div>
                <span className="shrink-0 text-xs font-bold tabular-nums text-white/70">{c.left(state.total - state.said.length, state.total)}</span>
              </div>
            )}
          </>
        ) : (
          <div className="mt-2 h-6 w-3/4 rounded-lg bg-white/10" aria-hidden />
        )}
      </div>

      {notice && <p role="alert" className="mt-3 rounded-xl bg-brand-red-soft/20 px-3 py-2 text-center text-sm font-semibold">{notice}</p>}

      {!state.open && !state.settled && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <button type="button" onClick={onBegin} disabled={pending !== null} className="h-14 w-full rounded-full bg-brand-green text-base font-black uppercase tracking-wide text-white hover:bg-brand-green-deep disabled:opacity-60" style={poppins}>
            {pending ? c.loading : c.begin}
          </button>
        </div>
      )}

      {revealing && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-sm text-white/65">{textFor(state.hint, locale)}</p>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-white/55">{c.startsIn}</p>
          <AnimatePresence mode="popLayout">
            <motion.span key={Math.ceil((msLeft - state.turnMs) / 1000)} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} className="mt-2 text-7xl font-black tabular-nums" style={poppins}>
              {Math.max(1, Math.ceil((msLeft - state.turnMs) / 1000))}
            </motion.span>
          </AnimatePresence>
        </div>
      )}

      {playing && (
        <>
          <TurnCard label={state.said.length === 0 ? c.turnFirst : c.turnNext} errorsLabel={c.errors} misses={state.misses} share={Math.max(0, Math.min(1, msLeft / state.turnMs))} urgent={msLeft <= 5_000} />
          <FeedbackLine locale={locale} feedback={feedback} />
          <SaidChips names={state.said.map((n) => textFor(n, locale))} />
          <div className="flex-1" />
          <AnswerBox placeholder={c.placeholder} say={c.say} onSubmit={onSay} />
        </>
      )}

      {state.settled && !state.open && (
        <CategorySheet locale={locale} state={state} busy={pending !== null} onNext={state.done ? onResult : onNext} />
      )}
    </div>
  );
}

/** The header clock, as in every duel; urgent in the last seconds (turns here are short). */
function Clock({ seconds }: { seconds: number }) {
  const urgent = seconds <= 5;
  return (
    <motion.span key={urgent ? seconds : "calm"} initial={urgent ? { scale: 1.2 } : false} animate={{ scale: 1 }}
      className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-black tabular-nums transition-colors", urgent ? "bg-brand-red-soft/20 text-brand-red-light" : "bg-white/[0.06] text-white/50")} style={poppins}>
      {seconds} s
    </motion.span>
  );
}

function TurnCard({ label, errorsLabel, misses, share, urgent }: { label: string; errorsLabel: string; misses: number; share: number; urgent: boolean }) {
  return (
    <div className="mt-3 rounded-2xl bg-brand-green px-4 py-3 text-white shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black uppercase tracking-wide" style={poppins}>{label}</p>
        <span className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-white/75">{errorsLabel}</span>
          {Array.from({ length: MAX_MISSES }, (_, i) => (
            <span key={i} className={cn("size-2.5 rounded-full", i < misses ? "bg-brand-red-soft ring-2 ring-white/80" : "bg-white/35")} />
          ))}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/25">
        <div className={cn("h-full rounded-full transition-[width] duration-100 ease-linear", urgent ? "bg-brand-yellow" : "bg-white")} style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  );
}

function FeedbackLine({ locale, feedback }: { locale: Locale; feedback: Feedback | null }) {
  const c = ultimoCopy(locale);
  return (
    <div className="mt-3 min-h-6">
      <AnimatePresence mode="wait">
        {feedback && (
          <motion.p key={feedback.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0, x: feedback.kind === "ok" ? 0 : [0, -6, 6, -3, 0] }} exit={{ opacity: 0 }}
            className={cn("flex items-center gap-1.5 text-sm font-bold", feedback.kind === "ok" ? "text-white" : feedback.kind === "ambiguous" ? "text-brand-yellow" : "text-brand-red-light")}>
            {feedback.kind === "ok" && <><span className="flex size-5 items-center justify-center rounded-full bg-brand-green"><Check className="size-3.5" strokeWidth={3} /></span>{feedback.text}</>}
            {feedback.kind === "wrong" && c.feedback.wrong(feedback.text, feedback.misses, MAX_MISSES)}
            {feedback.kind === "repeat" && c.feedback.repeat(feedback.text, feedback.misses, MAX_MISSES)}
            {feedback.kind === "ambiguous" && c.feedback.ambiguous(feedback.text)}
            {feedback.kind === "late" && c.feedback.late}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function SaidChips({ names }: { names: string[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {names.map((name, i) => (
        <motion.li key={`${i}-${name}`} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className={cn("rounded-full border border-brand-green/60 bg-brand-green/20 px-2.5 py-1 text-xs font-semibold text-white", i === names.length - 1 && "ring-2 ring-white/50")}>
          {name}
        </motion.li>
      ))}
    </ul>
  );
}

/** The app's typed-answer look (DailyAnswerInput / Who Am I board): blue pill input, green pill button, stacked. */
function AnswerBox({ placeholder, say, onSubmit }: { placeholder: string; say: string; onSubmit: (text: string) => void }) {
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus({ preventScroll: true }); }, []);
  const submit = () => {
    if (!draft.trim()) return;
    onSubmit(draft);
    setDraft("");
    input.current?.focus({ preventScroll: true });
  };
  return (
    <form className="sticky bottom-0 mt-3 space-y-2 bg-surface-page-alt/95 pb-1 pt-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <input ref={input} value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 60))} autoComplete="off" autoCapitalize="words" autoCorrect="off" spellCheck={false} enterKeyHint="send"
        placeholder={placeholder} aria-label={placeholder}
        className="font-poppins h-14 w-full rounded-[20px] border-none bg-brand-blue px-5 text-center text-base uppercase text-white outline-none placeholder:text-white/55 placeholder:uppercase placeholder:tracking-[0.08em] focus:outline-none"
        style={{ fontWeight: 600, letterSpacing: "0.08em", boxShadow: "0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)" }} />
      <button type="submit" disabled={!draft.trim()}
        className="font-poppins h-14 w-full rounded-[20px] bg-brand-green uppercase text-white outline-none transition-colors hover:bg-brand-green-deep disabled:cursor-not-allowed disabled:opacity-40"
        style={{ fontWeight: 600, fontSize: 16, letterSpacing: "0.06em", boxShadow: "0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)" }}>
        {say}
      </button>
    </form>
  );
}

function CategorySheet({ locale, state, busy, onNext }: { locale: Locale; state: UltimoRunState; busy: boolean; onNext: () => void }) {
  const c = ultimoCopy(locale);
  const s = state.settled!;
  const complete = s.reason === "complete";
  const Icon = complete ? Crown : Flag;
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { nextRef.current?.focus({ preventScroll: true }); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center">
      <motion.div role="dialog" aria-modal="true" aria-label={complete ? c.catEnd.titleComplete : c.catEnd.titleOut} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md rounded-t-3xl bg-brand-blue px-5 pb-6 pt-5 text-white shadow-2xl shadow-black/40 sm:rounded-3xl">
        <p className="text-xs font-bold uppercase tracking-wide text-white/75">{s.reason === "time" ? c.catEnd.time : s.reason === "misses" ? c.catEnd.misses(MAX_MISSES) : c.catEnd.complete}</p>
        <p className="mt-2 flex items-center gap-2.5 text-2xl font-black" style={poppins}>
          <span className={cn("flex size-9 items-center justify-center rounded-full bg-white", complete ? "text-brand-green" : "text-brand-blue")}><Icon className="size-5" strokeWidth={2.5} /></span>
          {complete ? c.catEnd.titleComplete : c.catEnd.titleOut}
        </p>
        <p className="mt-1 text-sm text-white/80">{c.catEnd.named(s.named, state.total ?? s.named, s.points)}</p>
        {s.missingCount > 0 && (
          <>
            <p className="mt-4 text-xs font-black uppercase tracking-wide text-white/75">{c.catEnd.missing(s.missingCount)}</p>
            {s.missing ? (
              <ul className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                {s.missing.map((name, i) => <li key={i} className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white">{textFor(name, locale)}</li>)}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-white/75">{c.catEnd.revealLater}</p>
            )}
          </>
        )}
        <button ref={nextRef} type="button" onClick={onNext} disabled={busy} className="mt-5 h-12 w-full rounded-full bg-white text-sm font-black uppercase text-brand-blue hover:bg-white/90 disabled:opacity-60" style={poppins}>
          {state.done ? c.catEnd.result : c.catEnd.next}
        </button>
      </motion.div>
    </div>
  );
}

const plural = (n: number, word: (n: number) => string) => `${n} ${word(n)}`;

function EndScreen({ locale, day, today, state, boardRefresh, guestOnPastBoard, onArchive, onExit }: {
  locale: Locale; day: string; today: string; state: UltimoRunState; boardRefresh: number; guestOnPastBoard: boolean; onArchive: () => void; onExit?: () => void;
}) {
  const c = ultimoCopy(locale);
  const number = puzzleNumber(day);
  const tiers = state.results.map((r: CategoryResult) => tierOf(r, r.total));
  const [copied, setCopied] = useState(false);
  const sharePath = `/r/${encodeUltimoShare(number, state.score, tiers, locale)}`;
  const shareUrl = typeof window === "undefined" ? sharePath : `${window.location.origin}${sharePath}`;
  const text = `${c.brandA} ${c.brandB} #${number}\n${plural(state.score, c.end.points)} ${tiers.map((t) => TIER_EMOJI[t]).join("")}\n${shareUrl}`;
  const share = async () => {
    try {
      if (typeof navigator.share === "function") await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch { /* cancelled */ }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* blocked */ }
  };
  return (
    <div className="flex flex-1 flex-col">
      {onExit && (
        <header className="mb-5 flex h-10 items-center">
          <button type="button" onClick={onExit} aria-label={c.exit} className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
        </header>
      )}
      <div className="rounded-3xl bg-brand-blue px-5 pb-5 pt-4 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">{c.end.title} · #{number}</p>
        <p className="mt-2 text-6xl font-black leading-none tabular-nums" style={poppins}>{state.score}</p>
        <p className="mt-1 text-sm font-bold text-white/80">{c.end.points(state.score)} · {c.end.answers(state.answers)}</p>
        <div className="mt-4 flex justify-center gap-2">
          {state.results.map((r, i) => (
            <span key={i} className={cn("flex size-10 items-center justify-center rounded-xl text-sm font-black tabular-nums", TIER_TILE[tiers[i]])} style={poppins}>{r.named}</span>
          ))}
        </div>
        {state.ranked && state.rank ? (
          <p className="mx-auto mt-3 w-fit rounded-full bg-brand-yellow px-4 py-1 text-sm font-black text-black" style={poppins}>{c.end.rank(state.rank)}</p>
        ) : guestOnPastBoard ? (
          <p className="mt-3 text-xs text-white/75">{c.guestYesterday}</p>
        ) : null}
      </div>

      <ul className="mt-4 space-y-1.5">
        {state.results.map((r, i) => (
          <li key={i} className="rounded-xl border border-white/10 px-3 py-2.5">
            <div className="flex items-center gap-2 text-sm">
              <span className={cn("size-4 shrink-0 rounded-md", TIER_TILE[tiers[i]])} />
              <span className="min-w-0 flex-1 truncate font-semibold">{textFor(r.title, locale) || c.category(i + 1, CATEGORIES_PER_DAY)}</span>
              <span className="shrink-0 text-xs font-bold tabular-nums text-white/70">{r.total !== null ? `${r.named}/${r.total}` : r.named}</span>
            </div>
            {r.total !== null && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className={cn("h-full rounded-full", r.complete ? "bg-brand-yellow" : "bg-brand-green")} style={{ width: `${(r.named / r.total) * 100}%` }} />
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={() => void share()} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand-green text-sm font-black uppercase text-white hover:bg-brand-green-deep" style={poppins}><Share2 className="size-4" />{c.end.share}</button>
        <button type="button" onClick={() => void copy()} aria-label={c.end.copied} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/15">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}</button>
      </div>
      <PlayWithFriendButton game="ultimo" locale={locale} className="mt-3" />
      <button type="button" onClick={onArchive} className="mt-3 h-11 rounded-full bg-white/10 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/15" style={poppins}>{c.intro.past}</button>
      {isLiveDay(day, today) && <UltimoLeaderboard locale={locale} day={day} refreshKey={boardRefresh} placement="end" className="mt-6" />}
    </div>
  );
}

function Archive({ locale, days, today, current, onBack, onOpen }: { locale: Locale; days: string[]; today: string; current: string; onBack: () => void; onOpen: (day: string) => void }) {
  const c = ultimoCopy(locale);
  return (
    <div className="flex flex-1 flex-col">
      <header className="mb-5 flex h-10 items-center gap-3">
        <button type="button" onClick={onBack} aria-label={c.archive.back} className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
        <h1 className="text-lg font-black uppercase" style={poppins}>{c.archive.title}</h1>
      </header>
      <ul className="space-y-2">
        {days.map((d) => (
          <li key={d}>
            <button type="button" onClick={() => onOpen(d)} className={cn("flex h-12 w-full items-center justify-between rounded-2xl px-4 text-sm font-bold", d === current ? "bg-brand-blue" : "bg-white/[0.07] hover:bg-white/10")}>
              <span style={poppins}>{c.archive.day(puzzleNumber(d))}</span>
              <span className="text-xs text-white/70">{d === today ? c.archive.today : d}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-xs text-white/50">{c.intro.newBoard}</p>
      <span className="sr-only">{REVEAL_MS}</span>
    </div>
  );
}
