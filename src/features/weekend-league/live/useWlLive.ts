'use client';

// Weekend League live-game client: one socket subscription (player or
// spectator) driving a screen state machine off the wl:* event stream.
//
// Ordering: every event carries a tournament-scoped `seq`; the subscribe ack
// returns the role cursor (live vs delayed stream head), and anything at or
// below the last seen seq is dropped. Gaps need no replay — dispatches are
// self-contained and reveal/game_result payloads carry ABSOLUTE standings, so
// the next event of each kind fully supersedes whatever was missed. All
// cursor/board/score state resets when the (tournament, role) target changes.
//
// Clocks: playableAt/deadlineAt are server-clock ms. The offset estimate keeps
// the MAX of (serverNowAtEmit − localNow) samples — the sample with the least
// network latency dominates, so countdowns lag the server as little as
// possible. Spectator dispatches arrive ~30s after the live window; their
// attempt window is remapped onto the delayed emission time so replay timing
// matches what live players experienced.
//
// Scoring: per-attempt, exactly once. An accepted ack adds points only the
// first time for that attempt; a void event refunds them (the backend zeroes
// accepted answers on voided attempts).

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
  WlSubscribeSnapshot,
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
  /** Bumps when a rejected ack unlocks the question — UIs reset their choice. */
  retryNonce: number;
  /** Snapshot-restored money-drop budget for a specific attempt (reconnects). */
  snapshotMoneyBudget: { attemptId: string; budget: number } | null;
}

export function useWlLive(tournamentId: string, role: 'player' | 'spectator'): WlLiveState {
  const selfUserId = useAuthStore((s) => s.user?.id ?? null);
  const [connected, setConnected] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [denied, setDenied] = useState<WlLiveState['denied']>(null);
  const [screen, setScreen] = useState<WlLiveScreen>({ kind: 'waiting' });
  const [board, setBoard] = useState<WlBoardRow[]>([]);
  const [score, setScore] = useState(0);
  const [snapshotMoneyBudget, setSnapshotMoneyBudget] = useState<{ attemptId: string; budget: number } | null>(null);
  const [gameIndex, setGameIndex] = useState(0);
  const [lastAck, setLastAck] = useState<WlAnswerAck | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const lastSeqRef = useRef(-1);
  const screenRef = useRef<WlLiveScreen>({ kind: 'waiting' });
  const clockOffsetRef = useRef(Number.NEGATIVE_INFINITY);
  const currentAttemptRef = useRef<WlDispatchEventPayload | null>(null);
  const answeredRef = useRef<WlAnswerAck | null>(null);
  const inFlightRef = useRef<string | null>(null);
  /** attempt_id → points credited to the local score (for void refunds). */
  const scoredRef = useRef<Map<string, number>>(new Map());
  const lastGameIndexRef = useRef<number | null>(null);
  const pendingQuestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Any event accepted since the LAST subscribe emit (not since mount). */
  const eventSinceSubscribeRef = useRef(false);
  /** A void arrived since the last subscribe — the snapshot score may
      predate it, so the authoritative-max merge must not resurrect it. */
  const voidSinceSubscribeRef = useRef(false);

  const serverNow = useCallback(
    () => Date.now() + (Number.isFinite(clockOffsetRef.current) ? clockOffsetRef.current : 0),
    [],
  );

  useEffect(() => {
    const socket = connectSocket();
    let disposed = false;

    // Fresh target (tournament/role) — nothing from the previous stream may
    // leak: the new tournament's seqs restart lower, so a stale cursor would
    // silently discard every event forever.
    lastSeqRef.current = -1;
    clockOffsetRef.current = Number.NEGATIVE_INFINITY;
    currentAttemptRef.current = null;
    answeredRef.current = null;
    inFlightRef.current = null;
    scoredRef.current = new Map();
    lastGameIndexRef.current = null;
    screenRef.current = { kind: 'waiting' };
    setScreen({ kind: 'waiting' });
    setBoard([]);
    setScore(0);
    setGameIndex(0);
    setLastAck(null);
    setDenied(null);

    const accept = (event: WlEventPayload): boolean => {
      if (event.tournamentId !== tournamentId) return false;
      if (event.seq <= lastSeqRef.current) return false;
      lastSeqRef.current = event.seq;
      eventSinceSubscribeRef.current = true;
      // Max over samples: the least-latency packet gives the best estimate.
      clockOffsetRef.current = Math.max(
        clockOffsetRef.current,
        event.serverNowAtEmit - Date.now(),
      );
      return true;
    };

    const clearPendingQuestion = () => {
      if (pendingQuestionTimerRef.current != null) {
        clearTimeout(pendingQuestionTimerRef.current);
        pendingQuestionTimerRef.current = null;
      }
    };

    const apply = (next: WlLiveScreen) => {
      screenRef.current = next;
      setScreen(next);
    };

    const showQuestion = (attempt: WlDispatchEventPayload) => {
      if (disposed || currentAttemptRef.current?.attempt_id !== attempt.attempt_id) return;
      apply({ kind: 'question', attempt, answer: answeredRef.current });
    };

    const onDispatch = (event: WlDispatchEventPayload) => {
      if (!accept(event)) return;
      // Spectators replay a 30s-delayed stream: the original live window is
      // long gone, so replay it relative to this (delayed) emission.
      const attempt: WlDispatchEventPayload = event.spectator
        ? {
            ...event,
            playableAt: event.serverNowAtEmit,
            deadlineAt: event.serverNowAtEmit + (event.deadlineAt - event.playableAt),
          }
        : event;
      // New game (first slot missed or not): reset the per-game score.
      if (lastGameIndexRef.current !== attempt.game_index) {
        lastGameIndexRef.current = attempt.game_index;
        setScore(0);
        scoredRef.current = new Map();
      }
      // A re-broadcast (or snapshot-then-event overlap) of the SAME attempt
      // must not wipe an answer already given to it.
      const sameAttempt = currentAttemptRef.current?.attempt_id === attempt.attempt_id;
      currentAttemptRef.current = attempt;
      if (!sameAttempt) {
        answeredRef.current = null;
        inFlightRef.current = null;
        setLastAck(null);
      }
      setGameIndex(attempt.game_index);
      clearPendingQuestion();
      // Show the new question IMMEDIATELY: the dispatch lead IS the reading
      // grace (timer held at full until playableAt), and round intros render
      // inside it. Holding the old reveal here consumed the entire lead and
      // no player ever saw the grace. The round-end standings beat is
      // protected server-side by the 6s breather, not by this hold.
      apply({ kind: 'question', attempt, answer: answeredRef.current });
    };

    const onReveal = (event: WlRevealEventPayload) => {
      if (!accept(event)) return;
      setBoard(event.board ?? []);
      const attempt = currentAttemptRef.current;
      // Only pause on the reveal when it closes the question being shown;
      // late reveals (after the next dispatch) just refresh the board.
      if (attempt && attempt.attempt_id === event.attempt_id) {
        // The attempt is over — a pending timer must not resurrect its
        // (now expired) question screen over this reveal.
        clearPendingQuestion();
        apply({ kind: 'reveal', attempt, reveal: event, answer: answeredRef.current });
      }
    };

    const onVoid = (event: WlEventPayload) => {
      if (!accept(event)) return;
      voidSinceSubscribeRef.current = true;
      const voided = event as { attempt_id?: string };
      const attemptId = voided.attempt_id;
      // The backend zeroes every accepted answer on a voided attempt — refund
      // any points we credited locally.
      if (attemptId && scoredRef.current.has(attemptId)) {
        const pts = scoredRef.current.get(attemptId)!;
        scoredRef.current.delete(attemptId);
        setScore((s) => Math.max(0, s - pts));
      }
      if (currentAttemptRef.current?.attempt_id === attemptId) {
        currentAttemptRef.current = null;
        answeredRef.current = null;
        inFlightRef.current = null;
        clearPendingQuestion();
        apply({ kind: 'waiting' });
      }
    };

    const onGameResult = (event: WlGameResultEventPayload) => {
      if (!accept(event)) return;
      setBoard(event.board ?? []);
      currentAttemptRef.current = null;
      clearPendingQuestion();
      const eliminated =
        selfUserId != null && (event.eliminated_user_ids ?? []).includes(selfUserId);
      apply({ kind: 'game_result', result: event, eliminated });
    };

    const onFinalResult = (event: WlFinalResultEventPayload) => {
      if (!accept(event)) return;
      setBoard(event.board ?? []);
      currentAttemptRef.current = null;
      clearPendingQuestion();
      apply({
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
      clearPendingQuestion();
      apply({ kind: 'cancelled' });
    };

    socket.on('wl:dispatch', onDispatch);
    socket.on('wl:reveal', onReveal);
    socket.on('wl:void', onVoid);
    socket.on('wl:game_result', onGameResult);
    socket.on('wl:final_result', onFinalResult);
    socket.on('wl:phase', onPhase);
    socket.on('wl:clue_reveal', onPhase);
    socket.on('wl:cancellation', onCancellation);

    const hydrate = (snapshot: WlSubscribeSnapshot) => {
      clockOffsetRef.current = Math.max(
        clockOffsetRef.current,
        snapshot.server_now - Date.now(),
      );
      if (snapshot.attempt != null && typeof snapshot.money_budget === 'number') {
        setSnapshotMoneyBudget({ attemptId: snapshot.attempt.attempt_id, budget: snapshot.money_budget });
      }
      // Room events can beat the ack callback (the server emits to the room
      // the moment we join, before the ack round-trips). If ANY event has
      // arrived since this subscribe was sent, the live stream is ahead of
      // the snapshot — never regress the screen. But recovery of a dropped
      // ack must still work: when the snapshot describes the SAME attempt
      // the stream has current (and the same game), merge in the stored
      // answer and the authoritative score without touching the screen kind.
      if (eventSinceSubscribeRef.current) {
        setBoard((current) => (current.length > 0 ? current : snapshot.board ?? []));
        // The authoritative score stands per game even when the snapshot's
        // attempt is already gone (it froze between our answer and the
        // reconnect) — local score can only be missing acks, never ahead.
        // Unless a VOID raced past the ack: the snapshot may then include
        // points the void just took away, so skip the merge (the next
        // reveal board is absolute and self-corrects).
        if (snapshot.game_index === lastGameIndexRef.current && !voidSinceSubscribeRef.current) {
          setScore((s) => Math.max(s, snapshot.score));
        }
        // Recover the caller's verdict for whatever the screen shows:
        // the active attempt (your_answer) or an already-frozen one
        // (your_last_answer, attempt-identified).
        const cur = screenRef.current;
        const curAttempt = currentAttemptRef.current;
        if (
          curAttempt &&
          snapshot.attempt?.attempt_id === curAttempt.attempt_id &&
          snapshot.game_index === lastGameIndexRef.current &&
          answeredRef.current == null &&
          snapshot.your_answer
        ) {
          const priorAck: WlAnswerAck = { accepted: true, ...snapshot.your_answer };
          answeredRef.current = priorAck;
          scoredRef.current.set(curAttempt.attempt_id, snapshot.your_answer.points);
          if (cur.kind === 'question' && cur.attempt.attempt_id === curAttempt.attempt_id) {
            apply({ ...cur, answer: priorAck });
          } else if (cur.kind === 'reveal' && cur.reveal.attempt_id === curAttempt.attempt_id) {
            apply({ ...cur, answer: priorAck });
          }
        } else if (
          cur.kind === 'reveal' &&
          cur.answer == null &&
          snapshot.your_last_answer?.attempt_id === cur.reveal.attempt_id
        ) {
          // The attempt froze before the snapshot was built — the persisted
          // answer still carries the verdict for the reveal on screen.
          apply({ ...cur, answer: { accepted: true, ...snapshot.your_last_answer } });
        }
        return;
      }
      setBoard(snapshot.board ?? []);
      setGameIndex(snapshot.game_index);
      lastGameIndexRef.current = snapshot.game_index;
      scoredRef.current = new Map();
      // The snapshot score is authoritative (persisted + in-flight accepted).
      setScore(snapshot.score);
      if (snapshot.status === 'cancelled' || snapshot.status === 'voided') {
        currentAttemptRef.current = null;
        clearPendingQuestion();
        apply({ kind: 'cancelled' });
        return;
      }
      const attempt = snapshot.attempt;
      if (attempt && attempt.deadlineAt > serverNow()) {
        const restored: WlDispatchEventPayload = {
          ...attempt,
          type: 'dispatch',
          tournamentId,
          seq: lastSeqRef.current,
          serverNowAtEmit: snapshot.server_now,
        };
        const priorAck: WlAnswerAck | null = snapshot.your_answer
          ? { accepted: true, ...snapshot.your_answer }
          : null;
        currentAttemptRef.current = restored;
        answeredRef.current = priorAck;
        inFlightRef.current = null;
        if (priorAck?.accepted) {
          scoredRef.current.set(attempt.attempt_id, priorAck.points);
        }
        clearPendingQuestion();
        apply({ kind: 'question', attempt: restored, answer: priorAck });
      } else if (screenRef.current.kind === 'question') {
        // The question we were on is over and nothing newer is in flight.
        currentAttemptRef.current = null;
        clearPendingQuestion();
        apply({ kind: 'waiting' });
      }
    };

    const subscribe = () => {
      eventSinceSubscribeRef.current = false;
      voidSinceSubscribeRef.current = false;
      // A resubscribe reports the last seq this client actually received so
      // the server backfills events broadcast while the socket was down.
      // Best-effort: if a newer live event races ahead of the backfill the
      // monotonic gate below drops the replay, which is exactly today's
      // behavior — screens are absolute payloads and self-heal on the next
      // event, so no ordering machinery is worth the race-defense cost here.
      socket.emit('wl:subscribe', {
        tournament_id: tournamentId,
        role,
        ...(lastSeqRef.current > 0 ? { last_seq: lastSeqRef.current } : {}),
      }, (result) => {
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
        if (result.snapshot) hydrate(result.snapshot);
      });
    };

    const onConnect = () => {
      setConnected(true);
      subscribe(); // also runs on every reconnect — rooms don't survive disconnects
    };
    const onDisconnect = () => {
      // Socket.IO discards pending ack callbacks on disconnect — a submit
      // that was in flight will never resolve, so unlock it for a retry
      // (the backend dedupes and returns the stored result idempotently).
      // The choice UI holds its pick until retryNonce bumps; without this an
      // unanswered question stays functionally locked after the reconnect.
      inFlightRef.current = null;
      if (answeredRef.current == null && currentAttemptRef.current != null) {
        setRetryNonce((n) => n + 1);
      }
      setConnected(false);
      setSubscribed(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();

    return () => {
      disposed = true;
      clearPendingQuestion();
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
    // serverNow is a stable callback (reads a ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, role, selfUserId]);

  const submitAnswer = useCallback(
    (answer: unknown) => {
      const attempt = currentAttemptRef.current;
      if (!attempt || role !== 'player') return;
      // Single-flight per attempt: no resubmits while an ack is pending, no
      // resubmits after an ACCEPTED ack. Rejections other than `duplicate`
      // (e.g. `closed` from a too-early click) unlock so the player can try
      // again inside the window.
      if (inFlightRef.current === attempt.attempt_id) return;
      const prior = answeredRef.current;
      if (prior && (prior.accepted || prior.reason === 'duplicate')) return;
      const attemptId = attempt.attempt_id;
      inFlightRef.current = attemptId;

      const send = (retriesLeft: number) => {
        // socket.timeout() rewrites ack callbacks to (err, res); our manual
        // event map doesn't model that transform, hence the local cast.
        const emitter = connectSocket().timeout(4_000) as unknown as {
          emit: (
            event: 'wl:answer',
            data: { tournament_id: string; attempt_id: string; answer: unknown },
            cb: (err: Error | null, ack?: WlAnswerAck) => void,
          ) => void;
        };
        emitter.emit(
          'wl:answer',
          { tournament_id: tournamentId, attempt_id: attemptId, answer },
          (err: Error | null, ack?: WlAnswerAck) => {
            // Scope everything to the attempt this submit belonged to — a late
            // ack for a previous attempt must not lock or score the next one.
            if (currentAttemptRef.current?.attempt_id !== attemptId) {
              if (inFlightRef.current === attemptId) inFlightRef.current = null;
              return;
            }
            if (err || !ack) {
              // Timed out / dropped. The backend accepts duplicates
              // idempotently (returns the stored result), so retrying while
              // the window is open is safe — but only while OUR lock is
              // still held (a disconnect clears it and may have already
              // allowed a fresh manual submit).
              if (inFlightRef.current !== attemptId) return;
              if (retriesLeft > 0 && attempt.deadlineAt > serverNow()) {
                send(retriesLeft - 1);
                return;
              }
              inFlightRef.current = null;
              // Give up: unlock the choice UI so the player can try again.
              setRetryNonce((n) => n + 1);
              return;
            }
            inFlightRef.current = null;
            setLastAck(ack);
            const cur = screenRef.current;
            // A reveal can race ahead of the ack — the late ack must still
            // land on the reveal screen so the personal verdict shows.
            const onThisQuestion =
              (cur.kind === 'question' && cur.attempt.attempt_id === attemptId)
              || (cur.kind === 'reveal' && cur.reveal.attempt_id === attemptId);
            if (ack.accepted || ack.reason === 'duplicate') {
              answeredRef.current = ack;
              if (ack.accepted && !scoredRef.current.has(attemptId)) {
                scoredRef.current.set(attemptId, ack.points);
                setScore((s) => s + ack.points);
              }
              if (onThisQuestion) {
                const next = { ...cur, answer: ack };
                screenRef.current = next;
                setScreen(next);
              }
            } else {
              // Rejected (closed/invalid/…): leave the question unlocked so
              // the player can answer again inside the window.
              answeredRef.current = null;
              setRetryNonce((n) => n + 1);
              if (onThisQuestion) {
                const next = { ...cur, answer: null };
                screenRef.current = next;
                setScreen(next);
              }
            }
          },
        );
      };
      send(2);
    },
    [tournamentId, role, serverNow],
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
      retryNonce,
      snapshotMoneyBudget,
    }),
    [connected, subscribed, denied, screen, board, score, gameIndex, serverNow, submitAnswer, lastAck, retryNonce, snapshotMoneyBudget],
  );
}
