'use client';

/**
 * View-model + side-effects controller for the realtime party quiz screen.
 *
 * Pulls everything the screen needs from the realtime store + game logic
 * hooks, owns the local UI state (quit modal, pause `now`, pre-round
 * ranking snapshot, score-flight bookkeeping), runs every effect that
 * drives flights / BGM / live-deltas, and returns one object of derived
 * values for the shell to render.
 *
 * The shell is a thin renderer over this hook — keep all "what does the
 * UI need to look like" decisions here, not in the JSX.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRealtimeGameLogic } from '@/lib/match/useRealtimeGameLogic';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { usePossessionFirstQuestionIntro } from '@/features/possession/hooks/usePossessionRoundTransition';
import { playBgm, stopBgm } from '@/lib/sounds/gameSounds';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type { Phase } from '@/lib/types/game.types';
import type { MatchPartyStatePayload, MatchForfeitPendingPayload, MatchFinalResultsPayload } from '@/lib/realtime/socket.types';
import { useLocale } from '@/contexts/LocaleContext';

import type {
  PartyStandingViewModel,
  RealtimePartyQuizScreenProps,
  ScoreFlight,
} from './partyQuizScreen.types';
import {
  PARTY_FAILED_FLIGHT_MS,
  PARTY_SUCCESS_FLIGHT_MS,
  buildParticipantMap,
  getRankHex,
  isUsableScoreAnchor,
  toAnswerStates,
  toRevealAnswerStates,
} from './partyQuizScreen.helpers';

type PartyPicks = Array<{
  userId: string;
  username: string;
  selectedIndex: number | null;
  isCorrect: boolean;
  accentColor: string | undefined;
}>;

export interface RealtimePartyQuizViewModel {
  // Raw store reads / hooks the shell still needs to consume directly
  partyState: MatchPartyStatePayload | null;
  forfeitPending: MatchForfeitPendingPayload | null;
  finalResults: MatchFinalResultsPayload | null;
  selfUserId: string | null;
  state: ReturnType<typeof useRealtimeGameLogic>['state'];
  actions: ReturnType<typeof useRealtimeGameLogic>['actions'];

  // UI flags
  showQuitModal: boolean;
  setShowQuitModal: (open: boolean) => void;
  firstQuestionIntroVisible: boolean;
  showMobileStandingsBelowOptions: boolean;

  // Derived from store + logic state
  pauseSeconds: number;
  forfeitPendingTitle: string;
  question: GameQuestion | null;
  answerStates: ReturnType<typeof toAnswerStates>;
  uiPhase: Phase;
  questionNumber: number;
  totalQuestions: number;
  standings: PartyStandingViewModel[];
  transitionVisible: boolean;
  transitionQuestionNumber: number;
  transitionCategoryName: string;
  showFinalizingResults: boolean;
  partyPicks: PartyPicks | undefined;

  // Score-flight output (read by the flight renderer)
  scoreFlights: ScoreFlight[];
}

export function useRealtimePartyQuizViewModel({
  mobileStandingsPlacement = 'bottom-bar',
  disableBgm = false,
}: Pick<RealtimePartyQuizScreenProps, 'mobileStandingsPlacement' | 'disableBgm'>): RealtimePartyQuizViewModel {
  const { locale } = useLocale();
  const partyState = useRealtimeMatchStore((store) => store.match?.partyState ?? null);
  const participants = useRealtimeMatchStore((store) => store.match?.participants);
  const matchCategoryName = useRealtimeMatchStore((store) => store.match?.categoryName ?? null);
  const currentQuestion = useRealtimeMatchStore((store) => store.match?.currentQuestion ?? null);
  const answerAck = useRealtimeMatchStore((store) => store.match?.answerAck ?? null);
  const finalResults = useRealtimeMatchStore((store) => store.match?.finalResults ?? null);
  const selfUserId = useRealtimeMatchStore((store) => store.selfUserId);
  const forfeitPending = useRealtimeMatchStore((store) => store.forfeitPending);
  const countdownEndsAt = useRealtimeMatchStore((store) => store.match?.countdownEndsAt ?? null);

  const firstQuestionIntroVisible = usePossessionFirstQuestionIntro({
    countdownEndsAt,
    currentQuestionIndex: currentQuestion?.qIndex ?? null,
  });
  const { state, actions } = useRealtimeGameLogic({
    transitionDelayMs: 950,
    blockReveal: firstQuestionIntroVisible,
  });

  const [showQuitModal, setShowQuitModal] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [preRoundRankingOrder, setPreRoundRankingOrder] = useState<string[]>([]);
  const [scoreFlights, setScoreFlights] = useState<ScoreFlight[]>([]);
  const [liveScoreDeltas, setLiveScoreDeltas] = useState<Record<string, number>>({});
  const [displayedTotalsByUserId, setDisplayedTotalsByUserId] = useState<Record<string, number>>({});

  const splashQuestionRef = useRef<number | null>(null);
  const scoreFlightIdRef = useRef(0);
  const spawnedFlightKeysRef = useRef(new Set<string>());
  const liveDeltaShownKeysRef = useRef(new Set<string>());
  const liveFlightShownKeysRef = useRef(new Set<string>());
  const liveDeltaTimeoutsRef = useRef(new Map<string, number>());
  const previousPartyTotalsRef = useRef(new Map<string, number>());
  const previousPartyAnsweredRef = useRef(new Map<string, boolean>());
  const pendingDisplayedTotalsRef = useRef(new Map<string, number>());
  const rankingOrderRef = useRef<string[]>(partyState?.rankingOrder ?? []);
  const participantMap = useMemo(() => buildParticipantMap(participants ?? []), [participants]);

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
    window.setTimeout(() => {
      if (params.targetTotal != null) {
        commitDisplayedTotal(
          params.userId,
          pendingDisplayedTotalsRef.current.get(params.userId) ?? params.targetTotal,
        );
      }
      setScoreFlights((current) => current.filter((item) => item.id !== id));
    }, failed ? PARTY_FAILED_FLIGHT_MS + 120 : PARTY_SUCCESS_FLIGHT_MS + 120);
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
    rankingOrderRef.current = partyState?.rankingOrder ?? [];
  }, [partyState?.rankingOrder]);

  useEffect(() => {
    setDisplayedTotalsByUserId({});
    pendingDisplayedTotalsRef.current.clear();
    spawnedFlightKeysRef.current.clear();
    liveDeltaShownKeysRef.current.clear();
    liveFlightShownKeysRef.current.clear();
    previousPartyTotalsRef.current.clear();
    previousPartyAnsweredRef.current.clear();
  }, [partyState?.matchId]);

  useEffect(() => {
    return () => {
      for (const timeoutId of liveDeltaTimeoutsRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      liveDeltaTimeoutsRef.current.clear();
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
        !state.roundResolved &&
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
  }, [commitDisplayedTotal, currentQuestion?.qIndex, partyState, selfUserId, spawnLiveScoreFlight, state.roundResolved]);

  // Snapshot the ranking order before each round for rank-shift calculation
  useEffect(() => {
    if (!rankingOrderRef.current.length) return;
    queueMicrotask(() => {
      setPreRoundRankingOrder(rankingOrderRef.current);
    });
  }, [currentQuestion?.qIndex]);

  // Tick timer during pause
  useEffect(() => {
    if (!state.matchPaused || !state.pauseUntil) return;
    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => clearInterval(intervalId);
  }, [state.matchPaused, state.pauseUntil]);

  // Instant local flight for party quiz. The server still authoritatively
  // confirms totals, but party questions include correctIndex so the click can
  // feel as immediate as ranked possession.
  useLayoutEffect(() => {
    if (state.selectedAnswer === null || typeof state.correctIndex !== 'number') return;
    if (state.selectedAnswerQIndex == null) return;
    if (splashQuestionRef.current === state.selectedAnswerQIndex) return;
    if (!selfUserId) return;

    splashQuestionRef.current = state.selectedAnswerQIndex;
    const isCorrect = state.selectedAnswer === state.correctIndex;
    const points = isCorrect ? Math.max(0, Math.min(100, state.timeRemaining * 10)) : 0;
    const currentTotal = partyState?.players.find((player) => player.userId === selfUserId)?.totalPoints ?? 0;
    const holdTotal = displayedTotalsByUserId[selfUserId] ?? currentTotal;
    spawnScoreFlight({
      userId: selfUserId,
      qIndex: state.selectedAnswerQIndex,
      selectedIndex: state.selectedAnswer,
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
    state.correctIndex,
    state.selectedAnswer,
    state.selectedAnswerQIndex,
    state.timeRemaining,
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
    const qIndex = state.roundResult?.qIndex;
    if (qIndex == null) return;

    for (const [userId, player] of Object.entries(state.roundResult?.players ?? {})) {
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
  }, [answerAck?.qIndex, commitDisplayedTotal, selfUserId, spawnScoreFlight, state.roundResult]);

  useEffect(() => {
    if (disableBgm) return;
    if (!state.startCountdownActive || state.countdownReason === 'resume') return;
    playBgm('kickoff');
  }, [disableBgm, state.countdownReason, state.startCountdownActive]);

  useEffect(() => {
    if (disableBgm) return;
    return () => stopBgm(400);
  }, [disableBgm]);

  useEffect(() => {
    if (!finalResults) return;
    stopBgm(600);
  }, [finalResults]);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const pauseSeconds = state.pauseUntil
    ? Math.max(0, Math.ceil((state.pauseUntil - nowMs) / 1000))
    : 0;
  const forfeitPendingTitle =
    forfeitPending?.reason === 'opponent_forfeit'
      ? 'Opponent forfeited'
      : forfeitPending?.reason === 'opponent_reconnect_limit'
        ? 'Opponent did not reconnect'
        : 'Match forfeited';

  const question: GameQuestion | null = useMemo(() => {
    if (!currentQuestion || currentQuestion.question.kind !== 'multipleChoice') return null;
    return {
      id: currentQuestion.question.id,
      prompt: currentQuestion.question.prompt,
      options: currentQuestion.question.options,
      correctIndex: typeof state.correctIndex === 'number' ? state.correctIndex : -1,
      categoryId: currentQuestion.question.categoryId,
      categoryName: currentQuestion.question.categoryName,
      difficulty: currentQuestion.question.difficulty,
      explanation: currentQuestion.question.explanation ?? undefined,
    };
  }, [currentQuestion, state.correctIndex]);

  const answerStates = useMemo(() => {
    const optionsCount = question?.options.length ?? 4;
    if (state.roundResolved) {
      return toRevealAnswerStates(optionsCount, state.correctIndex, state.selectedAnswer);
    }

    const selfAnsweredCorrectly =
      state.selectedAnswer !== null && typeof state.correctIndex === 'number'
        ? state.selectedAnswer === state.correctIndex
        : answerAck?.isCorrect ?? null;

    return toAnswerStates(optionsCount, state.selectedAnswer, selfAnsweredCorrectly);
  }, [answerAck?.isCorrect, question?.options.length, state.correctIndex, state.roundResolved, state.selectedAnswer]);

  const uiPhase: Phase = useMemo(() => {
    if (state.roundResolved) return 'reveal';
    return state.questionPhase === 'playing' ? 'playing' : 'question-reveal';
  }, [state.questionPhase, state.roundResolved]);

  const questionNumber = currentQuestion?.qIndex != null
    ? currentQuestion.qIndex + 1
    : (partyState?.currentQuestionIndex ?? 0) + 1;
  const totalQuestions = currentQuestion?.total ?? partyState?.totalQuestions ?? 10;

  const standings = useMemo<PartyStandingViewModel[]>(() => {
    if (!partyState) return [];

    const previousRanks = new Map(
      preRoundRankingOrder.map((userId, index) => [userId, index + 1]),
    );
    const roundPlayers = state.roundResult?.players ?? {};

    return [...partyState.players]
      .sort((left, right) => left.rank - right.rank)
      .map((player) => {
        const participant = participantMap.get(player.userId);
        const previousRank = previousRanks.get(player.userId) ?? player.rank;
        const rankShift = previousRank - player.rank;
        const roundDelta = roundPlayers[player.userId]?.pointsEarned ?? null;
        const pendingTargetTotal = pendingDisplayedTotalsRef.current.get(player.userId);
        const previousTotal = previousPartyTotalsRef.current.get(player.userId);
        const shouldHoldIncomingTotal =
          pendingTargetTotal != null ||
          (
            !state.roundResolved &&
            previousTotal != null &&
            player.totalPoints > previousTotal
          );
        const displayedTotal = displayedTotalsByUserId[player.userId]
          ?? (shouldHoldIncomingTotal ? previousTotal ?? player.totalPoints : player.totalPoints);
        const liveDelta = player.userId !== selfUserId
          ? liveScoreDeltas[player.userId] ?? null
          : null;

        return {
          userId: player.userId,
          totalPoints: displayedTotal,
          answered: player.answered,
          rank: player.rank,
          username: participant?.username ?? 'Player',
          avatarUrl: participant?.avatarUrl ?? null,
          avatarCustomization: participant?.avatarCustomization ?? null,
          isSelf: player.userId === selfUserId,
          isLeader: player.userId === partyState.leaderUserId,
          rankShift,
          roundDelta: shouldHoldIncomingTotal ? null : liveDelta ?? roundDelta,
        };
      });
  }, [displayedTotalsByUserId, liveScoreDeltas, participantMap, partyState, preRoundRankingOrder, selfUserId, state.roundResolved, state.roundResult?.players]);

  const transitionVisible = state.roundResultHoldDone;
  const transitionQuestionNumber = Math.min(
    totalQuestions,
    questionNumber + (state.roundResolved ? 1 : 0),
  );
  const matchCategoryNameResolved = matchCategoryName
    ? matchCategoryName[locale] ?? matchCategoryName.en
    : undefined;
  const transitionCategoryName = question?.categoryName ?? matchCategoryNameResolved ?? 'Football';
  const isFinalQuestionResolved = state.roundResolved && questionNumber >= totalQuestions;
  const showFinalizingResults = isFinalQuestionResolved && transitionVisible && !finalResults;

  const rankColorByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const player of standings) {
      map.set(player.userId, getRankHex(player.rank));
    }
    return map;
  }, [standings]);

  const partyPicks = useMemo<PartyPicks | undefined>(() => {
    if (!state.roundResult?.players) return undefined;
    const others = Object.entries(state.roundResult.players).filter(
      ([userId]) => userId !== selfUserId,
    );
    if (others.length === 0) return undefined;
    return others.map(([userId, player]) => {
      const participant = participantMap.get(userId);
      return {
        userId,
        username: participant?.username ?? 'Player',
        selectedIndex: player.selectedIndex,
        isCorrect: player.isCorrect,
        accentColor: rankColorByUserId.get(userId),
      };
    });
  }, [participantMap, rankColorByUserId, selfUserId, state.roundResult]);

  const showMobileStandingsBelowOptions = mobileStandingsPlacement === 'below-options';

  return {
    partyState,
    forfeitPending,
    finalResults,
    selfUserId,
    state,
    actions,

    showQuitModal,
    setShowQuitModal,
    firstQuestionIntroVisible,
    showMobileStandingsBelowOptions,

    pauseSeconds,
    forfeitPendingTitle,
    question,
    answerStates,
    uiPhase,
    questionNumber,
    totalQuestions,
    standings,
    transitionVisible,
    transitionQuestionNumber,
    transitionCategoryName,
    showFinalizingResults,
    partyPicks,
    scoreFlights,
  };
}
