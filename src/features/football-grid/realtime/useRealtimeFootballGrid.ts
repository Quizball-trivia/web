'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRealtimeConnection } from '@/lib/realtime/useRealtimeConnection';
import { useFootballGridStore } from '@/stores/footballGrid.store';
import type { FootballGridState } from '@/lib/realtime/socket.types';
import { createRealtimeCommandId } from '@/lib/realtime/command-id';
import { markGridMatchLeftBehind } from '@/lib/realtime/socket-handlers';

interface UseRealtimeFootballGridOptions {
  enabled: boolean;
  selfUserId: string | null;
  locale: 'en' | 'ka';
  /** League pack to queue for; defaults to the full European mix. */
  theme?: string;
  autoStart?: boolean;
}

const PENDING_COMMAND_TIMEOUT_MS = 5_000;

function versionedCommand(state: FootballGridState) {
  return {
    matchId: state.matchId,
    commandId: createRealtimeCommandId(),
    expectedStateVersion: state.stateVersion,
  };
}

export function useRealtimeFootballGrid({
  enabled,
  selfUserId,
  locale,
  theme = 'european',
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
    // Mark BEFORE the reset: beginFreshSearch() nulls the match, so this is the
    // last moment the outgoing match id is observable.
    markGridMatchLeftBehind(useFootballGridStore.getState().state?.matchId);
    useFootballGridStore.getState().beginFreshSearch();
    socket.emit('grid:search_start', { locale, theme });
  }, [enabled, locale, socket, theme]);

  useEffect(() => {
    if (!enabled || !autoStart || autoStartAttemptedRef.current || searchSuppressedRef.current) return;
    // A terminal state does NOT block auto-start: setCompleted writes both
    // `completed` and a terminal `state`, so guarding on `state` alone made the
    // stale-result branch below unreachable and stranded the player on an old
    // results screen instead of starting the search they asked for.
    if ((state && state.phase !== 'terminal') || search.state !== 'idle') return;
    if (completed) {
      // A redelivered result from a match that terminated while the user was
      // away (e.g. a disconnect forfeit) landed just as they pressed PLAY.
      // Let the ack effect commit it first (rAF), then clear it and start the
      // fresh search — ranked/auction parity: the PLAY intent always wins
      // over a stale result screen.
      const timerId = window.setTimeout(() => {
        autoStartAttemptedRef.current = true;
        markGridMatchLeftBehind(useFootballGridStore.getState().state?.matchId);
        useFootballGridStore.getState().beginFreshSearch();
        socket.emit('grid:search_start', { locale, theme });
      }, 250);
      return () => window.clearTimeout(timerId);
    }
    autoStartAttemptedRef.current = true;
    socket.emit('grid:search_start', { locale, theme });
  }, [autoStart, completed, enabled, locale, search.state, socket, state, theme]);

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
        socket.emit('grid:search_start', { locale, theme });
      }
    };
    socket.on('connect', handleConnect);
    return () => {
      socket.off('connect', handleConnect);
    };
  }, [enabled, locale, socket, theme]);

  useEffect(() => {
    if (!enabled || !selfUserId || !state || state.phase !== 'handoff') return;
    const me = state.players.find((player) => player.userId === selfUserId);
    if (!me || me.handoffAcknowledged) return;
    const key = `${state.matchId}:${state.stateVersion}`;
    if (handoffCommandRef.current?.key === key) return;
    const commandId = createRealtimeCommandId();
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
    const commandId = createRealtimeCommandId();
    readyCommandRef.current = { key, commandId };
    socket.emit('grid:client_ready', {
      matchId: state.matchId,
      commandId,
      expectedStateVersion: state.stateVersion,
    });
  }, [enabled, selfUserId, socket, state]);

  const activeMatchId = state?.matchId ?? null;
  const activeMatchIsTerminal = state?.phase === 'terminal';
  const handoffAcknowledged = Boolean(
    selfUserId && state?.players.find((player) => player.userId === selfUserId)?.handoffAcknowledged,
  );

  useEffect(() => {
    if (!enabled || !activeMatchId || activeMatchIsTerminal || !handoffAcknowledged) return;
    const heartbeat = () => socket.emit('grid:presence_heartbeat', { matchId: activeMatchId });
    heartbeat();
    const intervalId = window.setInterval(heartbeat, 5_000);
    return () => window.clearInterval(intervalId);
  }, [activeMatchId, activeMatchIsTerminal, enabled, handoffAcknowledged, socket]);

  useEffect(() => {
    if (!enabled || !pendingCommandId) return;
    const timerId = window.setTimeout(() => {
      const latest = useFootballGridStore.getState();
      if (latest.pendingCommandId !== pendingCommandId) return;
      latest.markCommandPending(null);
      if (latest.state?.matchId) {
        socket.emit('grid:resync', { matchId: latest.state.matchId });
      }
    }, PENDING_COMMAND_TIMEOUT_MS);
    return () => window.clearTimeout(timerId);
  }, [enabled, pendingCommandId, socket]);

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
    const current = useFootballGridStore.getState();
    current.requestSearchCancellation();
    if (current.search.searchId) socket.emit('grid:search_cancel', { searchId: current.search.searchId });
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
      commandId: createRealtimeCommandId(),
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
