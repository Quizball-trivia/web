'use client';

/**
 * View-model + side-effects controller for the realtime party quiz screen.
 *
 * Pulls everything the screen needs from the realtime store + game logic
 * hooks, owns the local UI state (quit modal, pause `now`, pre-round
 * ranking snapshot), runs the BGM lifecycle and the pause-tick timer,
 * and returns one object of derived values for the shell to render.
 *
 * Score-flight bookkeeping lives in `usePartyScoreFlights`, which this
 * hook calls and whose outputs feed into `standings`. The shell is a
 * pure renderer over this hook — no useState/useEffect in the screen.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRealtimeGameLogic } from '@/lib/match/useRealtimeGameLogic';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { usePossessionFirstQuestionIntro } from '@/features/possession/hooks/usePossessionRoundTransition';
import { playBgm, stopBgm } from '@/lib/sounds/gameSounds';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type { Phase } from '@/lib/types/game.types';
import type {
  MatchFinalResultsPayload,
  MatchForfeitPendingPayload,
  MatchPartyStatePayload,
} from '@/lib/realtime/socket.types';
import { useLocale } from '@/contexts/LocaleContext';

import type {
  PartyStandingViewModel,
  RealtimePartyQuizScreenProps,
  ScoreFlight,
} from './partyQuizScreen.types';
import {
  buildParticipantMap,
  getRankHex,
  toAnswerStates,
  toRevealAnswerStates,
} from './partyQuizScreen.helpers';
import { usePartyScoreFlights } from './usePartyScoreFlights';

type PartyPicks = Array<{
  userId: string;
  username: string;
  selectedIndex: number | null;
  isCorrect: boolean;
  accentColor: string | undefined;
}>;

export interface RealtimePartyQuizViewModel {
  partyState: MatchPartyStatePayload | null;
  forfeitPending: MatchForfeitPendingPayload | null;
  finalResults: MatchFinalResultsPayload | null;
  selfUserId: string | null;
  state: ReturnType<typeof useRealtimeGameLogic>['state'];
  actions: ReturnType<typeof useRealtimeGameLogic>['actions'];

  showQuitModal: boolean;
  setShowQuitModal: (open: boolean) => void;
  firstQuestionIntroVisible: boolean;
  showMobileStandingsBelowOptions: boolean;

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

  const rankingOrderRef = useRef<string[]>(partyState?.rankingOrder ?? []);
  const participantMap = useMemo(() => buildParticipantMap(participants ?? []), [participants]);

  const {
    scoreFlights,
    displayedTotalsByUserId,
    liveScoreDeltas,
    pendingDisplayedTotalsRef,
    previousPartyTotalsRef,
  } = usePartyScoreFlights({
    mobileStandingsPlacement,
    partyState,
    currentQuestion,
    answerAck,
    selfUserId,
    roundResolved: state.roundResolved,
    roundResult: state.roundResult,
    selectedAnswer: state.selectedAnswer,
    selectedAnswerQIndex: state.selectedAnswerQIndex,
    correctIndex: state.correctIndex,
    timeRemaining: state.timeRemaining,
  });

  useEffect(() => {
    rankingOrderRef.current = partyState?.rankingOrder ?? [];
  }, [partyState?.rankingOrder]);

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
  }, [displayedTotalsByUserId, liveScoreDeltas, participantMap, partyState, pendingDisplayedTotalsRef, preRoundRankingOrder, previousPartyTotalsRef, selfUserId, state.roundResolved, state.roundResult?.players]);

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
