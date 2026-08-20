'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRealtimeConnection } from '@/lib/realtime/useRealtimeConnection';
import { useFootballGridStore } from '@/stores/footballGrid.store';
import type { FootballGridState } from '@/lib/realtime/socket.types';

interface UseRealtimeFootballGridOptions {
  enabled: boolean;
  selfUserId: string | null;
  locale: 'en' | 'ka';
  autoStart?: boolean;
}

function createCommandId(): string {
  return globalThis.crypto.randomUUID();
}

function versionedCommand(state: FootballGridState) {
  return {
    matchId: state.matchId,
    commandId: createCommandId(),
    expectedStateVersion: state.stateVersion,
  };
}

export function useRealtimeFootballGrid({
  enabled,
  selfUserId,
  locale,
  autoStart = true,
}: UseRealtimeFootballGridOptions) {
  const socket = useRealtimeConnection({ enabled, selfUserId });
  const search = useFootballGridStore((current) => current.search);
  const state = useFootballGridStore((current) => current.state);
  const opponent = useFootballGridStore((current) => current.opponent);
  const capabilities = useFootballGridStore((current) => current.capabilities);
  const completed = useFootballGridStore((current) => current.completed);
  const rematch = useFootballGridStore((current) => current.rematch);
  const commandResult = useFootballGridStore((current) => current.lastCommandResult);
  const turnResolved = useFootballGridStore((current) => current.lastTurnResolved);
  const pendingCommandId = useFootballGridStore((current) => current.pendingCommandId);
  const reportedAttemptIds = useFootballGridStore((current) => current.reportedAttemptIds);
  const error = useFootballGridStore((current) => current.error);
  const serverTimeOffsetMs = useFootballGridStore((current) => current.serverTimeOffsetMs);
  const autoStartAttemptedRef = useRef(false);
  const searchSuppressedRef = useRef(false);
  const handoffCommandRef = useRef<{ key: string; commandId: string } | null>(null);
  const readyCommandRef = useRef<{ key: string; commandId: string } | null>(null);
  const acknowledgedCompletionTokenRef = useRef<string | null>(null);

  const startSearch = useCallback(() => {
    if (!enabled) return;
    searchSuppressedRef.current = false;
    autoStartAttemptedRef.current = true;
    useFootballGridStore.getState().beginFreshSearch();
    socket.emit('grid:search_start', { locale });
  }, [enabled, locale, socket]);

  useEffect(() => {
    if (!enabled || !autoStart || autoStartAttemptedRef.current || searchSuppressedRef.current) return;
    if (state || completed || search.state !== 'idle') return;
    autoStartAttemptedRef.current = true;
    socket.emit('grid:search_start', { locale });
  }, [autoStart, completed, enabled, locale, search.state, socket, state]);

  // The player can cancel before the server has returned a searchId. If that
  // happens, cancel the search as soon as its authoritative ID arrives so a
  // late queue response cannot pull them into a match after navigation.
  useEffect(() => {
    if (!enabled || !searchSuppressedRef.current || search.state !== 'searching' || !search.searchId) return;
    socket.emit('grid:search_cancel', { searchId: search.searchId });
  }, [enabled, search.searchId, search.state, socket]);

  useEffect(() => {
    if (!enabled) return;
    const handleConnect = () => {
      // A versioned ACK may have been buffered just as the transport dropped.
      // Allow the authoritative resync snapshot to trigger it again. Command
      // IDs remain idempotent server-side, so a duplicate is harmless.
      handoffCommandRef.current = null;
      readyCommandRef.current = null;
      const latest = useFootballGridStore.getState();
      if (latest.state?.matchId) {
        socket.emit('grid:resync', { matchId: latest.state.matchId });
      } else if (latest.search.state === 'searching' && !searchSuppressedRef.current) {
        socket.emit('grid:search_start', { locale });
      }
    };
    socket.on('connect', handleConnect);
    return () => {
      socket.off('connect', handleConnect);
    };
  }, [enabled, locale, socket]);

  useEffect(() => {
    if (!enabled || !selfUserId || !state || state.phase !== 'handoff') return;
    const me = state.players.find((player) => player.userId === selfUserId);
    if (!me || me.handoffAcknowledged) return;
    const key = `${state.matchId}:${state.stateVersion}`;
    if (handoffCommandRef.current?.key === key) return;
    const commandId = createCommandId();
    handoffCommandRef.current = { key, commandId };
    socket.emit('grid:match_found_ack', {
      matchId: state.matchId,
      commandId,
      expectedStateVersion: state.stateVersion,
    });
  }, [enabled, selfUserId, socket, state]);

  useEffect(() => {
    if (!enabled || !selfUserId || !state || state.phase !== 'loading') return;
    const me = state.players.find((player) => player.userId === selfUserId);
    if (!me || me.ready) return;
    const key = `${state.matchId}:${state.stateVersion}`;
    if (readyCommandRef.current?.key === key) return;
    const commandId = createCommandId();
    readyCommandRef.current = { key, commandId };
    socket.emit('grid:client_ready', {
      matchId: state.matchId,
      commandId,
      expectedStateVersion: state.stateVersion,
    });
  }, [enabled, selfUserId, socket, state]);

  useEffect(() => {
    if (!enabled || !selfUserId || !state || state.phase === 'terminal') return;
    const me = state.players.find((player) => player.userId === selfUserId);
    if (!me?.handoffAcknowledged) return;
    const heartbeat = () => socket.emit('grid:presence_heartbeat', { matchId: state.matchId });
    heartbeat();
    const intervalId = window.setInterval(heartbeat, 5_000);
    return () => window.clearInterval(intervalId);
  }, [enabled, selfUserId, socket, state]);

  // The terminal outbox is acknowledged only after React has committed the
  // full results payload. A reload before this effect simply causes the server
  // to redeliver it with a fresh token, so results are never lost in transit.
  useEffect(() => {
    if (!completed || acknowledgedCompletionTokenRef.current === completed.ackToken) return;
    const frameId = window.requestAnimationFrame(() => {
      acknowledgedCompletionTokenRef.current = completed.ackToken;
      socket.emit('grid:completed_ack', {
        matchId: completed.matchId,
        terminalStateVersion: completed.terminalStateVersion,
        ackToken: completed.ackToken,
      });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [completed, socket]);

  const cancelSearch = useCallback(() => {
    searchSuppressedRef.current = true;
    const current = useFootballGridStore.getState().search;
    if (current.searchId) socket.emit('grid:search_cancel', { searchId: current.searchId });
  }, [socket]);

  const submitAnswer = useCallback((cellIndex: number, text: string) => {
    const current = useFootballGridStore.getState();
    const snapshot = current.state;
    if (
      !snapshot ||
      !selfUserId ||
      snapshot.phase !== 'turn' ||
      snapshot.currentPlayerUserId !== selfUserId ||
      current.pendingCommandId ||
      snapshot.claims.some((claim) => claim.cellIndex === cellIndex) ||
      !text.trim()
    ) return false;
    const command = versionedCommand(snapshot);
    current.markCommandPending(command.commandId);
    socket.emit('grid:submit_answer', {
      ...command,
      cellIndex,
      text: text.trim(),
      locale,
    });
    return true;
  }, [locale, selfUserId, socket]);

  const pass = useCallback(() => {
    const current = useFootballGridStore.getState();
    const snapshot = current.state;
    if (
      !snapshot ||
      !selfUserId ||
      snapshot.phase !== 'turn' ||
      snapshot.currentPlayerUserId !== selfUserId ||
      current.pendingCommandId
    ) return false;
    const command = versionedCommand(snapshot);
    current.markCommandPending(command.commandId);
    socket.emit('grid:pass', command);
    return true;
  }, [selfUserId, socket]);

  const forfeit = useCallback(() => {
    const current = useFootballGridStore.getState();
    if (!current.state || current.state.phase === 'terminal' || current.pendingCommandId) return false;
    const command = versionedCommand(current.state);
    current.markCommandPending(command.commandId);
    socket.emit('grid:forfeit', command);
    return true;
  }, [socket]);

  const reportMissingAnswer = useCallback((attemptId: string) => {
    const current = useFootballGridStore.getState();
    if (!attemptId || current.reportedAttemptIds.includes(attemptId)) return false;
    socket.emit('grid:report_missing_answer', { attemptId });
    return true;
  }, [socket]);

  const acceptRematch = useCallback(() => {
    const current = useFootballGridStore.getState();
    if (!current.completed || !current.rematch || current.rematch.status !== 'pending') return false;
    socket.emit('grid:rematch_accept', {
      matchId: current.completed.matchId,
      commandId: createCommandId(),
      expectedSeriesVersion: current.rematch.seriesVersion,
    });
    return true;
  }, [socket]);

  const declineRematch = useCallback(() => {
    const current = useFootballGridStore.getState();
    if (!current.completed || !current.rematch || current.rematch.status !== 'pending') return false;
    socket.emit('grid:rematch_decline', {
      matchId: current.completed.matchId,
      expectedSeriesVersion: current.rematch.seriesVersion,
    });
    return true;
  }, [socket]);

  const clear = useCallback(() => {
    searchSuppressedRef.current = true;
    useFootballGridStore.getState().clear();
  }, []);

  const clearCommandFeedback = useCallback(() => {
    useFootballGridStore.getState().clearCommandFeedback();
  }, []);

  const me = useMemo(
    () => state?.players.find((player) => player.userId === selfUserId) ?? null,
    [selfUserId, state],
  );

  return {
    search,
    state,
    me,
    opponent,
    capabilities,
    completed,
    rematch,
    commandResult,
    turnResolved,
    pendingCommandId,
    reportedAttemptIds,
    error,
    serverTimeOffsetMs,
    actions: {
      startSearch,
      cancelSearch,
      submitAnswer,
      pass,
      forfeit,
      reportMissingAnswer,
      acceptRematch,
      declineRematch,
      clearCommandFeedback,
      clear,
    },
  };
}
