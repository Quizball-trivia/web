"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { createRealtimeCommandId } from "@/lib/realtime/command-id";
import { useEnsureGuestPrincipal, useRealtimePrincipal } from "@/lib/realtime/realtime-principal";
import { useRealtimeConnection } from "@/lib/realtime/useRealtimeConnection";
import type { DuelCommandResultPayload, DuelStatePayload, ErrorPayload } from "@/lib/realtime/socket.types";
import { QUIET_ERRORS } from "./duel.copy";

const FATAL_ERRORS = new Set(["duel_not_found", "not_in_match"]);
import type { DuelCommand } from "./duel.views";

/**
 * One duel screen's connection: the newest full snapshot for this match, the server clock, and commands
 * that survive a reconnect (re-sent with the same id, which the server replays instead of re-applying).
 */
export function useDuel(matchId: string) {
  const { locale } = useLocale();
  const principal = useRealtimePrincipal();
  const guestStatus = useEnsureGuestPrincipal(locale);
  const socket = useRealtimeConnection({ enabled: principal.kind !== "none", selfUserId: principal.userId });
  const [snapshot, setSnapshot] = useState<DuelStatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** A match this principal cannot open (gone, or not theirs): stays until the player leaves. */
  const [fatal, setFatal] = useState<string | null>(null);
  const latest = useRef<{ version: number; serverNowMs: number } | null>(null);
  const [connected, setConnected] = useState(false);
  const offsetRef = useRef(0);
  const pending = useRef(new Map<string, DuelCommand>());
  const readySent = useRef<string | null>(null);

  const resync = useCallback(() => {
    if (socket?.connected) socket.emit("duel:resync", { matchId, locale });
  }, [socket, matchId, locale]);

  useEffect(() => {
    if (!socket) return;
    const onState = (payload: DuelStatePayload) => {
      if (payload.matchId !== matchId) return;
      // Snapshots are complete; an older one arriving late must never roll the screen (or its clock) back.
      const serverNowMs = Date.parse(payload.serverNow);
      const seen = latest.current;
      if (seen && (payload.stateVersion < seen.version || (payload.stateVersion === seen.version && serverNowMs < seen.serverNowMs))) return;
      latest.current = { version: payload.stateVersion, serverNowMs };
      offsetRef.current = serverNowMs - Date.now();
      setFatal(null);
      setSnapshot(payload);
    };
    const onResult = (payload: DuelCommandResultPayload) => {
      if (payload.matchId !== matchId) return;
      pending.current.delete(payload.commandId);
      if (!payload.ok && payload.code && !QUIET_ERRORS.has(payload.code)) setError(payload.code);
    };
    const onError = (payload: ErrorPayload & { matchId?: string }) => {
      if (payload.matchId && payload.matchId !== matchId) return;
      if (FATAL_ERRORS.has(payload.code)) setFatal(payload.code);
      else setError(payload.code);
    };
    const onConnect = () => {
      setConnected(true);
      readySent.current = null;
      socket.emit("duel:resync", { matchId, locale });
      for (const [commandId, command] of pending.current) socket.emit("duel:command", { matchId, commandId, command });
    };
    const onDisconnect = () => setConnected(false);
    socket.on("duel:state", onState);
    socket.on("duel:command_result", onResult);
    socket.on("duel:error", onError);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) onConnect();
    return () => {
      socket.off("duel:state", onState);
      socket.off("duel:command_result", onResult);
      socket.off("duel:error", onError);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket, matchId, locale]);

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

  // The ready gate: say so once per connection while this seat is not ready yet.
  useEffect(() => {
    if (!socket?.connected || !snapshot || snapshot.status !== "ready") return;
    if (snapshot.seats.find((seat) => seat.seat === snapshot.mySeat)?.ready) return;
    const key = `${snapshot.matchId}:${snapshot.stateVersion}`;
    if (readySent.current === key) return;
    readySent.current = key;
    socket.emit("duel:ready", { matchId, locale });
  }, [socket, snapshot, matchId, locale, connected]);

  // The server thinks this seat is away but this screen is connected (a check that raced a reconnect): say so.
  const selfAwayKey = useRef<string | null>(null);
  useEffect(() => {
    if (!socket?.connected || !snapshot || snapshot.status !== "paused") return;
    if (snapshot.seats.find((seat) => seat.seat === snapshot.mySeat)?.connected !== false) return;
    const key = `${snapshot.matchId}:${snapshot.stateVersion}`;
    if (selfAwayKey.current === key) return;
    selfAwayKey.current = key;
    socket.emit("duel:resync", { matchId, locale });
  }, [socket, snapshot, matchId, locale, connected]);

  const send = useCallback((command: DuelCommand) => {
    if (!socket) return;
    const commandId = createRealtimeCommandId();
    pending.current.set(commandId, command);
    setError(null);
    socket.emit("duel:command", { matchId, commandId, command });
  }, [socket, matchId]);

  const forfeit = useCallback(() => {
    socket?.emit("duel:forfeit", { matchId, commandId: createRealtimeCommandId() });
  }, [socket, matchId]);

  const nowMs = useCallback(() => Date.now() + offsetRef.current, []);

  return { snapshot, error, fatal, clearError: () => setError(null), connected, send, forfeit, nowMs, principal, guestStatus, resync };
}

/** Seconds left on the server deadline, ticking on the synced clock (never the device clock alone). */
export function useSecondsLeft(deadlineIso: string | null, nowMs: () => number): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!deadlineIso) return;
    const tick = () => setNow(nowMs());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 250);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [deadlineIso, nowMs]);
  if (!deadlineIso || now === null) return null;
  return Math.max(0, Math.ceil((Date.parse(deadlineIso) - now) / 1000));
}
