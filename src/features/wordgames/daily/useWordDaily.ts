"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { peekGuestToken } from "@/lib/guest/guestSession";
import { useAuthStore } from "@/stores/auth.store";
import { DailyGameApiError, isNetworkFailure, type WordDailyApi, type WordRun, type WordRunStateBase } from "./wordDaily.api";
import { addDays, isClosedDay, playableDays, releaseDay, type WordDailyCalendar } from "./wordDaily.logic";

export type WordDailyView = "intro" | "play" | "end" | "archive";
/** What a refused or failed call means for the screen. */
export type WordDailyNotice = "dayOver" | "guestToday" | "maintenance" | "restarted" | "sessionChanged" | "actionError" | "connection";
export interface ServerClock { serverMs: number; perfMs: number }
/** An answer the server's copy, now on screen, does not hold for sure (see `onAnswerNotSaved`). */
export interface WordAnswerMissed<State extends WordRunStateBase> {
  /** The copy the answer was sent on, and the server's copy since re-synced. */
  sentOn: WordRun<State>;
  fresh: WordRun<State>;
  text: string;
  extra?: Record<string, unknown>;
  /** True: the reply was lost, so the answer may still have landed (the game checks `fresh`). False: refused as stale, nothing saved. */
  lost: boolean;
}

/** A dropped connection usually comes back within a second: wait briefly before re-syncing. */
const RECOVERY_DELAY_MS = 300;
const RESYNC_TIMEOUT_MS = 4_000;
/** While the connection is down, the run is re-fetched this often (and at once when the browser is back online). */
const OFFLINE_RETRY_MS = 5_000;
/** The server keeps an answer valid this long past its deadline; after it, the clock has decided. */
const GRACE_MS = 1_500;

/**
 * One word-game daily on screen: which board, the player's server-held run of it, the server's clock, and one server
 * call at a time. A run is only ever shown for the player and board it belongs to; only a newer version of it replaces
 * what is shown; a lost answer or a stale version is re-synced from the server, never blindly resent.
 */
export function useWordDaily<State extends WordRunStateBase, Result extends string>({ api, calendar, locale, initialDay, onDay, onEvent, onResult, onAnswerNotSaved, resendStaleAnswers = false, resendLostAnswers = false }: {
  api: WordDailyApi<State, Result>;
  calendar: WordDailyCalendar;
  locale: string;
  /** A past day from the archive link (?dia=); ignored when it isn't playable. */
  initialDay?: string | null;
  /** `newest`: the day is the one a visit without a chosen day opens. */
  onDay?: (day: string, newest: boolean) => void;
  onEvent?: (event: "start" | "complete" | "replay", detail?: { score?: number }) => void;
  /** After a judged answer: the state before and after, the verdict and what was typed. */
  onResult?: (result: Result, next: State, typed: string) => void;
  /**
   * The game judges an answer the same whatever came before it (Tenable): one refused as stale (another tab moved the
   * run on; the server saved nothing) is sent once more on the re-synced copy instead of being dropped.
   */
  resendStaleAnswers?: boolean;
  /**
   * The game has no clock and judges an answer the same whenever it arrives (Football Horserace): one lost on the
   * network is sent again once the re-synced copy shows it never landed (still the version it was sent on). The version
   * check makes a resend of one that did land a harmless stale refusal.
   */
  resendLostAnswers?: boolean;
  /**
   * An answer that is neither resent nor shown as judged: another tab moved the run on before it (stale), or its reply
   * was lost and the re-synced copy has moved past the copy it was sent on. Called once that copy is on screen, only
   * for the player and board the answer was made for; the game explains it and may ask for the answer again.
   */
  onAnswerNotSaved?: (missed: WordAnswerMissed<State>) => void;
}) {
  const [today, setToday] = useState(() => releaseDay());
  const [versions, setVersions] = useState<Record<string, number> | null | undefined>(undefined);
  const [boardsAttempt, setBoardsAttempt] = useState(0);
  const firstTodayRef = useRef(today);
  const days = useMemo(() => playableDays(calendar, today).filter((d) => !versions || d in versions), [calendar, today, versions]);
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

  const [entry, setEntry] = useState<{ owner: string; day: string; run: WordRun<State> } | null>(null);
  const run = entry && entry.owner === owner && entry.day === day ? entry.run : null;
  const state = run?.state ?? null;
  const [view, setView] = useState<WordDailyView>("intro");
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<WordDailyNotice | null>(null);
  const [boardRefresh, setBoardRefresh] = useState(0);
  /** The server's clock sampled with each response, against the monotonic clock: countdowns ignore device-clock jumps. */
  const [firstClock] = useState<ServerClock>(() => ({ serverMs: Date.now(), perfMs: performance.now() }));
  const clockRef = useRef<ServerClock>(firstClock);
  const clockSyncedRef = useRef(false);
  const [clock, setClock] = useState<ServerClock>(firstClock);
  const runRef = useRef<WordRun<State> | null>(null);
  const inFlightRef = useRef(false);
  /** The clock ran out while a move was in flight: re-sync right after it. */
  const expiryDueRef = useRef(false);
  const pumpRef = useRef<() => void>(() => {});
  /** A re-sync failed on the network every time: the run is fetched again once the browser is back online. */
  const needsRecoveryRef = useRef(false);
  const recoverRef = useRef<() => void>(() => {});
  /** An answer lost on the network while the re-sync could not reach the server either: sent again after recovery. */
  const lostAnswerRef = useRef<{ owner: string; day: string; runId: string; version: number; resend?: () => void; missed?: (fresh: WordRun<State>) => void } | null>(null);
  const startedRef = useRef(false);
  const currentRef = useRef({ owner, day });
  const handlers = useRef({ onDay, onEvent, onResult, onAnswerNotSaved });
  useEffect(() => { handlers.current = { onDay, onEvent, onResult, onAnswerNotSaved }; });
  useEffect(() => {
    currentRef.current = { owner, day };
    expiryDueRef.current = false;
    needsRecoveryRef.current = false;
    // An answer waiting for the connection belongs to the board and player it was made on.
    lostAnswerRef.current = null;
    // Another board or another player: its first play is a start of its own.
    startedRef.current = false;
  }, [owner, day]);
  useEffect(() => { runRef.current = run; }, [run]);
  const aliveRef = useRef(true);
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);
  /** The call was made for the player and board still on screen (and the screen is still there). */
  const stillCurrent = (o: string, d: string) => aliveRef.current && currentRef.current.owner === o && currentRef.current.day === d;
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
    api.boards(boardsAttempt > 0 || today !== firstTodayRef.current)
      .then((data) => { if (!cancelled) setVersions(data.days ?? {}); })
      // Only a first load that fails is an error screen; a refresh that fails keeps what was loaded.
      .catch(() => { if (!cancelled) setVersions((loaded) => loaded ?? null); });
    return () => { cancelled = true; };
  }, [api, boardsAttempt, today]);

  /** The one gate every response passes: only a newer version of this run (or another run) replaces what is shown. */
  const accept = (next: WordRun<State>): boolean => {
    const current = runRef.current;
    if (current && current.run.id === next.run.id && next.run.version < current.run.version) return false;
    // Every response is late by its trip, so the one that puts the server furthest ahead is the best sample.
    const sample = { serverMs: Date.parse(next.state.serverNow), perfMs: performance.now() };
    if (!clockSyncedRef.current || sample.serverMs > serverNow()) {
      clockSyncedRef.current = true;
      clockRef.current = sample;
      setClock(sample);
    }
    runRef.current = next;
    return true;
  };

  // What the server holds for this board and player drives the intro (continue, finished); a guest without a session has none.
  // Read again once the board's day closes: a finished run may show more then (Tenable reveals the rest of its list).
  const dayClosed = !!day && today > day;
  /** That read failed (offline at midnight): it is asked again on the next return or reconnect. */
  const closeReadPendingRef = useRef(false);
  const [closeReadAttempt, setCloseReadAttempt] = useState(0);
  useEffect(() => {
    if (!authReady || !day || contentVersion === undefined) return;
    if (owner === "guest" && !peekGuestToken()) return;
    let cancelled = false;
    api.current(day, locale)
      .then((data) => {
        if (!cancelled) closeReadPendingRef.current = false;
        if (cancelled || !("state" in data) || !accept(data)) return;
        setEntry({ owner, day, run: data });
        if (data.state.done) {
          setView((v) => (v === "intro" ? "end" : v));
        } else if (data.state.open) {
          // A clock that is already running (a reload in the middle of a pair) is never kept behind another screen,
          // and its day stays the day on screen through midnight.
          setView("play");
          setChosenDay(day);
          if (!startedRef.current) { startedRef.current = true; handlers.current.onEvent?.("start"); }
        }
      })
      .catch(() => { if (!cancelled && dayClosed) closeReadPendingRef.current = true; });
    return () => { cancelled = true; };
    // accept only reads and writes refs (and the clock state): it must not re-run this read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, authReady, closeReadAttempt, contentVersion, day, dayClosed, locale, owner]);

  const newestOpenable = openableDays[0] ?? null;
  useEffect(() => { if (day) handlers.current.onDay?.(day, day === newestOpenable); }, [day, newestOpenable]);

  /** `o`/`d`: the player and board the call was made for (a closure from an older render must not re-label it). */
  const apply = (next: WordRun<State>, o: string, d: string, result?: Result, typed?: string) => {
    const before = runRef.current?.state ?? null;
    if (!accept(next)) return;
    setEntry({ owner: o, day: d, run: next });
    // A running clock is never left behind another screen, whichever move or re-sync opened it.
    if (next.state.open) setView("play");
    if (result) handlers.current.onResult?.(result, next.state, typed ?? "");
    if (next.state.done && before && !before.done) {
      handlers.current.onEvent?.("complete", { score: next.state.score });
      if (next.state.ranked) setBoardRefresh((n) => n + 1);
    }
  };

  /** What a refused move means for the screen (every move and every re-sync ends up here). */
  const handleError = (error: unknown, d: string) => {
    const code = error instanceof DailyGameApiError ? error.message : null;
    const status = error instanceof DailyGameApiError ? error.status : null;
    // The server answered: whatever it said, this is no longer a connection to wait for.
    needsRecoveryRef.current = false;
    if (code === "day_over") {
      setToday((t) => (t > d ? t : addDays(d, 1)));
      setChosenDay(null);
      setEntry(null);
      setView("intro");
      setNotice("dayOver");
    } else if (code === "sign_in_for_today") {
      setEntry(null);
      setView("intro");
      setNotice("guestToday");
    } else if (status === 503) {
      setNotice("maintenance");
    } else if (code === "content_changed") {
      setEntry(null);
      setView("intro");
      setNotice("restarted");
      setVersions(undefined);
      setBoardsAttempt((n) => n + 1);
    } else if (status === 401 || status === 403) {
      setEntry(null);
      setView("intro");
      setNotice("sessionChanged");
    } else {
      setNotice("actionError");
    }
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
      window.setTimeout(() => pumpRef.current(), 0);
    }
  };

  /**
   * The server's copy of the run (after a lost answer, a stale version or an expired clock), retried; never a blind
   * resend. "shown": that copy was read and is on screen; "behind": it was read but a newer one (another read) already
   * is; false: it could not be read.
   */
  const readBack = async (o: string, d: string): Promise<"shown" | "behind" | false> => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const current = await api.start(d, contentVersion, locale, RESYNC_TIMEOUT_MS);
        if (!stillCurrent(o, d)) return false;
        needsRecoveryRef.current = false;
        apply(current, o, d);
        setNotice(null);
        return runRef.current === current ? "shown" : "behind";
      } catch (error) {
        if (!stillCurrent(o, d)) return false;
        if (!isNetworkFailure(error)) { handleError(error, d); return false; }
        setNotice("connection");
        await new Promise((resolve) => window.setTimeout(resolve, RECOVERY_DELAY_MS * (attempt + 1)));
      }
    }
    // Every try failed on the network: say so, and recover as soon as the connection is back.
    if (stillCurrent(o, d)) { needsRecoveryRef.current = true; setNotice("connection"); }
    return false;
  };
  /** True only when the server's copy was read and is on screen (the copy a resend may be judged against). */
  const resync = async (o: string, d: string): Promise<boolean> => (await readBack(o, d)) === "shown";

  const retryCloseRead = () => {
    if (!closeReadPendingRef.current || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
    closeReadPendingRef.current = false;
    setCloseReadAttempt((n) => n + 1);
  };
  /** A re-sync, then the answer lost before it, if that copy shows it never landed. */
  const syncThenResend = (o: string, d: string) => {
    void exclusive("sync", () => readBack(o, d)).then((read) => {
      const lost = lostAnswerRef.current;
      if (!read || !lost) return;
      lostAnswerRef.current = null;
      const fresh = runRef.current;
      if (lost.owner !== o || lost.day !== d || !stillCurrent(o, d) || !fresh) return;
      if (read === "shown" && lost.resend && !fresh.state.done && fresh.run.id === lost.runId && fresh.run.version === lost.version) lost.resend();
      else lost.missed?.(fresh);
    });
  };
  const recover = () => {
    retryCloseRead();
    if (!needsRecoveryRef.current || inFlightRef.current) return;
    const { owner: o, day: d } = currentRef.current;
    if (d) syncThenResend(o, d);
  };
  useEffect(() => { recoverRef.current = recover; });
  /** A tab coming back into view catches up first: another tab may have moved the run on (its next answer would be stale). */
  const catchUp = () => {
    if (document.visibilityState === "visible") retryCloseRead();
    if (document.visibilityState !== "visible" || inFlightRef.current || !runRef.current || runRef.current.state.done) return;
    const { owner: o, day: d } = currentRef.current;
    if (d) syncThenResend(o, d);
  };
  const catchUpRef = useRef(catchUp);
  useEffect(() => { catchUpRef.current = catchUp; });
  useEffect(() => {
    const onReturn = () => catchUpRef.current();
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => { document.removeEventListener("visibilitychange", onReturn); window.removeEventListener("focus", onReturn); };
  }, []);
  useEffect(() => {
    const onBack = () => recoverRef.current();
    window.addEventListener("online", onBack);
    const timer = window.setInterval(onBack, OFFLINE_RETRY_MS);
    return () => { window.removeEventListener("online", onBack); window.clearInterval(timer); };
  }, []);

  /** Once nothing is in flight: an expiry re-sync that came due meanwhile (unless a move since reset the clock). */
  const pump = () => {
    if (inFlightRef.current || !expiryDueRef.current) return;
    expiryDueRef.current = false;
    const s = runRef.current?.state;
    if (s?.open && s.deadline && serverNow() >= Date.parse(s.deadline) + GRACE_MS) {
      void exclusive("sync", async () => { const { owner: o, day: d } = currentRef.current; if (d) await resync(o, d); });
    }
  };
  useEffect(() => { pumpRef.current = pump; });

  const act = (key: string, call: (run: WordRun<State>) => Promise<WordRun<State> & { result?: Result }>, typed?: string, needsRun = true, resendStale = false, resendLost = false, missed?: (sentOn: WordRun<State>, fresh: WordRun<State>, lost: boolean) => void): Promise<(WordRun<State> & { result?: Result }) | null> => {
    if (!day) return Promise.resolve(null);
    const o = owner;
    const d = day;
    return exclusive(key, async () => {
      setNotice(null);
      // A new move replaces any answer still waiting for the connection.
      lostAnswerRef.current = null;
      for (let attempt = 0; ; attempt += 1) {
        const sentOn = runRef.current;
        try {
          const current = runRef.current;
          if (needsRun && !current) return null;
          const result = await call(current as WordRun<State>);
          // Left meanwhile (another day, another player, the screen closed): the caller must not build a next move on it.
          if (!stillCurrent(o, d)) return null;
          apply(result, o, d, result.result, typed);
          return result;
        } catch (error) {
          if (!stillCurrent(o, d)) return null;
          const stale = error instanceof DailyGameApiError && error.message === "stale_state";
          if (isNetworkFailure(error) || stale) {
            if (!stale) setNotice("connection");
            await new Promise((resolve) => window.setTimeout(resolve, RECOVERY_DELAY_MS));
            const read = await readBack(o, d);
            const synced = read === "shown";
            // Only a stale refusal is known to be unsaved (a lost response may have been judged): resent once, and
            // only onto the copy that re-sync itself read, while it is still open.
            const fresh = runRef.current;
            if (resendStale && stale && attempt === 0 && synced && stillCurrent(o, d) && fresh && !fresh.state.done) continue;
            const moved = (r: WordRun<State> | null) => r !== null && sentOn !== null && (r.run.id !== sentOn.run.id || r.run.version !== sentOn.run.version);
            if (missed && sentOn && stillCurrent(o, d)) {
              // A newer copy may have overtaken the re-sync's own read: it is the one on screen, so it is the one explained.
              if (read && fresh && moved(fresh)) missed(sentOn, fresh, !stale);
              // Refused as stale but the copy could not be read: explained once recovery reads it.
              else if (stale && !synced && needsRecoveryRef.current) lostAnswerRef.current = { owner: o, day: d, runId: sentOn.run.id, version: sentOn.run.version, missed: (f) => missed(sentOn, f, false) };
            }
            if (resendLost && !stale && sentOn && stillCurrent(o, d)) {
              const unsaved = (r: WordRun<State> | null) => r !== null && !r.state.done && r.run.id === sentOn.run.id && r.run.version === sentOn.run.version;
              if (synced && unsaved(fresh)) {
                if (attempt < 2) continue;
                // The server answers a re-sync but never got the answer: say so instead of leaving an idle screen.
                setNotice("actionError");
              }
              // Still offline: the run could not be read, so whether it landed is unknown until the connection is back.
              if (!synced) lostAnswerRef.current = { owner: o, day: d, runId: sentOn.run.id, version: sentOn.run.version, resend: () => void act(key, call, typed, needsRun, resendStale, resendLost, missed), missed: missed && ((f) => { if (moved(f)) missed(sentOn, f, true); }) };
            }
          } else {
            handleError(error, d);
          }
          return null;
        }
      }
    });
  };

  // The clock ran out (past the grace): the server settles it. Ask for its copy (after any move in flight).
  const deadline = state?.open ? state.deadline : null;
  useEffect(() => {
    if (!deadline || !day) return;
    const wait = Date.parse(deadline) + GRACE_MS + 250 - serverNow();
    const timer = window.setTimeout(() => { expiryDueRef.current = true; pumpRef.current(); }, Math.max(0, wait));
    return () => window.clearTimeout(timer);
    // serverNow reads refs only.
     
  }, [deadline, day, owner]);

  /** Opens (or re-opens) the run of the board on screen; resolves to it once the play view is up. */
  const play = useCallback(async (): Promise<WordRun<State> | null> => {
    if (!day) return null;
    if (runRef.current?.state.done && stillCurrent(owner, day)) { setView("end"); return null; }
    if (!startedRef.current) { startedRef.current = true; handlers.current.onEvent?.("start"); }
    // Pinned: midnight in Buenos Aires (or a device clock change) must not swap the board under a run in progress.
    setChosenDay(day);
    const fresh = await act("start", () => api.start(day, contentVersion, locale), undefined, false);
    if (!fresh) return null;
    setView(fresh.state.done ? "end" : "play");
    return fresh;
    // act closes over this render's owner/day/contentVersion, all listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, contentVersion, day, locale, owner]);

  const openDay = (target: string) => {
    if (target !== day) setNotice(null);
    setChosenDay(target);
    setView("intro");
  };

  return {
    today, day, days: openableDays, versions, authReady, owner, guestLockedOut, guestOnPastBoard,
    run, state, view, setView, pending, notice, clock, boardRefresh,
    play, openDay,
    /** A server call is in flight (read at once, ahead of the `pending` render): a tap now would be dropped. */
    busy: () => inFlightRef.current,
    next: () => act("next", (r) => api.next(r, locale)),
    answer: (text: string, extra?: Record<string, unknown>) => act("answer", (r) => api.answer(r, text, locale, extra), text, true, resendStaleAnswers, resendLostAnswers,
      handlers.current.onAnswerNotSaved && ((sentOn, fresh, lost) => handlers.current.onAnswerNotSaved?.({ sentOn, fresh, text, extra, lost }))),
    pass: () => act("pass", (r) => api.pass(r, locale)),
    reload: () => { setVersions(undefined); setBoardsAttempt((n) => n + 1); },
  };
}

/** Ticks on the server's clock (its last sample plus monotonic time since) while something is counting down. */
export function useServerNow(active: boolean, clock: ServerClock): number {
  const [now, setNow] = useState(() => clock.serverMs + (performance.now() - clock.perfMs));
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(clock.serverMs + (performance.now() - clock.perfMs));
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 100);
    return () => { window.clearTimeout(first); window.clearInterval(id); };
  }, [active, clock]);
  return now;
}
