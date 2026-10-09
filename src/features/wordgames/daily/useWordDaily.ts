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
export function useWordDaily<State extends WordRunStateBase, Result extends string>({ api, calendar, locale, initialDay, onDay, onEvent, onResult }: {
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
  const startedRef = useRef(false);
  const currentRef = useRef({ owner, day });
  const handlers = useRef({ onDay, onEvent, onResult });
  useEffect(() => { handlers.current = { onDay, onEvent, onResult }; });
  useEffect(() => {
    currentRef.current = { owner, day };
    expiryDueRef.current = false;
    needsRecoveryRef.current = false;
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
  useEffect(() => {
    if (!authReady || !day || contentVersion === undefined) return;
    if (owner === "guest" && !peekGuestToken()) return;
    let cancelled = false;
    api.current(day, locale)
      .then((data) => {
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
      .catch(() => {});
    return () => { cancelled = true; };
    // accept only reads and writes refs (and the clock state): it must not re-run this read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, authReady, contentVersion, day, locale, owner]);

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

  /** The server's copy of the run (after a lost answer, a stale version or an expired clock), retried; never a blind resend. */
  const resync = async (o: string, d: string) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const current = await api.start(d, contentVersion, locale, RESYNC_TIMEOUT_MS);
        if (stillCurrent(o, d)) { needsRecoveryRef.current = false; apply(current, o, d); setNotice(null); }
        return;
      } catch (error) {
        if (!stillCurrent(o, d)) return;
        if (!isNetworkFailure(error)) { handleError(error, d); return; }
        setNotice("connection");
        await new Promise((resolve) => window.setTimeout(resolve, RECOVERY_DELAY_MS * (attempt + 1)));
      }
    }
    // Every try failed on the network: say so, and recover as soon as the connection is back.
    if (stillCurrent(o, d)) { needsRecoveryRef.current = true; setNotice("connection"); }
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

  const act = (key: string, call: (run: WordRun<State>) => Promise<WordRun<State> & { result?: Result }>, typed?: string, needsRun = true) => {
    if (!day) return Promise.resolve(null);
    const o = owner;
    const d = day;
    return exclusive(key, async () => {
      setNotice(null);
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
        if (isNetworkFailure(error) || (error instanceof DailyGameApiError && error.message === "stale_state")) {
          if (isNetworkFailure(error)) setNotice("connection");
          await new Promise((resolve) => window.setTimeout(resolve, RECOVERY_DELAY_MS));
          await resync(o, d);
        } else {
          handleError(error, d);
        }
        return null;
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
    next: () => act("next", (r) => api.next(r, locale)),
    answer: (text: string) => act("answer", (r) => api.answer(r, text, locale), text),
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
