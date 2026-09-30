"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { usePlayer } from "@/contexts/PlayerContext";
import { useUserPreferences } from "@/lib/preferences/userPreferences";
import { playSfx } from "@/lib/sounds/gameSounds";
import { peekGuestToken } from "@/lib/guest/guestSession";
import type { EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { SignInLink } from "@/features/marketing/public/PublicLinks";
import type { Locale } from "@/lib/i18n/locale";
import { seatAvatar } from "@/features/duel/DuelAvatar";
import { PlayWithFriendButton } from "@/features/duel/PlayWithFriendButton";
import { UltimoApiError, isNetworkFailure, ultimoApi, type UltimoAnswerResult, type UltimoRun, type UltimoRunState } from "@/lib/repositories/ultimo.repo";
import {
  TIER_EMOJI, addDays, isClosedDay, isLiveDay, playableDays, puzzleNumber, releaseDay, tierOf,
  type CategoryResult,
} from "./ultimo.logic";
import { textFor, ultimoCopy } from "./ultimo.copy";
import { encodeUltimoShare } from "./ultimo.share";
import { UltimoLeaderboard } from "./UltimoLeaderboard";
import { ULTIMO_SOUNDS, type UltimoSoundMoment } from "./ultimo.sounds";
import {
  Brand, Centered, ExitLink, UltimoArchiveView, UltimoEndView, UltimoFrame, UltimoIntroView, UltimoPlayView, plural, type Feedback,
} from "./ultimo.views";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;
type View = "intro" | "play" | "end" | "archive";
/** A dropped connection usually comes back within a second: wait briefly before re-syncing (turns can be six seconds). */
const RECOVERY_DELAY_MS = 300;
const RESYNC_TIMEOUT_MS = 4_000;
/** While the connection is down, the run is re-fetched this often (and at once when the browser is back online). */
const OFFLINE_RETRY_MS = 5_000;
/** Answers a fast typist can have waiting behind the one in flight. */
const MAX_QUEUED = 5;

interface ServerClock { serverMs: number; perfMs: number }
/** The server keeps an answer valid this long past its deadline; after it, the category is over. */
const GRACE_MS = 1_500;

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
  const clockSyncedRef = useRef(false);
  const [clock, setClock] = useState<ServerClock>(firstClock);
  const runRef = useRef<UltimoRun | null>(null);
  const inFlightRef = useRef(false);
  /** Answers typed while a move is in flight, sent in order; cleared when the category or run changes. */
  const queueRef = useRef<string[]>([]);
  /** The clock ran out while a move was in flight: re-sync right after it. */
  const expiryDueRef = useRef(false);
  /** The newest render's pump: timers and finished calls from older renders reach it (and its owner and day). */
  const pumpRef = useRef<() => void>(() => {});
  /** A re-sync failed on the network every time: the run is fetched again once the browser is back online. */
  const needsRecoveryRef = useRef(false);
  const recoverRef = useRef<() => void>(() => {});
  const startedRef = useRef(false);
  const currentRef = useRef({ owner, day });
  useEffect(() => {
    currentRef.current = { owner, day };
    queueRef.current = [];
    expiryDueRef.current = false;
    needsRecoveryRef.current = false;
  }, [owner, day]);
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
    // accept only reads and writes refs (and the clock state): it must not re-run this read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, contentVersion, day, locale, owner]);

  const onDayRef = useRef(onDay);
  useEffect(() => { onDayRef.current = onDay; }, [onDay]);
  useEffect(() => { if (day) onDayRef.current?.(day); }, [day]);

  const { soundEnabled } = useUserPreferences();
  const sfx = useCallback((moment: UltimoSoundMoment) => {
    const name = ULTIMO_SOUNDS[moment];
    if (soundEnabled && name) playSfx(name);
  }, [soundEnabled]);

  /**
   * The one gate every response passes: only a newer version of this run (or another run) replaces what is shown, so a
   * slow read can never rewind a category whose clock already runs.
   */
  const accept = (next: UltimoRun): boolean => {
    const current = runRef.current;
    if (current && current.run.id === next.run.id && next.run.version < current.run.version) return false;
    // Every response is late by its trip, so the one that puts the server furthest ahead is the best sample.
    const sample = { serverMs: Date.parse(next.state.serverNow), perfMs: performance.now() };
    if (!clockSyncedRef.current || sample.serverMs > serverNow()) {
      clockSyncedRef.current = true;
      clockRef.current = sample;
      setClock(sample);
    }
    if (current && (current.run.id !== next.run.id || current.state.category !== next.state.category || !next.state.open)) queueRef.current = [];
    runRef.current = next;
    return true;
  };

  /** `o`/`d`: the player and board the call was made for (a closure from an older render must not re-label it). */
  const apply = (next: UltimoRun, o: string, d: string, result?: UltimoAnswerResult, typed?: string) => {
    const before = runRef.current?.state ?? null;
    if (!accept(next)) return;
    setEntry({ owner: o, day: d, run: next });
    if (result && result !== "ok") {
      setFeedback({ id: ++feedbackId.current, kind: result, text: typed ?? "", misses: next.state.misses });
      if (result === "wrong" || result === "repeat") sfx("miss");
    } else if (result === "ok") {
      setFeedback({ id: ++feedbackId.current, kind: "ok", text: textFor(next.state.said.at(-1) ?? null, locale), misses: 0 });
      sfx("correct");
    }
    if (next.state.settled && !before?.settled) sfx("categoryEnd");
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
    // The server answered: whatever it said, this is no longer a connection to wait for.
    needsRecoveryRef.current = false;
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
        if (stillCurrent(o, d)) { needsRecoveryRef.current = false; apply(current, o, d); setNotice(null); }
        return;
      } catch (error) {
        if (!stillCurrent(o, d)) return;
        if (!isNetworkFailure(error)) { handleError(error, d); return; }
        setNotice(c.connection);
        await new Promise((resolve) => window.setTimeout(resolve, RECOVERY_DELAY_MS * (attempt + 1)));
      }
    }
    // Every try failed on the network: say so, and recover as soon as the connection is back.
    if (stillCurrent(o, d)) { needsRecoveryRef.current = true; setNotice(c.connection); }
  };

  const recover = () => {
    if (!needsRecoveryRef.current || inFlightRef.current) return;
    const { owner: o, day: d } = currentRef.current;
    if (d) void exclusive("sync", () => resync(o, d));
  };
  useEffect(() => { recoverRef.current = recover; });
  useEffect(() => {
    const onBack = () => recoverRef.current();
    window.addEventListener("online", onBack);
    const timer = window.setInterval(onBack, OFFLINE_RETRY_MS);
    return () => { window.removeEventListener("online", onBack); window.clearInterval(timer); };
  }, []);

  /** Next in line once nothing is in flight: an expiry re-sync first (unless a move since reset the clock), then the typed answers in order. */
  const pump = () => {
    if (inFlightRef.current) return;
    if (expiryDueRef.current) {
      expiryDueRef.current = false;
      const s = runRef.current?.state;
      if (s?.open && s.deadline && serverNow() >= Date.parse(s.deadline) + GRACE_MS) {
        void exclusive("sync", async () => { const { owner: o, day: d } = currentRef.current; if (d) await resync(o, d); });
        return;
      }
    }
    const text = queueRef.current.shift();
    const current = runRef.current;
    if (text && current?.state.open) void act("answer", () => ultimoApi.answer(current, text, locale), text);
  };

  useEffect(() => { pumpRef.current = pump; });

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
      window.setTimeout(() => pumpRef.current(), 0);
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
        if (result && stillCurrent(o, d)) apply(result, o, d, result.result, typed);
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

  /** False when the answer was not taken (the queue is full): the box keeps it. */
  const say = (text: string): boolean => {
    const value = text.trim();
    if (!value || !runRef.current?.state.open) return false;
    if (queueRef.current.length >= MAX_QUEUED) return false;
    queueRef.current.push(value);
    pumpRef.current();
    return true;
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
    const timer = window.setTimeout(() => { expiryDueRef.current = true; pumpRef.current(); }, Math.max(0, wait));
    return () => window.clearTimeout(timer);
  }, [deadline, day, owner]);

  const openDay = (target: string) => {
    if (target !== day) { setNotice(null); setFeedback(null); }
    setChosenDay(target);
    setView("intro");
  };

  return (
    <UltimoFrame>
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
            {guestLockedOut && signIn("mt-4 inline-flex h-10 items-center rounded-full bg-brand-yellow px-5 text-xs font-black uppercase text-black hover:bg-brand-yellow-deep", c.playToday)}
            {onExit && <ExitLink label={c.exit} onExit={onExit} />}
          </Centered>
        ) : view === "archive" ? (
          <UltimoArchiveView locale={locale} days={openableDays} today={today} current={day} onBack={() => setView(state?.done ? "end" : "intro")} onOpen={openDay} />
        ) : view === "end" && state?.done ? (
          <EndScreen locale={locale} day={day} today={today} state={state} boardRefresh={boardRefresh} guestOnPastBoard={guestOnPastBoard} onArchive={() => setView("archive")} onExit={onExit} />
        ) : view === "play" && state && run ? (
          <Play key={run.run.id} locale={locale} state={state} clock={clock} pending={pending} notice={notice} feedback={feedback}
            onBegin={() => void begin()} onSay={say} onNext={() => void nextCategory()} onResult={() => setView("end")} onExit={onExit} />
        ) : (
          <UltimoIntroView locale={locale} number={puzzleNumber(day)} state={state} busy={pending !== null} notice={notice} guestOnPastBoard={guestOnPastBoard} guestLockedOut={guestLockedOut}
            slots={{ signIn, friend: <PlayWithFriendButton game="ultimo" locale={locale} className="mt-3" /> }} onStart={() => void play()} onArchive={() => setView("archive")} onExit={onExit} />
        )}
    </UltimoFrame>
  );
}

const signIn = (className: string, label: string) => (
  <SignInLink placement="ultimo_intro" modeId="ultimo" returnTo="/ultimo" className={className}>{label}</SignInLink>
);

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

/** The playing screen with its live inputs: the ticking server clock and the player's avatar. */
function Play({ clock, ...props }: Omit<Parameters<typeof UltimoPlayView>[0], "now" | "avatar"> & { clock: ServerClock }) {
  const avatar = usePlayerAvatar();
  const now = useServerNow(props.state.open, clock);
  return <UltimoPlayView {...props} now={now} avatar={avatar} />;
}

/** The result screen with its live parts: the share text (sent or copied), the friend button and the leaderboard. */
function EndScreen({ locale, day, today, state, boardRefresh, guestOnPastBoard, onArchive, onExit }: {
  locale: Locale; day: string; today: string; state: UltimoRunState; boardRefresh: number; guestOnPastBoard: boolean; onArchive: () => void; onExit?: () => void;
}) {
  const c = ultimoCopy(locale);
  const number = puzzleNumber(day);
  const tiers = state.results.map((r: CategoryResult) => tierOf(r, r.total));
  const sharePath = `/r/${encodeUltimoShare(number, state.score, tiers, locale)}`;
  const shareUrl = typeof window === "undefined" ? sharePath : `${window.location.origin}${sharePath}`;
  const text = `${c.brandA} ${c.brandB} #${number}\n${plural(state.score, c.end.points)} ${tiers.map((t) => TIER_EMOJI[t]).join("")}\n${shareUrl}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { return false; }
  };
  const share = async () => {
    try {
      if (typeof navigator.share === "function") { await navigator.share({ text }); return false; }
      return copy();
    } catch { return false; }
  };
  return (
    <UltimoEndView locale={locale} day={day} state={state} guestOnPastBoard={guestOnPastBoard} onShare={share} onCopy={copy} onArchive={onArchive} onExit={onExit}
      slots={{
        friend: <PlayWithFriendButton game="ultimo" locale={locale} className="mt-3" />,
        // Like Pistas: a past (or pre-launch) board ends on today's leaderboard, the one there is still a rank to win on.
        leaderboard: <UltimoLeaderboard locale={locale} day={isLiveDay(day, today) ? day : undefined} refreshKey={boardRefresh} placement="end" className="mt-6" />,
      }} />
  );
}
