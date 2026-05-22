'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { useRealtimeGameLogic } from '@/features/game/hooks/useRealtimeGameLogic';
import { useGameSounds } from '@/lib/sounds/useGameSounds';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { logger } from '@/utils/logger';
import { HalftimeScreen } from '../components/HalftimeScreen';
import type { PossessionViewportModel } from '../components/PossessionMatchViewport';
import type { PossessionQuestionAreaModel } from '../components/PossessionQuestionArea';
import { useHalftimeBanController } from './useHalftimeBanController';
import { usePossessionFieldState } from './usePossessionFieldState';
import { usePossessionGoalCelebration } from './usePossessionGoalCelebration';
import { usePossessionMatchSounds } from './usePossessionMatchSounds';
import {
  usePossessionFirstQuestionIntro,
  usePossessionRoundTransition,
  usePossessionSecondHalfQuestionIntro,
} from './usePossessionRoundTransition';
import { usePossessionScoreSplashes } from './usePossessionScoreSplashes';
import { useBarBattle } from './useBarBattle';
import {
  TRANSITION_DELAY_MS,
  getQuestionProgress,
  toAnswerStates,
  toMultipleChoiceGameQuestion,
  toRevealAnswerStates,
  type FeedResult,
} from '../realtimePossession.helpers';
import type { FeedDirection } from '../types/possession.types';
import type { AvatarCustomization } from '@/types/game';

type HalftimeModel = ComponentProps<typeof HalftimeScreen>;

interface UseRealtimePossessionMatchControllerParams {
  playerAvatar: string;
  playerAvatarCustomization?: AvatarCustomization | null;
  playerUsername: string;
  opponentAvatar: string;
  opponentAvatarCustomization?: AvatarCustomization | null;
  opponentUsername: string;
  /** ISO country code for the flag badge shown on the halftime avatar. */
  playerCountryCode?: string | null;
  opponentCountryCode?: string | null;
  centerPossessionTrack?: boolean;
  simpleShotAnimation?: boolean;
  unopposedBarPulse?: boolean;
  suppressAvatarScoreSplash?: boolean;
  /** Skip the ranked BGM loop (dev playgrounds). */
  disableBgm?: boolean;
  onQuit: () => void;
  onForfeit: () => void;
}

interface RealtimePossessionMatchControllerResult {
  isReady: boolean;
  showMainUI: boolean;
  showStartCountdown: boolean;
  countdownDisplay: number;
  countdownLabel: string;
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
  playerAvatarCustomization = null,
  playerUsername,
  opponentAvatar,
  opponentAvatarCustomization = null,
  opponentUsername,
  playerCountryCode = null,
  opponentCountryCode = null,
  centerPossessionTrack = true,
  simpleShotAnimation = true,
  unopposedBarPulse = false,
  suppressAvatarScoreSplash = false,
  disableBgm = false,
  onQuit,
  onForfeit,
}: UseRealtimePossessionMatchControllerParams): RealtimePossessionMatchControllerResult {
  const { playSfx, playBgm, stopBgm, toggleMute: toggleMuteSound, isMuted } = useGameSounds();
  const match = useRealtimeMatchStore((store) => store.match);
  const devPossessionAnimation = useRealtimeMatchStore((store) => store.devPossessionAnimation);
  const clearDevPossessionAnimation = useRealtimeMatchStore((store) => store.clearDevPossessionAnimation);
  const realtimeError = useRealtimeMatchStore((store) => store.error);
  const meUserId = useRealtimeMatchStore((store) => store.selfUserId);
  const shouldPulseUnopposedBars = unopposedBarPulse || match?.variant === 'ranked_sim';

  const [muted, setMuted] = useState(false);
  const [quitModalOpen, setQuitModalOpen] = useState(false);

  const firstQuestionIntro = usePossessionFirstQuestionIntro({
    countdownEndsAt: match?.countdownEndsAt,
    currentQuestionIndex: match?.currentQuestion?.qIndex ?? null,
  });
  const possessionState = match?.possessionState ?? null;
  const secondHalfQuestionIntro = usePossessionSecondHalfQuestionIntro({
    phase: possessionState?.phase,
    half: possessionState?.half,
    normalQuestionsAnsweredInHalf: possessionState?.normalQuestionsAnsweredInHalf,
    currentQuestionIndex: match?.currentQuestion?.qIndex ?? null,
    currentQuestionPhase: match?.currentQuestionPhase,
  });

  const { state, actions } = useRealtimeGameLogic({
    transitionDelayMs: TRANSITION_DELAY_MS,
    blockReveal: firstQuestionIntro || secondHalfQuestionIntro,
  });

  const phase = possessionState?.phase;
  const mySeat = match?.mySeat ?? null;
  const duelMySeat = mySeat === 1 || mySeat === 2 ? mySeat : null;
  const localQuestion = state.currentQuestion;
  const localQuestionIndex = localQuestion?.qIndex ?? null;
  const phaseKind = localQuestion?.phaseKind ?? possessionState?.phaseKind ?? 'normal';
  const halftimeActive = phase === 'HALFTIME';
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

  usePossessionMatchSounds({
    phase,
    roundResult: state.roundResult,
    devPossessionAnimation,
    playSfx,
  });

  // `phase` is intentionally kept out of these deps. The BGM should not
  // be torn down on every intra-match phase transition — each cleanup
  // arms a fade-out that can fire mid-match and silence the loop.
  useEffect(() => {
    if (disableBgm) return;
    if (match?.variant !== 'ranked_sim') return;
    playBgm('ranked');
    return () => stopBgm(400);
  }, [disableBgm, match?.variant, playBgm, stopBgm]);

  useEffect(() => {
    if (phase === 'COMPLETED') stopBgm(600);
  }, [phase, stopBgm]);

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
    isHalftime: halftimeActive,
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
    secondHalfQuestionIntro,
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
    unopposedBarPulse: shouldPulseUnopposedBars,
  });

  const splashState = usePossessionScoreSplashes({
    localQuestion,
    phaseKind,
    isHalftime: overlayModel.isHalftime,
    selectedAnswer: state.selectedAnswer,
    selectedAnswerQIndex: state.selectedAnswerQIndex ?? null,
    opponentAnswered: state.opponentAnswered,
    opponentAnsweredCorrectly,
    opponentRecentPoints: match?.opponentRecentPoints ?? null,
    answerAck,
    roundResult: state.roundResult,
    myRound,
    opponentRound,
  });

  // Divider X in SVG coords — snapshot for bar battle origin
  const mirrored = possessionState?.half === 2;
  const possessionTrackLeft = 15;
  const possessionTrackRight = centerPossessionTrack ? 485 : 470;
  const possessionTrackWidth = possessionTrackRight - possessionTrackLeft;
  const dividerX = mirrored
    ? possessionTrackRight - (fieldState.visualMyPossessionPct / 100) * possessionTrackWidth
    : possessionTrackLeft + (fieldState.visualMyPossessionPct / 100) * possessionTrackWidth;

  const barBattle = useBarBattle({
    answerAck,
    opponentAnswered: state.opponentAnswered,
    opponentRecentPoints: match?.opponentRecentPoints ?? null,
    opponentAnsweredCorrectly,
    roundResult: state.roundResult,
    myRound,
    opponentRound,
    phaseKind,
    dividerX,
    unopposedBarPulse: shouldPulseUnopposedBars,
  });

  const { handleHalftimeBan, handleHalftimeBanPhaseShown } = useHalftimeBanController({
    matchId: match?.matchId,
    halftimeActive,
    overlayIsHalftime: overlayModel.isHalftime,
    halftimeDeadlineAt: possessionState?.halftime.deadlineAt,
    realtimeErrorCode: realtimeError?.code,
  });

  const showMainUI = !overlayModel.isHalftime;
  const showStartCountdown = state.startCountdownActive;
  const countdownDisplay = Math.max(1, state.countdownSeconds);
  const countdownLabel = state.countdownReason === 'resume' ? 'Reconnected. Resuming in' : 'Kickoff in';
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


  const openQuitModal = useCallback(() => {
    setQuitModalOpen(true);
  }, []);

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
      const side = fieldState.penaltyDisplayResult === 'goal'
        ? (fieldState.resultShooterIsMe ? 'left' : 'right')
        : (fieldState.resultShooterIsMe ? 'right' : 'left');
      const penaltyResult = fieldState.penaltyDisplayResult === 'goal' || fieldState.penaltyDisplayResult === 'saved'
        ? fieldState.penaltyDisplayResult
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
    fieldState.penaltyDisplayResult,
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
            playerAvatarCustomization,
            opponentAvatarCustomization,
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
              playerAvatarCustomization,
              opponentAvatarCustomization,
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
              playerAvatarCustomization,
              opponentAvatarCustomization,
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
      pitchProps: {
        ...fieldState.pitchProps,
        playerAvatarCustomization,
        opponentAvatarCustomization,
        centerPossessionTrack,
        simpleShotAnimation,
        barBattle,
      },
      goalCelebration,
      penaltySplash: fieldState.isPenaltyQuestion
        && state.roundResolved
        && fieldState.penaltyDisplayResult !== null
        && fieldState.penaltyDisplayResult !== 'pending'
        ? {
          visible: true,
          result: fieldState.penaltyDisplayResult,
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
            qIndex: localQuestion?.qIndex ?? 0,
            totalQuestions: localQuestion?.total ?? 12,
            timeRemaining: state.timeRemaining,
            showOptions: state.showOptions,
            selectedAnswer: state.selectedAnswer,
            answerStates,
            opponentAnswer,
            showPlayerSplash: suppressAvatarScoreSplash ? false : splashState.showPlayerSplash,
            showOpponentSplash: suppressAvatarScoreSplash ? false : splashState.showOpponentSplash,
            playerSplashPoints: suppressAvatarScoreSplash ? null : splashState.playerSplashPoints,
            opponentSplashPoints: suppressAvatarScoreSplash ? null : splashState.opponentSplashPoints,
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
              totalQuestions: localQuestion.total ?? 12,
              question: specialQuestion,
              showOptions: state.showOptions,
              timeRemaining: state.timeRemaining,
              questionDurationSeconds: fieldState.questionDurationSeconds,
              roundResolved: state.roundResolved,
              answerAck,
              roundResult: state.roundResult,
              myRound,
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
      playerAvatarCustomization,
      opponentAvatarCustomization,
      playerPosition: fieldState.visualMyPossessionPct,
      playerCountryCode,
      opponentCountryCode,
      deadlineAt: possessionState.halftime.deadlineAt,
      uiReadyAt: possessionState.halftime.uiReadyAt ?? null,
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
      onBanPhaseShown: handleHalftimeBanPhaseShown,
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
    countdownLabel,
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
