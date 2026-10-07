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
/** An accepted guess's state is asked for after this; the input is never held longer than the give-up. */
const STATE_WAIT_MS = 1_500;
const GIVE_UP_MS = 5_000;
/** An unconfirmed ready is said again after this (the gate is 20 s). */
const READY_RETRY_MS = 2_000;

export type RoomCommand = { type: "guess"; round: number; value: number };

/**
 * One room-match screen's connection (same contract as useDuel): the newest full snapshot for this match, the server
 * clock, the ready gate, and a guess that survives a reconnect (re-sent with the same id, which the server replays).
 */
export function useRoom(matchId: string) {
  const { locale } = useLocale();
  const principal = useRealtimePrincipal();
  const guestStatus = useEnsureGuestPrincipal(locale);
  const socket = useRealtimeConnection({ enabled: principal.kind !== "none", selfUserId: principal.userId });
  const [snapshot, setSnapshot] = useState<RoomStatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const latest = useRef<{ version: number; serverNowMs: number } | null>(null);
  const offsetRef = useRef(0);
  /**
   * This screen's guess per round, kept until its round is settled on screen (my answer shows, or the round moved on).
   * `live`: sent on this connection, no answer yet. `accepted`: the server took it; `waiting` while its state has not
   * shown up (the answer comes before the broadcast). Not live and not accepted: no answer in time, outcome unknown.
   * Whatever its state, the round's guess is only ever re-sent as itself (same id, same number); a new number needs a
   * definite refusal, which deletes the entry.
   */
  const pending = useRef(new Map<string, { command: RoomCommand; live: boolean; accepted: boolean; waiting: boolean; attempt: number }>());
  const [inFlight, setInFlight] = useState(0);
  /** The open round's kept guess when it is not in flight: the input offers to retry exactly this number. */
  const [retained, setRetained] = useState<{ round: number; value: number } | null>(null);
  const recount = useCallback(() => {
    let busy = 0;
    let kept: { round: number; value: number } | null = null;
    for (const entry of pending.current.values()) {
      if (entry.live || entry.waiting) busy += 1;
      else kept = { round: entry.command.round, value: entry.command.value };
    }
    setInFlight(busy);
    setRetained((prev) => (prev?.round === kept?.round && prev?.value === kept?.value ? prev : kept));
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
    if (socket?.connected) socket.emit("room:resync", { matchId, locale });
  }, [socket, matchId, locale]);

  const giveUpLater = useCallback((commandId: string) => {
    const attempt = pending.current.get(commandId)?.attempt;
    later(() => {
      const entry = pending.current.get(commandId);
      if (!entry?.live || entry.attempt !== attempt) return;
      pending.current.set(commandId, { ...entry, live: false });
      recount();
      if (socket?.connected) socket.emit("room:resync", { matchId, locale });
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
      offsetRef.current = serverNowMs - Date.now();
      // A guess is settled once its round shows my answer, or is no longer open.
      const view = payload.view as { phase?: string; round?: number; myGuess?: number | null } | null;
      for (const [id, entry] of pending.current) {
        if (!view || view.phase !== "guess" || view.round !== entry.command.round || view.myGuess != null) pending.current.delete(id);
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
        later(() => { if (still() && socket.connected) socket.emit("room:resync", { matchId, locale }); }, STATE_WAIT_MS);
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
      if (atGateNotReady()) later(() => { if (atGateNotReady() && socket.connected) socket.emit("room:resync", { matchId, locale }); }, 1_000);
      recount();
    };
    const onConnect = () => {
      setConnected(true);
      readySent.current = null;
      socket.emit("room:resync", { matchId, locale });
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
    readySent.current = key;
    socket.emit("room:ready", { matchId, locale });
    const watch = () => {
      readyWatchdog.current = null;
      if (!atGateNotReady()) return;
      readySent.current = null;
      if (socket.connected) socket.emit("room:resync", { matchId, locale });
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
    socket.emit("room:resync", { matchId, locale });
  }, [socket, snapshot, matchId, locale, connected]);

  const guess = useCallback((round: number, value: number) => {
    if (!socket) return;
    setError(null);
    // One guess per round. A guess whose outcome is unknown is retried as itself (same id, same number): the server
    // either already took it (and replays the answer) or takes it now; a new number is only sent after a refusal.
    for (const [commandId, entry] of pending.current) {
      if (entry.command.round !== round) continue;
      if (entry.live || entry.waiting) return;
      pending.current.set(commandId, { ...entry, live: true, attempt: entry.attempt + 1 });
      recount();
      socket.emit("room:command", { matchId, commandId, command: entry.command });
      giveUpLater(commandId);
      return;
    }
    const commandId = createRealtimeCommandId();
    const command: RoomCommand = { type: "guess", round, value };
    pending.current.set(commandId, { command, live: true, accepted: false, waiting: false, attempt: 0 });
    recount();
    socket.emit("room:command", { matchId, commandId, command });
    giveUpLater(commandId);
  }, [socket, matchId, recount, giveUpLater]);

  const leave = useCallback(() => {
    socket?.emit("room:leave", { matchId, commandId: createRealtimeCommandId() });
  }, [socket, matchId]);

  const nowMs = useCallback(() => Date.now() + offsetRef.current, []);
  const clearError = useCallback(() => setError(null), []);

  return { snapshot, error, fatal, clearError, connected, inFlight, retained, guess, leave, nowMs, principal, guestStatus, resync };
}
