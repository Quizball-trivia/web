'use client';

/**
 * Owns the score-flight machinery for the party quiz screen — the
 * animated "+points" splashes that fly from the chosen answer chip into
 * each player's standings avatar.
 *
 * Returns the live flight state + the bookkeeping refs the view-model
 * needs to compute `standings` (so the displayed total can hold at the
 * old value while a flight is in transit, then snap to the new total
 * when it lands).
 *
 * Three orchestrating effects fire flights:
 *   1. Optimistic self flight on `state.selectedAnswer` (before the
 *      server ack arrives).
 *   2. Authoritative self flight on `answerAck` (idempotent against the
 *      optimistic flight via a per-question key).
 *   3. Authoritative flight per other player on `state.roundResult`.
 *
 * A separate live-score useLayoutEffect drives the small "+N" delta
 * chips next to opponent rows whenever their `totalPoints` changes
 * before the round resolves.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  MatchAnswerAckPayload,
  MatchPartyStatePayload,
  MatchRoundResultPayload,
  ResolvedMatchQuestionPayload,
} from '@/lib/realtime/socket.types';

import type { ScoreFlight } from './partyQuizScreen.types';
import {
  PARTY_FAILED_FLIGHT_MS,
  PARTY_SUCCESS_FLIGHT_MS,
  isUsableScoreAnchor,
} from './partyQuizScreen.helpers';

interface UsePartyScoreFlightsArgs {
  mobileStandingsPlacement: 'bottom-bar' | 'below-options';
  partyState: MatchPartyStatePayload | null;
  currentQuestion: ResolvedMatchQuestionPayload | null;
  answerAck: MatchAnswerAckPayload | null;
  selfUserId: string | null;
  roundResolved: boolean;
  roundResult: MatchRoundResultPayload | null;
  selectedAnswer: number | null;
  selectedAnswerQIndex: number | undefined;
  correctIndex: number | undefined;
  timeRemaining: number;
}

export interface PartyScoreFlightsResult {
  scoreFlights: ScoreFlight[];
  displayedTotalsByUserId: Record<string, number>;
  liveScoreDeltas: Record<string, number>;
  pendingDisplayedTotalsRef: React.MutableRefObject<Map<string, number>>;
  previousPartyTotalsRef: React.MutableRefObject<Map<string, number>>;
}

export function usePartyScoreFlights({
  mobileStandingsPlacement,
  partyState,
  currentQuestion,
  answerAck,
  selfUserId,
  roundResolved,
  roundResult,
  selectedAnswer,
  selectedAnswerQIndex,
  correctIndex,
  timeRemaining,
}: UsePartyScoreFlightsArgs): PartyScoreFlightsResult {
  const [scoreFlights, setScoreFlights] = useState<ScoreFlight[]>([]);
  const [liveScoreDeltas, setLiveScoreDeltas] = useState<Record<string, number>>({});
  const [displayedTotalsByUserId, setDisplayedTotalsByUserId] = useState<Record<string, number>>({});

  const splashQuestionRef = useRef<number | null>(null);
  const scoreFlightIdRef = useRef(0);
  const spawnedFlightKeysRef = useRef(new Set<string>());
  const liveDeltaShownKeysRef = useRef(new Set<string>());
  const liveFlightShownKeysRef = useRef(new Set<string>());
  const liveDeltaTimeoutsRef = useRef(new Map<string, number>());
  const flightTimersRef = useRef(new Set<number>());
  const previousPartyTotalsRef = useRef(new Map<string, number>());
  const previousPartyAnsweredRef = useRef(new Map<string, boolean>());
  const pendingDisplayedTotalsRef = useRef(new Map<string, number>());

  const commitDisplayedTotal = useCallback((userId: string, totalPoints: number) => {
    pendingDisplayedTotalsRef.current.delete(userId);
    setDisplayedTotalsByUserId((current) => {
      if (current[userId] === totalPoints) return current;
      return { ...current, [userId]: totalPoints };
    });
  }, []);

  const findScoreAnchor = useCallback((userId: string): HTMLElement | null => {
    const anchors = Array.from(document.querySelectorAll<HTMLElement>('[data-party-score-anchor]'))
      .filter((element) => element.dataset.partyScoreAnchor === userId && isUsableScoreAnchor(element));
    if (anchors.length === 0) return null;

    const preferredPlacement = window.innerWidth >= 1024
      ? 'desktop'
      : mobileStandingsPlacement === 'below-options'
        ? 'mobile-inline'
        : 'mobile-bottom';
    return anchors.find((element) => element.dataset.partyScoreAnchorPlacement === preferredPlacement)
      ?? anchors[0]
      ?? null;
  }, [mobileStandingsPlacement]);

  const spawnScoreFlightFromRects = useCallback((params: {
    userId: string;
    qIndex: number;
    points: number;
    keyPrefix: string;
    sourceRect: DOMRect;
    targetRect: DOMRect;
    failed?: boolean;
    holdTotal?: number;
    targetTotal?: number;
  }) => {
    const failed = params.failed === true || params.points <= 0;
    if (!failed && params.points <= 0) return false;
    const flightKey = `${params.keyPrefix}:${params.qIndex}:${params.userId}`;
    if (spawnedFlightKeysRef.current.has(flightKey)) return true;
    if (
      params.sourceRect.width <= 0 ||
      params.sourceRect.height <= 0 ||
      params.targetRect.width <= 0 ||
      params.targetRect.height <= 0
    ) {
      return false;
    }

    spawnedFlightKeysRef.current.add(flightKey);
    const id = `party-score-flight-${scoreFlightIdRef.current++}`;
    const flight: ScoreFlight = {
      id,
      userId: params.userId,
      points: Math.max(0, params.points),
      from: {
        x: params.sourceRect.left + params.sourceRect.width / 2,
        y: params.sourceRect.top + params.sourceRect.height / 2,
      },
      to: {
        x: params.targetRect.left + params.targetRect.width / 2,
        y: params.targetRect.top + params.targetRect.height / 2,
      },
      failed,
      targetTotal: params.targetTotal,
    };

    if (params.targetTotal != null && params.holdTotal != null) {
      const holdTotal = params.holdTotal;
      pendingDisplayedTotalsRef.current.set(params.userId, params.targetTotal);
      setDisplayedTotalsByUserId((current) => ({ ...current, [params.userId]: holdTotal }));
    }

    setScoreFlights((current) => [...current, flight]);
    const timeoutId = window.setTimeout(() => {
      flightTimersRef.current.delete(timeoutId);
      if (params.targetTotal != null) {
        commitDisplayedTotal(
          params.userId,
          pendingDisplayedTotalsRef.current.get(params.userId) ?? params.targetTotal,
        );
      }
      setScoreFlights((current) => current.filter((item) => item.id !== id));
    }, failed ? PARTY_FAILED_FLIGHT_MS + 120 : PARTY_SUCCESS_FLIGHT_MS + 120);
    flightTimersRef.current.add(timeoutId);
    return true;
  }, [commitDisplayedTotal]);

  const spawnScoreFlight = useCallback((params: {
    userId: string;
    qIndex: number;
    selectedIndex: number | null | undefined;
    points: number;
    keyPrefix: string;
    failed?: boolean;
    holdTotal?: number;
    targetTotal?: number;
  }) => {
    const failed = params.failed === true || params.points <= 0;
    if (params.selectedIndex == null) return;
    const flightKey = `${params.keyPrefix}:${params.qIndex}:${params.userId}`;
    if (spawnedFlightKeysRef.current.has(flightKey)) return;

    const source = document.querySelector<HTMLElement>(
      `[data-mcq-option-index="${params.selectedIndex}"]`,
    );
    const target = findScoreAnchor(params.userId);
    if (!source || !target) return;

    return spawnScoreFlightFromRects({
      userId: params.userId,
      qIndex: params.qIndex,
      points: params.points,
      keyPrefix: params.keyPrefix,
      sourceRect: source.getBoundingClientRect(),
      targetRect: target.getBoundingClientRect(),
      failed,
      holdTotal: params.holdTotal,
      targetTotal: params.targetTotal,
    });
  }, [findScoreAnchor, spawnScoreFlightFromRects]);

  const spawnLiveScoreFlight = useCallback((params: {
    userId: string;
    qIndex: number;
    points: number;
    failed?: boolean;
    holdTotal?: number;
    targetTotal?: number;
  }) => {
    const source = document.querySelector<HTMLElement>('[data-party-live-score-source]');
    const target = findScoreAnchor(params.userId);
    if (!source || !target) return false;

    return spawnScoreFlightFromRects({
      userId: params.userId,
      qIndex: params.qIndex,
      points: params.points,
      keyPrefix: 'live',
      sourceRect: source.getBoundingClientRect(),
      targetRect: target.getBoundingClientRect(),
      failed: params.failed,
      holdTotal: params.holdTotal,
      targetTotal: params.targetTotal,
    });
  }, [findScoreAnchor, spawnScoreFlightFromRects]);

  useEffect(() => {
    setDisplayedTotalsByUserId({});
    pendingDisplayedTotalsRef.current.clear();
    spawnedFlightKeysRef.current.clear();
    liveDeltaShownKeysRef.current.clear();
    liveFlightShownKeysRef.current.clear();
    previousPartyTotalsRef.current.clear();
    previousPartyAnsweredRef.current.clear();
    // Cancel any in-flight commit timers so a flight scheduled in the previous
    // match can't fire a stale total into the new match.
    for (const timeoutId of flightTimersRef.current) {
      window.clearTimeout(timeoutId);
    }
    flightTimersRef.current.clear();
  }, [partyState?.matchId]);

  useEffect(() => {
    return () => {
      for (const timeoutId of liveDeltaTimeoutsRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      liveDeltaTimeoutsRef.current.clear();
      for (const timeoutId of flightTimersRef.current) {
        window.clearTimeout(timeoutId);
      }
      flightTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    setLiveScoreDeltas({});
    liveDeltaShownKeysRef.current.clear();
    liveFlightShownKeysRef.current.clear();
    previousPartyAnsweredRef.current.clear();
    for (const timeoutId of liveDeltaTimeoutsRef.current.values()) {
      window.clearTimeout(timeoutId);
    }
    liveDeltaTimeoutsRef.current.clear();
  }, [currentQuestion?.qIndex]);

  useLayoutEffect(() => {
    if (!partyState) return;

    const qIndex = currentQuestion?.qIndex ?? partyState.currentQuestionIndex;
    const previousTotals = previousPartyTotalsRef.current;
    const previousAnswered = previousPartyAnsweredRef.current;
    const nextTotals = new Map<string, number>();
    const nextAnswered = new Map<string, boolean>();
    const nextDeltas: Record<string, number> = {};

    for (const player of partyState.players) {
      nextTotals.set(player.userId, player.totalPoints);
      nextAnswered.set(player.userId, player.answered);
      const previousTotal = previousTotals.get(player.userId);
      const hadPreviousState = previousTotal != null || previousAnswered.has(player.userId);
      const wasAnswered = previousAnswered.get(player.userId) ?? false;
      const delta = previousTotal == null ? 0 : player.totalPoints - previousTotal;
      const becameAnswered = hadPreviousState && player.answered && !wasAnswered;
      const deltaKey = `${qIndex}:${player.userId}`;

      if (
        qIndex != null &&
        player.userId !== selfUserId &&
        (delta > 0 || becameAnswered) &&
        !roundResolved &&
        !liveDeltaShownKeysRef.current.has(deltaKey)
      ) {
        const failed = delta <= 0;
        liveDeltaShownKeysRef.current.add(deltaKey);
        if (delta > 0) {
          nextDeltas[player.userId] = delta;
        }
        const animated = spawnLiveScoreFlight({
          userId: player.userId,
          qIndex,
          points: Math.max(0, delta),
          failed,
          holdTotal: previousTotal ?? player.totalPoints - Math.max(0, delta),
          targetTotal: delta > 0 ? player.totalPoints : undefined,
        });
        if (animated) {
          liveFlightShownKeysRef.current.add(deltaKey);
        } else if (delta > 0) {
          commitDisplayedTotal(player.userId, player.totalPoints);
        }

        const existingTimeout = liveDeltaTimeoutsRef.current.get(player.userId);
        if (existingTimeout) window.clearTimeout(existingTimeout);

        const timeoutId = window.setTimeout(() => {
          setLiveScoreDeltas((current) => {
            const { [player.userId]: _removed, ...rest } = current;
            return rest;
          });
          liveDeltaTimeoutsRef.current.delete(player.userId);
        }, 1500);
        liveDeltaTimeoutsRef.current.set(player.userId, timeoutId);
      }
    }

    previousPartyTotalsRef.current = nextTotals;
    previousPartyAnsweredRef.current = nextAnswered;
    if (Object.keys(nextDeltas).length > 0) {
      setLiveScoreDeltas((current) => ({ ...current, ...nextDeltas }));
    }
  }, [commitDisplayedTotal, currentQuestion?.qIndex, partyState, selfUserId, spawnLiveScoreFlight, roundResolved]);

  // Instant local flight for party quiz. The server still authoritatively
  // confirms totals, but party questions include correctIndex so the click can
  // feel as immediate as ranked possession.
  useLayoutEffect(() => {
    if (selectedAnswer === null || typeof correctIndex !== 'number') return;
    if (selectedAnswerQIndex == null) return;
    if (splashQuestionRef.current === selectedAnswerQIndex) return;
    if (!selfUserId) return;

    splashQuestionRef.current = selectedAnswerQIndex;
    const isCorrect = selectedAnswer === correctIndex;
    const points = isCorrect ? Math.max(0, Math.min(100, timeRemaining * 10)) : 0;
    const currentTotal = partyState?.players.find((player) => player.userId === selfUserId)?.totalPoints ?? 0;
    const holdTotal = displayedTotalsByUserId[selfUserId] ?? currentTotal;
    spawnScoreFlight({
      userId: selfUserId,
      qIndex: selectedAnswerQIndex,
      selectedIndex: selectedAnswer,
      points,
      keyPrefix: 'optimistic',
      failed: !isCorrect || points <= 0,
      holdTotal,
      targetTotal: points > 0 ? holdTotal + points : undefined,
    });
  }, [
    displayedTotalsByUserId,
    partyState?.players,
    selfUserId,
    spawnScoreFlight,
    correctIndex,
    selectedAnswer,
    selectedAnswerQIndex,
    timeRemaining,
  ]);

  useEffect(() => {
    if (!answerAck || !selfUserId) return;
    const optimisticKey = `optimistic:${answerAck.qIndex}:${selfUserId}`;
    if (spawnedFlightKeysRef.current.has(optimisticKey)) {
      if (answerAck.pointsEarned > 0) {
        pendingDisplayedTotalsRef.current.set(selfUserId, answerAck.myTotalPoints);
      }
      return;
    }
    const failed = !answerAck.isCorrect || answerAck.pointsEarned <= 0;
    const holdTotal = Math.max(0, answerAck.myTotalPoints - Math.max(0, answerAck.pointsEarned));
    const animated = spawnScoreFlight({
      userId: selfUserId,
      qIndex: answerAck.qIndex,
      selectedIndex: answerAck.selectedIndex,
      points: answerAck.pointsEarned,
      keyPrefix: 'ack',
      failed,
      holdTotal,
      targetTotal: answerAck.pointsEarned > 0 ? answerAck.myTotalPoints : undefined,
    });
    if (!animated && answerAck.pointsEarned > 0) {
      commitDisplayedTotal(selfUserId, answerAck.myTotalPoints);
    }
  }, [answerAck, commitDisplayedTotal, selfUserId, spawnScoreFlight]);

  // Reset splash ref when question changes
  useEffect(() => {
    if (currentQuestion?.qIndex == null) {
      splashQuestionRef.current = null;
    }
  }, [currentQuestion?.qIndex]);

  useEffect(() => {
    const qIndex = roundResult?.qIndex;
    if (qIndex == null) return;

    for (const [userId, player] of Object.entries(roundResult?.players ?? {})) {
      const ackFlightKey = `ack:${qIndex}:${userId}`;
      const optimisticFlightKey = `optimistic:${qIndex}:${userId}`;
      if (
        userId === selfUserId &&
        (
          (answerAck?.qIndex === qIndex && spawnedFlightKeysRef.current.has(ackFlightKey)) ||
          spawnedFlightKeysRef.current.has(optimisticFlightKey)
        )
      ) {
        continue;
      }
      const failed = !player.isCorrect || player.pointsEarned <= 0;
      if (liveFlightShownKeysRef.current.has(`${qIndex}:${userId}`)) continue;
      const targetTotal = player.totalPoints;
      const holdTotal = Math.max(0, targetTotal - Math.max(0, player.pointsEarned));
      const animated = spawnScoreFlight({
        userId,
        qIndex,
        selectedIndex: player.selectedIndex,
        points: player.pointsEarned,
        keyPrefix: 'round',
        failed,
        holdTotal,
        targetTotal: player.pointsEarned > 0 ? targetTotal : undefined,
      });
      if (!animated && player.pointsEarned > 0) {
        commitDisplayedTotal(userId, targetTotal);
      }
    }
  }, [answerAck?.qIndex, commitDisplayedTotal, selfUserId, spawnScoreFlight, roundResult]);

  return {
    scoreFlights,
    displayedTotalsByUserId,
    liveScoreDeltas,
    pendingDisplayedTotalsRef,
    previousPartyTotalsRef,
  };
}
