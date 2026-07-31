'use client';

// Weekend League live-game client: one socket subscription (player or
// spectator) driving a screen state machine off the wl:* event stream.
//
// Ordering: every event carries a tournament-scoped `seq`; the subscribe ack
// returns the role cursor (live vs delayed stream head), and anything at or
// below the last seen seq is dropped. Gaps need no replay — dispatches are
// self-contained and reveal/game_result payloads carry ABSOLUTE standings, so
// the next event of each kind fully supersedes whatever was missed.
//
// Clocks: playableAt/deadlineAt are server-clock ms. Each event refreshes the
// (serverNow − localNow) offset estimate, and countdowns render through it.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { connectSocket } from '@/lib/realtime/socket-client';
import type {
  WlAnswerAck,
  WlBoardRow,
  WlDispatchEventPayload,
  WlEventPayload,
  WlFinalResultEventPayload,
  WlGameResultEventPayload,
  WlRevealEventPayload,
} from '@/lib/realtime/socket.types';
import { useAuthStore } from '@/stores/auth.store';

export type WlLiveScreen =
  | { kind: 'waiting' }
  | { kind: 'question'; attempt: WlDispatchEventPayload; answer: WlAnswerAck | null }
  | { kind: 'reveal'; attempt: WlDispatchEventPayload | null; reveal: WlRevealEventPayload; answer: WlAnswerAck | null }
  | { kind: 'game_result'; result: WlGameResultEventPayload; eliminated: boolean }
  | { kind: 'final_result'; result: WlFinalResultEventPayload; champion: boolean }
  | { kind: 'cancelled' };

export interface WlLiveState {
  connected: boolean;
  subscribed: boolean;
  denied: 'not_entered' | 'not_found' | 'invalid' | null;
  screen: WlLiveScreen;
  /** Latest absolute top board (from the last reveal/game_result). */
  board: WlBoardRow[];
  /** Cumulative points this game, from answer acks (authoritative per-answer). */
  score: number;
  gameIndex: number;
  /** serverNow() – estimate of the backend clock. */
  serverNow: () => number;
  submitAnswer: (answer: unknown) => void;
  /** Last submit's ack (also embedded in the question screen). */
  lastAck: WlAnswerAck | null;
}

export function useWlLive(tournamentId: string, role: 'player' | 'spectator'): WlLiveState {
  const selfUserId = useAuthStore((s) => s.user?.id ?? null);
  const [connected, setConnected] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [denied, setDenied] = useState<WlLiveState['denied']>(null);
  const [screen, setScreen] = useState<WlLiveScreen>({ kind: 'waiting' });
  const [board, setBoard] = useState<WlBoardRow[]>([]);
  const [score, setScore] = useState(0);
  const [gameIndex, setGameIndex] = useState(0);
  const [lastAck, setLastAck] = useState<WlAnswerAck | null>(null);

  const lastSeqRef = useRef(-1);
  const clockOffsetRef = useRef(0);
  const currentAttemptRef = useRef<WlDispatchEventPayload | null>(null);
  const answeredRef = useRef<WlAnswerAck | null>(null);

  const serverNow = useCallback(() => Date.now() + clockOffsetRef.current, []);

  useEffect(() => {
    const socket = connectSocket();
    let disposed = false;

    const accept = (event: WlEventPayload): boolean => {
      if (event.tournamentId !== tournamentId) return false;
      if (event.seq <= lastSeqRef.current) return false;
      lastSeqRef.current = event.seq;
      clockOffsetRef.current = event.serverNowAtEmit - Date.now();
      return true;
    };

    const onDispatch = (event: WlDispatchEventPayload) => {
      if (!accept(event)) return;
      // First slot of a game — a fresh per-game score.
      if (event.round_index === 0 && event.question_index === 0) setScore(0);
      currentAttemptRef.current = event;
      answeredRef.current = null;
      setGameIndex(event.game_index);
      setLastAck(null);
      setScreen({ kind: 'question', attempt: event, answer: null });
    };

    const onReveal = (event: WlRevealEventPayload) => {
      if (!accept(event)) return;
      setBoard(event.board ?? []);
      const attempt = currentAttemptRef.current;
      // Only pause on the reveal when it closes the question being shown;
      // late reveals (after the next dispatch) just refresh the board.
      if (attempt && attempt.attempt_id === event.attempt_id) {
        setScreen({ kind: 'reveal', attempt, reveal: event, answer: answeredRef.current });
      }
    };

    const onVoid = (event: WlEventPayload) => {
      if (!accept(event)) return;
      const voided = event as { attempt_id?: string };
      if (currentAttemptRef.current?.attempt_id === voided.attempt_id) {
        currentAttemptRef.current = null;
        setScreen({ kind: 'waiting' });
      }
    };

    const onGameResult = (event: WlGameResultEventPayload) => {
      if (!accept(event)) return;
      setBoard(event.board ?? []);
      currentAttemptRef.current = null;
      const eliminated = selfUserId != null && event.eliminated_user_ids.includes(selfUserId);
      setScreen({ kind: 'game_result', result: event, eliminated });
    };

    const onFinalResult = (event: WlFinalResultEventPayload) => {
      if (!accept(event)) return;
      setBoard(event.board ?? []);
      currentAttemptRef.current = null;
      setScreen({
        kind: 'final_result',
        result: event,
        champion: selfUserId != null && event.champion_user_id === selfUserId,
      });
    };

    const onPhase = (event: WlEventPayload) => {
      accept(event); // keep cursor + clock fresh; screens flow from the other events
    };

    const onCancellation = (event: WlEventPayload) => {
      if (!accept(event)) return;
      setScreen({ kind: 'cancelled' });
    };

    socket.on('wl:dispatch', onDispatch);
    socket.on('wl:reveal', onReveal);
    socket.on('wl:void', onVoid);
    socket.on('wl:game_result', onGameResult);
    socket.on('wl:final_result', onFinalResult);
    socket.on('wl:phase', onPhase);
    socket.on('wl:clue_reveal', onPhase);
    socket.on('wl:cancellation', onCancellation);

    const subscribe = () => {
      socket.emit('wl:subscribe', { tournament_id: tournamentId, role }, (result) => {
        if (disposed) return;
        if (!result.ok) {
          setDenied(result.reason ?? 'invalid');
          setSubscribed(false);
          return;
        }
        // The role cursor marks the stream head at join — older events are
        // gone (and unnecessary; payloads are absolute). Never move the
        // cursor backwards on a resubscribe.
        lastSeqRef.current = Math.max(lastSeqRef.current, result.seq ?? -1);
        setDenied(null);
        setSubscribed(true);
      });
    };

    const onConnect = () => {
      setConnected(true);
      subscribe(); // also runs on every reconnect — rooms don't survive disconnects
    };
    const onDisconnect = () => {
      setConnected(false);
      setSubscribed(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();

    return () => {
      disposed = true;
      socket.emit('wl:unsubscribe');
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('wl:dispatch', onDispatch);
      socket.off('wl:reveal', onReveal);
      socket.off('wl:void', onVoid);
      socket.off('wl:game_result', onGameResult);
      socket.off('wl:final_result', onFinalResult);
      socket.off('wl:phase', onPhase);
      socket.off('wl:clue_reveal', onPhase);
      socket.off('wl:cancellation', onCancellation);
    };
  }, [tournamentId, role, selfUserId]);

  const submitAnswer = useCallback(
    (answer: unknown) => {
      const attempt = currentAttemptRef.current;
      if (!attempt || role !== 'player' || answeredRef.current) return;
      const socket = connectSocket();
      socket.emit(
        'wl:answer',
        { tournament_id: tournamentId, attempt_id: attempt.attempt_id, answer },
        (ack) => {
          answeredRef.current = ack;
          setLastAck(ack);
          if (ack.accepted) setScore((s) => s + ack.points);
          setScreen((current) =>
            current.kind === 'question' && current.attempt.attempt_id === attempt.attempt_id
              ? { ...current, answer: ack }
              : current,
          );
        },
      );
    },
    [tournamentId, role],
  );

  return useMemo(
    () => ({
      connected,
      subscribed,
      denied,
      screen,
      board,
      score,
      gameIndex,
      serverNow,
      submitAnswer,
      lastAck,
    }),
    [connected, subscribed, denied, screen, board, score, gameIndex, serverNow, submitAnswer, lastAck],
  );
}
