"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { createRealtimeCommandId } from "@/lib/realtime/command-id";
import { useEnsureGuestPrincipal, useRealtimePrincipal } from "@/lib/realtime/realtime-principal";
import { useRealtimeConnection } from "@/lib/realtime/useRealtimeConnection";
import type { DuelCommandResultPayload, ErrorPayload, RoomStatePayload } from "@/lib/realtime/socket.types";

const FATAL_ERRORS = new Set(["room_not_found", "not_in_match"]);
/** Refusals the screen already shows by itself (the state that follows says it). */
const QUIET_ERRORS = new Set(["stale_round", "not_active", "command_id_reused", "excluded"]);
/** An accepted command's state is asked for after this; the input is never held longer than the give-up. */
const STATE_WAIT_MS = 1_500;
const GIVE_UP_MS = 5_000;
/** An unconfirmed ready is said again after this (the gate is 20 s). */
const READY_RETRY_MS = 2_000;

/** What the connection needs to know about a room game's commands. */
export interface RoomClientRules<C> {
  /** Commands of one slot replace nothing and are never sent twice as different things (a round's guess, an attempt). */
  slot: (command: C) => string;
  /** True once the state on screen shows the command's outcome (or its slot is no longer open). */
  settled: (view: unknown, command: C) => boolean;
}

/**
 * One room-match screen's connection (same contract as useDuel): the newest full snapshot for this match, the server
 * clock, the ready gate, and a command that survives a reconnect (re-sent with the same id, which the server replays).
 * `games` lists the room games this build can draw (the server seats nobody, and brings no seat back, through a screen
 * that did not list the match's game); `rulesFor` gives a game's command rules, or null for a game not in that list.
 */
export function useRoomConnection<C>(matchId: string, games: readonly string[], rulesFor: (game: string) => RoomClientRules<C> | null) {
  const { locale } = useLocale();
  const principal = useRealtimePrincipal();
  const guestStatus = useEnsureGuestPrincipal(locale);
  const socket = useRealtimeConnection({ enabled: principal.kind !== "none", selfUserId: principal.userId });
  const [snapshot, setSnapshot] = useState<RoomStatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const latest = useRef<{ version: number; serverNowMs: number } | null>(null);
  /** The server's clock at its newest snapshot, against the monotonic clock: a device clock change moves nothing. */
  const clockRef = useRef<{ serverMs: number; perfMs: number; wallMs: number } | null>(null);
  const rulesRef = useRef(rulesFor);
  const gamesRef = useRef(games);
  useEffect(() => { rulesRef.current = rulesFor; gamesRef.current = games; }, [rulesFor, games]);
  /**
   * This screen's command per slot, kept until it is settled on screen (its outcome shows, or the slot closed).
   * `live`: sent on this connection, no answer yet. `accepted`: the server took it; `waiting` while its state has not
   * shown up (the answer comes before the broadcast). Not live and not accepted: no answer in time, outcome unknown.
   * Whatever its state, a slot's command is only ever re-sent as itself (same id, same payload); a different one needs
   * a definite refusal, which deletes the entry.
   */
  const pending = useRef(new Map<string, { command: C; slot: string; live: boolean; accepted: boolean; waiting: boolean; attempt: number }>());
  const [inFlight, setInFlight] = useState(0);
  /** A kept command that is not in flight: the input offers to retry exactly this one. */
  const [retained, setRetained] = useState<C | null>(null);
  const recount = useCallback(() => {
    let busy = 0;
    let kept: C | null = null;
    for (const entry of pending.current.values()) {
      if (entry.live || entry.waiting) busy += 1;
      else kept = entry.command;
    }
    setInFlight(busy);
    setRetained(kept);
  }, []);
  /** Every follow-up timer of this screen (resync asks, give-ups): cancelled when it leaves the match or the socket. */
  const timers = useRef(new Set<number>());
  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => { timers.current.delete(id); fn(); }, ms);
    timers.current.add(id);
  }, []);
  useEffect(() => () => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current.clear();
    pending.current.clear();
  }, [socket, matchId]);
  const readySent = useRef<string | null>(null);
  /** The newest snapshot on screen, for timers that must judge the current state (not the one they were set in). */
  const shown = useRef<RoomStatePayload | null>(null);
  const atGateNotReady = () => { const s = shown.current; return Boolean(s && s.status === "ready" && s.me.active && !s.me.ready); };

  const resync = useCallback(() => {
    if (socket?.connected) socket.emit("room:resync", { matchId, locale, games: gamesRef.current });
  }, [socket, matchId, locale]);

  const giveUpLater = useCallback((commandId: string) => {
    const attempt = pending.current.get(commandId)?.attempt;
    later(() => {
      const entry = pending.current.get(commandId);
      if (!entry?.live || entry.attempt !== attempt) return;
      pending.current.set(commandId, { ...entry, live: false });
      recount();
      if (socket?.connected) socket.emit("room:resync", { matchId, locale, games: gamesRef.current });
    }, GIVE_UP_MS);
  }, [socket, matchId, locale, recount, later]);

  useEffect(() => {
    if (!socket) return;
    const onState = (payload: RoomStatePayload) => {
      if (payload.matchId !== matchId) return;
      // Snapshots are complete; an older one arriving late must never roll the screen (or its clock) back.
      const serverNowMs = Date.parse(payload.serverNow);
      const seen = latest.current;
      if (seen && (payload.stateVersion < seen.version || (payload.stateVersion === seen.version && serverNowMs < seen.serverNowMs))) return;
      latest.current = { version: payload.stateVersion, serverNowMs };
      clockRef.current = { serverMs: serverNowMs, perfMs: performance.now(), wallMs: Date.now() };
      const rules = rulesRef.current(payload.game);
      for (const [id, entry] of pending.current) {
        if (!payload.view || !rules || rules.settled(payload.view, entry.command)) pending.current.delete(id);
      }
      recount();
      shown.current = payload;
      setFatal(null);
      setSnapshot(payload);
    };
    const onResult = (payload: DuelCommandResultPayload) => {
      if (payload.matchId !== matchId) return;
      const entry = pending.current.get(payload.commandId);
      if (!payload.ok || !entry) pending.current.delete(payload.commandId);
      else {
        // Taken: hold the input until the state shows it; a lost broadcast is asked for, and never holds it for good.
        const { commandId } = payload;
        const attempt = entry.attempt;
        pending.current.set(commandId, { ...entry, live: false, accepted: true, waiting: true });
        const still = () => { const e = pending.current.get(commandId); return e?.waiting && e.attempt === attempt ? e : null; };
        later(() => { if (still() && socket.connected) socket.emit("room:resync", { matchId, locale, games: gamesRef.current }); }, STATE_WAIT_MS);
        later(() => { const e = still(); if (e) { pending.current.set(commandId, { ...e, waiting: false }); recount(); } }, GIVE_UP_MS);
      }
      recount();
      if (!payload.ok && payload.code && !QUIET_ERRORS.has(payload.code)) setError(payload.code);
    };
    const onError = (payload: ErrorPayload & { matchId?: string }) => {
      if (payload.matchId && payload.matchId !== matchId) return;
      if (FATAL_ERRORS.has(payload.code)) {
        setFatal(payload.code);
        shown.current = null; // no more gate retries for a match this player cannot open
      } else setError(payload.code);
      for (const [id, entry] of pending.current) pending.current.set(id, { ...entry, live: false });
      // A ready that failed is sent again with the next state, which is asked for at once (the gate must not drop a
      // player who is here).
      readySent.current = null;
      if (atGateNotReady()) later(() => { if (atGateNotReady() && socket.connected) socket.emit("room:resync", { matchId, locale, games: gamesRef.current }); }, 1_000);
      recount();
    };
    const onConnect = () => {
      setConnected(true);
      readySent.current = null;
      socket.emit("room:resync", { matchId, locale, games: gamesRef.current });
      for (const [commandId, entry] of pending.current) {
        if (entry.accepted) continue;
        pending.current.set(commandId, { ...entry, live: true, attempt: entry.attempt + 1 });
        socket.emit("room:command", { matchId, commandId, command: entry.command });
        giveUpLater(commandId);
      }
      recount();
    };
    const onDisconnect = () => setConnected(false);
    socket.on("room:state", onState);
    socket.on("room:command_result", onResult);
    socket.on("room:error", onError);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) onConnect();
    return () => {
      socket.off("room:state", onState);
      socket.off("room:command_result", onResult);
      socket.off("room:error", onError);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket, matchId, locale, recount, giveUpLater, later]);

  // Coming back to the tab: the snapshot may be minutes old.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") resync(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", resync);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", resync);
    };
  }, [resync]);

  // The ready gate: say so once per snapshot version while this seat is in and not ready. A watchdog, kept armed
  // across new snapshots until the ready shows (or the gate closes), asks for the state every READY_RETRY_MS, and the
  // ready goes out again with the state that answers.
  const readyWatchdog = useRef<number | null>(null);
  useEffect(() => () => { if (readyWatchdog.current) window.clearTimeout(readyWatchdog.current); }, []);
  useEffect(() => {
    if (!socket?.connected || !snapshot || snapshot.status !== "ready" || snapshot.me.ready || !snapshot.me.active) return;
    const key = `${snapshot.matchId}:${snapshot.stateVersion}`;
    if (readySent.current === key) return;
    // A game this build cannot draw is never readied: the gate leaves the seat out instead of starting a blank board.
    if (!rulesRef.current(snapshot.game)) return;
    readySent.current = key;
    socket.emit("room:ready", { matchId, locale, games: gamesRef.current });
    const watch = () => {
      readyWatchdog.current = null;
      if (!atGateNotReady()) return;
      readySent.current = null;
      if (socket.connected) socket.emit("room:resync", { matchId, locale, games: gamesRef.current });
      readyWatchdog.current = window.setTimeout(watch, READY_RETRY_MS);
    };
    if (!readyWatchdog.current) readyWatchdog.current = window.setTimeout(watch, READY_RETRY_MS);
  }, [socket, snapshot, matchId, locale, connected]);

  // The server thinks this seat is away while this screen is connected (a check that raced a reconnect): say so.
  const selfAwayKey = useRef<string | null>(null);
  useEffect(() => {
    if (!socket?.connected || !snapshot || snapshot.status !== "active") return;
    if (snapshot.seats.find((s) => s.userId === snapshot.me.userId)?.connected !== false || !snapshot.me.active) return;
    const key = `${snapshot.matchId}:${snapshot.stateVersion}`;
    if (selfAwayKey.current === key) return;
    selfAwayKey.current = key;
    socket.emit("room:resync", { matchId, locale, games: gamesRef.current });
  }, [socket, snapshot, matchId, locale, connected]);

  const send = useCallback((command: C) => {
    const game = shown.current?.game;
    const rules = game ? rulesRef.current(game) : null;
    if (!socket || !rules) return;
    setError(null);
    const slot = rules.slot(command);
    // One command per slot. A command whose outcome is unknown is retried as itself (same id, same payload): the server
    // either already took it (and replays the answer) or takes it now; a different one is only sent after a refusal.
    for (const [commandId, entry] of pending.current) {
      if (entry.slot !== slot) continue;
      if (entry.live || entry.waiting) return;
      pending.current.set(commandId, { ...entry, live: true, attempt: entry.attempt + 1 });
      recount();
      socket.emit("room:command", { matchId, commandId, command: entry.command });
      giveUpLater(commandId);
      return;
    }
    const commandId = createRealtimeCommandId();
    pending.current.set(commandId, { command, slot, live: true, accepted: false, waiting: false, attempt: 0 });
    recount();
    socket.emit("room:command", { matchId, commandId, command });
    giveUpLater(commandId);
  }, [socket, matchId, recount, giveUpLater]);

  /** Asks again about every command whose outcome never came back, each as itself (same id, same payload). */
  const resendRetained = useCallback(() => {
    if (!socket?.connected) return;
    for (const [commandId, entry] of pending.current) {
      if (entry.live || entry.waiting) continue;
      pending.current.set(commandId, { ...entry, live: true, attempt: entry.attempt + 1 });
      socket.emit("room:command", { matchId, commandId, command: entry.command });
      giveUpLater(commandId);
    }
    recount();
  }, [socket, matchId, recount, giveUpLater]);

  const leave = useCallback(() => {
    socket?.emit("room:leave", { matchId, commandId: createRealtimeCommandId() });
  }, [socket, matchId]);

  /** "That was right" (word games): fire and forget; false when there is no connection to send it on. */
  const report = useCallback((round: number, text: string): boolean => {
    if (!socket?.connected) return false;
    socket.emit("room:report", { matchId, round, text: text.slice(0, 60) });
    return true;
  }, [socket, matchId]);

  const nowMs = useCallback(() => (clockRef.current ? clockRef.current.serverMs + (performance.now() - clockRef.current.perfMs) : Date.now()), []);
  // The monotonic clock can stand still while a device sleeps (and the wall clock can be changed by hand): when the two
  // disagree about how long ago the last snapshot was, neither is trusted and the server is asked again.
  useEffect(() => {
    if (!socket) return;
    // The throttle runs on the monotonic clock: a wall clock set back must not silence it.
    let asked = -Infinity;
    const check = () => {
      const clock = clockRef.current;
      if (!clock || !socket.connected) return;
      const drift = Math.abs((Date.now() - clock.wallMs) - (performance.now() - clock.perfMs));
      if (drift < 1_500 || performance.now() - asked < 5_000) return;
      asked = performance.now();
      socket.emit("room:resync", { matchId, locale, games: gamesRef.current });
    };
    const timer = window.setInterval(check, 1_000);
    document.addEventListener("visibilitychange", check);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", check); };
  }, [socket, matchId, locale]);
  const clearError = useCallback(() => setError(null), []);

  return { snapshot, error, fatal, clearError, connected, inFlight, retained, send, resendRetained, leave, report, nowMs, principal, guestStatus, resync };
}
