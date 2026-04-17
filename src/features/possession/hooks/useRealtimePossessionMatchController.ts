'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { useRealtimeGameLogic } from '@/features/game/hooks/useRealtimeGameLogic';
import { useStoreInventory } from '@/lib/queries/store.queries';
import { getSocket } from '@/lib/realtime/socket-client';
import { useGameSounds } from '@/lib/sounds/useGameSounds';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { logger } from '@/utils/logger';
import { HalftimeScreen } from '../components/HalftimeScreen';
import type { PossessionViewportModel } from '../components/PossessionMatchViewport';
import type { PossessionQuestionAreaModel } from '../components/PossessionQuestionArea';
import { usePossessionFieldState } from './usePossessionFieldState';
import { usePossessionGoalCelebration } from './usePossessionGoalCelebration';
import {
  usePossessionFirstQuestionIntro,
  usePossessionRoundTransition,
} from './usePossessionRoundTransition';
import { usePossessionScoreSplashes } from './usePossessionScoreSplashes';
import {
  TRANSITION_DELAY_MS,
  createClientActionId,
  getQuestionProgress,
  isHalftimeBanRetryableErrorCode,
  toAnswerStates,
  toMultipleChoiceGameQuestion,
  toRevealAnswerStates,
  type FeedResult,
} from '../realtimePossession.helpers';
import type { FeedDirection } from '../types/possession.types';

type HalftimeModel = ComponentProps<typeof HalftimeScreen>;

interface UseRealtimePossessionMatchControllerParams {
  playerAvatar: string;
  playerUsername: string;
  opponentAvatar: string;
  opponentUsername: string;
  onQuit: () => void;
  onForfeit: () => void;
}

interface RealtimePossessionMatchControllerResult {
  isReady: boolean;
  showMainUI: boolean;
  showStartCountdown: boolean;
  countdownDisplay: number;
  penaltyCountdownActive: boolean;
  penaltyCountdownDisplay: number;
  muted: boolean;
  toggleMuted: () => void;
  viewportModel: PossessionViewportModel | null;
  questionAreaModel: PossessionQuestionAreaModel | null;
  showQuestionArea: boolean;
  halftimeModel: HalftimeModel | null;
  quitModalOpen: boolean;
  setQuitModalOpen: (open: boolean) => void;
  handleTemporaryQuit: () => void;
  handleForfeit: () => void;
}

export function useRealtimePossessionMatchController({
  playerAvatar,
  playerUsername,
  opponentAvatar,
  opponentUsername,
  onQuit,
  onForfeit,
}: UseRealtimePossessionMatchControllerParams): RealtimePossessionMatchControllerResult {
  const { playSfx, toggleMute: toggleMuteSound, isMuted } = useGameSounds();
  const match = useRealtimeMatchStore((store) => store.match);
  const devPossessionAnimation = useRealtimeMatchStore((store) => store.devPossessionAnimation);
  const clearDevPossessionAnimation = useRealtimeMatchStore((store) => store.clearDevPossessionAnimation);
  const applyOptimisticChanceCard = useRealtimeMatchStore((store) => store.applyOptimisticChanceCard);
  const markOptimisticChanceCardPendingSync = useRealtimeMatchStore((store) => store.markOptimisticChanceCardPendingSync);
  const realtimeError = useRealtimeMatchStore((store) => store.error);
  const meUserId = useRealtimeMatchStore((store) => store.selfUserId);
  const { data: inventoryData } = useStoreInventory();

  const [muted, setMuted] = useState(false);
  const [quitModalOpen, setQuitModalOpen] = useState(false);
  const halftimeBanSentRef = useRef(false);
  const prevPhaseRef = useRef<string | null>(null);

  const firstQuestionIntro = usePossessionFirstQuestionIntro({
    countdownEndsAt: match?.countdownEndsAt,
    currentQuestionIndex: match?.currentQuestion?.qIndex ?? null,
  });

  const { state, actions } = useRealtimeGameLogic({
    transitionDelayMs: TRANSITION_DELAY_MS,
    blockReveal: firstQuestionIntro,
  });

  const possessionState = match?.possessionState ?? null;
  const phase = possessionState?.phase;
  const mySeat = match?.mySeat ?? null;
  const duelMySeat = mySeat === 1 || mySeat === 2 ? mySeat : null;
  const localQuestion = state.currentQuestion;
  const localQuestionIndex = localQuestion?.qIndex ?? null;
  const phaseKind = localQuestion?.phaseKind ?? possessionState?.phaseKind ?? 'normal';
  const isPenaltyQuestion = phaseKind === 'penalty';
  const isLastAttackQuestion = phaseKind === 'last_attack';
  const isShotQuestion = phaseKind === 'shot';
  const pendingQuestion = match?.pendingQuestion ?? null;
  const answerAck = match?.answerAck && match.answerAck.qIndex === localQuestionIndex
    ? match.answerAck
    : null;
  const countdownGuessAck = match?.countdownGuessAck ?? null;
  const cluesGuessAck = match?.cluesGuessAck ?? null;
  const opponentAnsweredCorrectly = match?.opponentAnsweredCorrectly ?? null;
  const opponentUserId = match?.opponent.id ?? null;

  useEffect(() => {
    setMuted(isMuted());
  }, [isMuted]);

  useEffect(() => {
    if (!phase) return;
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (!prevPhase || prevPhase === phase) return;
    if (phase === 'HALFTIME' || phase === 'PENALTY_SHOOTOUT') {
      playSfx('whistle');
    }
  }, [phase, playSfx]);

  useEffect(() => {
    if (!state.roundResult) return;
    const phaseKindForSfx = state.roundResult.phaseKind;
    if (
      phaseKindForSfx === 'penalty'
      || phaseKindForSfx === 'last_attack'
      || Boolean(state.roundResult.deltas?.goalScoredBySeat)
    ) {
      playSfx('kick');
    } else {
      playSfx('pass');
    }
  }, [playSfx, state.roundResult]);

  useEffect(() => {
    if (!devPossessionAnimation) return;
    playSfx('kick');
  }, [devPossessionAnimation, playSfx]);

  useEffect(() => {
    if (!match?.matchId || !possessionState) return;
    logger.info('Possession debug state transition', {
      matchId: match.matchId,
      phase: possessionState.phase,
      half: possessionState.half,
      possessionDiff: possessionState.possessionDiff,
      normalQuestionsAnsweredInHalf: possessionState.normalQuestionsAnsweredInHalf,
      phaseKind: possessionState.phaseKind,
      phaseRound: possessionState.phaseRound,
      attackerSeat: possessionState.attackerSeat,
      shooterSeat: possessionState.shooterSeat,
      goals: possessionState.goals,
      penaltyGoals: possessionState.penaltyGoals,
    });
  }, [match?.matchId, possessionState]);

  useEffect(() => {
    if (!match?.matchId || !localQuestion) return;
    logger.info('Possession debug question event', {
      matchId: match.matchId,
      qIndex: localQuestion.qIndex,
      phaseKind: localQuestion.phaseKind,
      phaseRound: localQuestion.phaseRound,
      attackerSeat: localQuestion.attackerSeat,
      shooterSeat: localQuestion.shooterSeat,
      deadlineAt: localQuestion.deadlineAt,
      promptPreview: localQuestion.question.prompt?.slice(0, 80),
      optionsCount: localQuestion.question.kind === 'multipleChoice' ? localQuestion.question.options.length : 0,
      categoryName: localQuestion.question.categoryName,
      difficulty: localQuestion.question.difficulty,
    });
  }, [localQuestion, match?.matchId]);

  const myRound = useMemo(() => {
    if (!state.roundResult) return null;
    if (meUserId && state.roundResult.players[meUserId]) {
      return state.roundResult.players[meUserId];
    }
    if (opponentUserId) {
      const entry = Object.entries(state.roundResult.players).find(([userId]) => userId !== opponentUserId);
      return entry?.[1] ?? null;
    }
    return Object.values(state.roundResult.players)[0] ?? null;
  }, [meUserId, opponentUserId, state.roundResult]);

  const opponentRound = useMemo(() => {
    if (!state.roundResult) return null;
    if (opponentUserId && state.roundResult.players[opponentUserId]) {
      return state.roundResult.players[opponentUserId];
    }
    if (meUserId) {
      const entry = Object.entries(state.roundResult.players).find(([userId]) => userId !== meUserId);
      return entry?.[1] ?? null;
    }
    return Object.values(state.roundResult.players)[1] ?? null;
  }, [meUserId, opponentUserId, state.roundResult]);

  const { goalCelebration } = usePossessionGoalCelebration({
    roundResult: state.roundResult,
    roundResultHoldDone: state.roundResultHoldDone,
    currentQuestionIndex: localQuestionIndex,
    mySeat: mySeat ?? undefined,
    playerUsername,
    opponentUsername,
    devPossessionAnimation,
  });

  const overlayModel = usePossessionRoundTransition({
    phase,
    half: possessionState?.half,
    penaltySuddenDeath: possessionState?.penaltySuddenDeath,
    firstQuestionIntro,
    localQuestion,
    pendingQuestion,
    roundResult: state.roundResult,
    roundResultHoldDone: state.roundResultHoldDone,
    isPenaltyQuestion,
    isShotQuestion,
    isLastAttackQuestion,
    goalCelebration,
  });

  const fieldState = usePossessionFieldState({
    match,
    localQuestion,
    roundResult: state.roundResult,
    questionPhase: state.questionPhase,
    roundResolved: state.roundResolved,
    answerAck,
    opponentAnsweredCorrectly,
    myRound,
    opponentRound,
    devPossessionAnimation,
    clearDevPossessionAnimation,
    playerAvatar,
    opponentAvatar,
    playerUsername,
    opponentUsername,
    isHalftime: overlayModel.isHalftime,
  });

  const splashState = usePossessionScoreSplashes({
    localQuestion,
    phaseKind,
    selectedAnswer: state.selectedAnswer,
    selectedAnswerQIndex: state.selectedAnswerQIndex ?? null,
    opponentAnswered: state.opponentAnswered,
    opponentAnsweredCorrectly,
    answerAck,
    roundResult: state.roundResult,
    opponentRound,
  });

  useEffect(() => {
    if (!overlayModel.isHalftime) {
      halftimeBanSentRef.current = false;
    }
  }, [overlayModel.isHalftime]);

  useEffect(() => {
    if (!overlayModel.isHalftime) return;
    if (!realtimeError?.code) return;
    if (isHalftimeBanRetryableErrorCode(realtimeError.code)) {
      halftimeBanSentRef.current = false;
    }
  }, [overlayModel.isHalftime, realtimeError?.code]);

  const showMainUI = !overlayModel.isHalftime;
  const showStartCountdown = state.startCountdownActive;
  const countdownDisplay = Math.max(1, state.countdownSeconds);
  const playerPoints = state.playerScore;
  const opponentPoints = state.opponentScore;
  const questionInHalf = possessionState?.normalQuestionsAnsweredInHalf ?? 0;

  const resolvedCorrectIndex = state.roundResolved ? state.correctIndex : undefined;
  const question = useMemo(() => (
    toMultipleChoiceGameQuestion(localQuestion, resolvedCorrectIndex)
  ), [localQuestion, resolvedCorrectIndex]);

  const isMultipleChoiceQuestion = localQuestion?.question.kind === 'multipleChoice';
  const specialQuestion = localQuestion && localQuestion.question.kind !== 'multipleChoice'
    ? localQuestion.question
    : null;

  const answerStates = useMemo(() => {
    const optionsCount = question?.options.length ?? 4;
    if (state.roundResolved) {
      return toRevealAnswerStates(optionsCount, state.correctIndex, state.selectedAnswer);
    }

    const selfAnsweredCorrectly = answerAck?.isCorrect ?? null;

    return toAnswerStates(optionsCount, state.selectedAnswer, selfAnsweredCorrectly);
  }, [answerAck?.isCorrect, question?.options.length, state.correctIndex, state.roundResolved, state.selectedAnswer]);

  const opponentAnswer = useMemo(() => {
    if (!isMultipleChoiceQuestion) return null;
    if (state.selectedAnswer === null) return null;
    if (state.opponentAnswered && match?.opponentSelectedIndex != null) {
      return match.opponentSelectedIndex;
    }
    if (state.roundResolved) return opponentRound?.selectedIndex ?? null;
    return null;
  }, [isMultipleChoiceQuestion, match?.opponentSelectedIndex, opponentRound?.selectedIndex, state.opponentAnswered, state.roundResolved, state.selectedAnswer]);

  const questionProgress = useMemo(() => getQuestionProgress({
    phase,
    question: localQuestion,
    questionInHalf,
  }), [localQuestion, phase, questionInHalf]);

  const optimisticChanceCard = match?.optimisticChanceCard ?? null;

  const chanceCardBaseQuantity = useMemo(() => {
    const inventoryItems = inventoryData?.items ?? [];
    const chanceCardItem = inventoryItems.find((item) => item.slug === 'chance_card_5050');
    return chanceCardItem?.quantity ?? 0;
  }, [inventoryData?.items]);

  const activeOptimisticChanceCard = useMemo(() => {
    if (!optimisticChanceCard || localQuestionIndex === null) return null;
    return optimisticChanceCard.qIndex === localQuestionIndex ? optimisticChanceCard : null;
  }, [localQuestionIndex, optimisticChanceCard]);

  const chanceCardCount = useMemo(() => {
    if (!activeOptimisticChanceCard) return chanceCardBaseQuantity;
    if (activeOptimisticChanceCard.remainingQuantityAfter !== null) {
      return activeOptimisticChanceCard.remainingQuantityAfter;
    }
    if (activeOptimisticChanceCard.pending || activeOptimisticChanceCard.pendingSync) {
      return Math.max(0, chanceCardBaseQuantity - 1);
    }
    return chanceCardBaseQuantity;
  }, [activeOptimisticChanceCard, chanceCardBaseQuantity]);

  useEffect(() => {
    if (!activeOptimisticChanceCard?.pending) return;
    const timer = setTimeout(() => {
      markOptimisticChanceCardPendingSync({
        qIndex: activeOptimisticChanceCard.qIndex,
        clientActionId: activeOptimisticChanceCard.clientActionId,
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [activeOptimisticChanceCard, markOptimisticChanceCardPendingSync]);

  const openQuitModal = useCallback(() => {
    setQuitModalOpen(true);
  }, []);

  const handleHalftimeBan = useCallback((categoryId: string) => {
    if (!match?.matchId) return;
    if (halftimeBanSentRef.current) return;
    halftimeBanSentRef.current = true;
    getSocket().emit('match:halftime_ban', {
      matchId: match.matchId,
      categoryId,
    });
  }, [match?.matchId]);

  const handleUseChanceCard = useCallback(() => {
    if (!match || !localQuestion) return;
    if (match.mode !== 'ranked') return;
    if (localQuestion.question.kind !== 'multipleChoice') return;
    if (fieldState.isPenaltyQuestion || fieldState.isShotVisualPhase || overlayModel.isHalftime) return;
    if (state.questionPhase !== 'playing') return;
    if (state.roundResolved || state.selectedAnswer !== null) return;
    if (activeOptimisticChanceCard) return;
    if (chanceCardCount <= 0) return;
    if (typeof state.correctIndex !== 'number' || state.correctIndex < 0) return;

    const optionsCount = localQuestion.question.options.length;
    const wrongIndices = Array.from({ length: optionsCount }, (_, index) => index).filter(
      (index) => index !== state.correctIndex
    );
    if (wrongIndices.length < 2) return;

    const eliminatedIndices = wrongIndices.slice(0, 2);
    const clientActionId = createClientActionId();

    applyOptimisticChanceCard({
      qIndex: localQuestion.qIndex,
      clientActionId,
      eliminatedIndices,
      remainingQuantityBefore: chanceCardCount,
    });

    getSocket().emit('match:chance_card_use', {
      matchId: match.matchId,
      qIndex: localQuestion.qIndex,
      clientActionId,
    });
  }, [
    activeOptimisticChanceCard,
    applyOptimisticChanceCard,
    chanceCardCount,
    fieldState.isPenaltyQuestion,
    fieldState.isShotVisualPhase,
    localQuestion,
    match,
    overlayModel.isHalftime,
    state.correctIndex,
    state.questionPhase,
    state.roundResolved,
    state.selectedAnswer,
  ]);

  const feed = useMemo((): {
    message: string | null;
    direction: FeedDirection;
    side: 'left' | 'right';
    penaltyResult?: FeedResult;
  } => {
    if (!state.roundResult || !myRound || !opponentRound) {
      if (answerAck) {
        return { message: null, direction: answerAck.isCorrect ? 'forward' : 'backward', side: 'left' };
      }
      if (state.opponentAnswered && opponentAnsweredCorrectly !== null) {
        return {
          message: null,
          direction: opponentAnsweredCorrectly ? 'backward' : 'forward',
          side: 'right',
        };
      }
      return { message: null, direction: 'neutral', side: 'left' };
    }

    const resolvedPhaseKind = state.roundResult.phaseKind ?? phaseKind;
    if (resolvedPhaseKind === 'shot' || fieldState.isAttackAnimationPhase) {
      const side = fieldState.shotResult === 'goal'
        ? (fieldState.attackerIsMe ? 'left' : 'right')
        : fieldState.shotResult === 'saved'
          ? (fieldState.attackerIsMe ? 'right' : 'left')
          : (fieldState.attackerIsMe ? 'left' : 'right');
      const penaltyResult = fieldState.shotResult === 'goal' || fieldState.shotResult === 'saved' || fieldState.shotResult === 'miss'
        ? fieldState.shotResult
        : null;
      return { message: null, direction: 'neutral', side, penaltyResult };
    }

    if (resolvedPhaseKind === 'penalty') {
      const side = fieldState.penaltyResult === 'goal'
        ? (fieldState.resultShooterIsMe ? 'left' : 'right')
        : (fieldState.resultShooterIsMe ? 'right' : 'left');
      const penaltyResult = fieldState.penaltyResult === 'goal' || fieldState.penaltyResult === 'saved'
        ? fieldState.penaltyResult
        : null;
      return { message: null, direction: 'neutral', side, penaltyResult };
    }

    if (!myRound.isCorrect && !opponentRound.isCorrect) {
      return { message: null, direction: 'neutral', side: 'left' };
    }
    if (myRound.isCorrect && !opponentRound.isCorrect) {
      return { message: null, direction: 'forward', side: 'left' };
    }
    if (!myRound.isCorrect && opponentRound.isCorrect) {
      return { message: null, direction: 'backward', side: 'right' };
    }
    if (myRound.timeMs < opponentRound.timeMs) {
      return { message: null, direction: 'forward', side: 'left' };
    }
    if (opponentRound.timeMs < myRound.timeMs) {
      return { message: null, direction: 'backward', side: 'right' };
    }
    return { message: null, direction: 'neutral', side: 'left' };
  }, [
    answerAck,
    fieldState.attackerIsMe,
    fieldState.isAttackAnimationPhase,
    fieldState.penaltyResult,
    fieldState.resultShooterIsMe,
    fieldState.shotResult,
    myRound,
    opponentAnsweredCorrectly,
    opponentRound,
    phaseKind,
    state.opponentAnswered,
    state.roundResult,
  ]);

  const viewportModel: PossessionViewportModel | null = !match || !possessionState
    ? null
    : {
      showMainUI,
      hud: fieldState.isShotVisualPhase
        ? {
          kind: 'shot',
          props: {
            playerGoals: fieldState.myGoals,
            opponentGoals: fieldState.oppGoals,
            playerPoints,
            opponentPoints,
            playerAvatarUrl: playerAvatar,
            opponentAvatarUrl: opponentAvatar,
            timeRemaining: state.roundResolved ? 0 : state.timeRemaining,
            phase: state.roundResolved ? 'goal' : 'shot',
            isPlayerAttacker: fieldState.attackerIsMe,
            playerName: playerUsername,
            opponentName: opponentUsername,
            onQuit: openQuitModal,
          },
        }
        : fieldState.isPenaltyQuestion
          ? {
            kind: 'penalty',
            props: {
              penaltyPlayerScore: fieldState.myPenaltyGoals,
              penaltyOpponentScore: fieldState.oppPenaltyGoals,
              playerPoints,
              opponentPoints,
              penaltyRound: Math.max(1, possessionState.phaseRound),
              isPenaltySuddenDeath: possessionState.penaltySuddenDeath ?? false,
              isPlayerShooter: fieldState.shooterIsMe,
              playerName: playerUsername,
              opponentName: opponentUsername,
              playerAvatarUrl: playerAvatar,
              opponentAvatarUrl: opponentAvatar,
              timeRemaining: state.roundResolved ? 0 : state.timeRemaining,
              phase: state.questionPhase === 'playing' ? 'penalty-playing' : 'penalty-question',
              onQuit: openQuitModal,
            },
          }
          : {
            kind: 'possession',
            props: {
              playerGoals: fieldState.myGoals,
              opponentGoals: fieldState.oppGoals,
              playerPoints,
              opponentPoints,
              playerName: playerUsername,
              opponentName: opponentUsername,
              playerAvatarUrl: playerAvatar,
              opponentAvatarUrl: opponentAvatar,
              timeRemaining: state.questionPhase === 'playing' && state.showOptions && !state.roundResolved
                ? state.timeRemaining
                : null,
              half: possessionState.half,
              questionInHalf: questionProgress,
              zone: fieldState.zone,
              zoneColor: fieldState.zoneColor,
              onQuit: openQuitModal,
              opponentAnswered: state.opponentAnswered,
              opponentAnsweredCorrectly,
            },
          },
      pitchProps: fieldState.pitchProps,
      goalCelebration,
      penaltySplash: fieldState.isPenaltyQuestion
        && state.roundResolved
        && fieldState.penaltyResult !== null
        && fieldState.penaltyResult !== 'pending'
        ? {
          visible: true,
          result: fieldState.penaltyResult,
          resultShooterIsMe: fieldState.resultShooterIsMe,
          localQuestionIndex,
        }
        : null,
      muted,
    };

  const questionAreaModel: PossessionQuestionAreaModel | null = !match || !possessionState
    ? null
    : {
      feed,
      content: isMultipleChoiceQuestion && question
        ? {
          kind: 'multipleChoice',
          props: {
            phase: fieldState.uiPhase,
            isPenaltyPhase: fieldState.isPenaltyQuestion,
            isShotPhase: fieldState.isShotVisualPhase,
            isLastAttackPhase: fieldState.isLastAttackQuestion,
            question,
            showOptions: state.showOptions,
            selectedAnswer: state.selectedAnswer,
            answerStates,
            eliminatedIndices: activeOptimisticChanceCard?.eliminatedIndices ?? [],
            opponentAnswer,
            chanceCardCount,
            chanceCardPending: Boolean(activeOptimisticChanceCard?.pending || activeOptimisticChanceCard?.pendingSync),
            chanceCardPendingSync: Boolean(activeOptimisticChanceCard?.pendingSync),
            onUseChanceCard: handleUseChanceCard,
            showPlayerSplash: splashState.showPlayerSplash,
            showOpponentSplash: splashState.showOpponentSplash,
            playerSplashPoints: splashState.playerSplashPoints,
            opponentSplashPoints: splashState.opponentSplashPoints,
            playerSplashVariant: splashState.playerSplashVariant,
            opponentSplashVariant: splashState.opponentSplashVariant,
            onPlayerSplashComplete: splashState.onPlayerSplashComplete,
            onOpponentSplashComplete: splashState.onOpponentSplashComplete,
            onAnswer: (index: number) => {
              if (state.matchPaused) return;
              actions.submitAnswer(index);
            },
          },
        }
        : localQuestion && specialQuestion
          ? {
            kind: 'special',
            props: {
              matchId: match.matchId,
              qIndex: localQuestion.qIndex,
              question: specialQuestion,
              showOptions: state.showOptions,
              timeRemaining: state.timeRemaining,
              questionDurationSeconds: fieldState.questionDurationSeconds,
              roundResolved: state.roundResolved,
              answerAck,
              roundResult: state.roundResult,
              opponentRound,
              countdownGuessAck,
              cluesGuessAck,
            },
          }
          : { kind: 'empty' },
      showRoundTransition: overlayModel.showRoundTransition,
      showPenaltyTransition: overlayModel.showPenaltyTransition,
      transitionSnapshot: overlayModel.transitionSnapshot,
    };

  const halftimeModel: HalftimeModel | null = !match || !possessionState || !overlayModel.isHalftime
    ? null
    : {
      visible: true,
      playerGoals: fieldState.myGoals,
      opponentGoals: fieldState.oppGoals,
      playerName: playerUsername,
      opponentName: opponentUsername,
      playerAvatarUrl: playerAvatar,
      opponentAvatarUrl: opponentAvatar,
      playerPosition: fieldState.visualMyPossessionPct,
      deadlineAt: possessionState.halftime.deadlineAt,
      categoryOptions: possessionState.halftime.categoryOptions,
      mySeat: duelMySeat,
      firstBanSeat: possessionState.halftime.firstBanSeat,
      myBan: mySeat === 2
        ? possessionState.halftime.bans.seat2
        : mySeat === 1
          ? possessionState.halftime.bans.seat1
          : null,
      opponentBan: mySeat === 2
        ? possessionState.halftime.bans.seat1
        : mySeat === 1
          ? possessionState.halftime.bans.seat2
          : null,
      onBanCategory: handleHalftimeBan,
    };

  const handleTemporaryQuit = useCallback(() => {
    setQuitModalOpen(false);
    onQuit();
  }, [onQuit]);

  const handleForfeit = useCallback(() => {
    setQuitModalOpen(false);
    onForfeit();
  }, [onForfeit]);

  const toggleMuted = useCallback(() => {
    const next = toggleMuteSound();
    setMuted(next);
  }, [toggleMuteSound]);

  return {
    isReady: Boolean(match && possessionState),
    showMainUI,
    showStartCountdown,
    countdownDisplay,
    penaltyCountdownActive: overlayModel.penaltyCountdownActive,
    penaltyCountdownDisplay: overlayModel.penaltyCountdownDisplay,
    muted,
    toggleMuted,
    viewportModel,
    questionAreaModel,
    showQuestionArea: showMainUI && !showStartCountdown && !overlayModel.penaltyCountdownActive,
    halftimeModel,
    quitModalOpen,
    setQuitModalOpen,
    handleTemporaryQuit,
    handleForfeit,
  };
}
