'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { useShallow } from 'zustand/shallow';
import { useRealtimeGameLogic } from '@/lib/match/useRealtimeGameLogic';
import { useGameSounds } from '@/lib/sounds/useGameSounds';
import { usePreloadImages } from '@/lib/usePreloadImages';
import { preloadableRemoteImageUrl } from '@/lib/images/remoteImage';

/** Static art shown during goal celebrations — decoded at match start. */
const GOAL_OVERLAY_ASSETS = ['/assets/goal.webp'];
import { useRealtimeMatchStore, type MatchQuestionState } from '@/stores/realtimeMatch.store';
import { useRankedProfile } from '@/lib/queries/ranked.queries';
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
import { MAX_PENALTY_ROUNDS } from '../types/possession.types';
import type { AvatarCustomization } from '@/types/game';

type HalftimeModel = ComponentProps<typeof HalftimeScreen>;

const EMPTY_QUESTIONS: Record<number, MatchQuestionState> = {};

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
  countdownPhase: 'kickoff' | 'resume';
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
  const possessionMatch = useRealtimeMatchStore(useShallow((store) => ({
    matchId: store.match?.matchId ?? null,
    variant: store.match?.variant ?? null,
    mode: store.match?.mode ?? null,
    currentQuestion: store.match?.currentQuestion ?? null,
    currentQuestionPhase: store.match?.currentQuestionPhase ?? 'reveal',
    countdownEndsAt: store.match?.countdownEndsAt ?? null,
    countdownReason: store.match?.countdownReason ?? null,
    possessionState: store.match?.possessionState ?? null,
    pendingQuestion: store.match?.pendingQuestion ?? null,
    answerAck: store.match?.answerAck ?? null,
    countdownGuessAck: store.match?.countdownGuessAck ?? null,
    cluesGuessAck: store.match?.cluesGuessAck ?? null,
    opponent: store.match?.opponent ?? null,
    opponentAnsweredCorrectly: store.match?.opponentAnsweredCorrectly ?? null,
    opponentRecentPoints: store.match?.opponentRecentPoints ?? 0,
    opponentSelectedIndex: store.match?.opponentSelectedIndex ?? null,
    mySeat: store.match?.mySeat ?? null,
    questions: store.match?.questions ?? EMPTY_QUESTIONS,
    myTotalPoints: store.match?.myTotalPoints ?? 0,
    oppTotalPoints: store.match?.oppTotalPoints ?? 0,
  })));
  const devPossessionAnimation = useRealtimeMatchStore((store) => store.devPossessionAnimation);
  const clearDevPossessionAnimation = useRealtimeMatchStore((store) => store.clearDevPossessionAnimation);
  const realtimeError = useRealtimeMatchStore((store) => store.error);
  const meUserId = useRealtimeMatchStore((store) => store.selfUserId);
  const shouldPulseUnopposedBars = unopposedBarPulse || possessionMatch.variant === 'ranked_sim';

  // RP for the halftime/penalty ban header (mirrors the pre-match draft header):
  // self from the ranked profile, opponent from the match participant payload.
  const { data: rankedProfile } = useRankedProfile();
  const playerRankPoints = rankedProfile?.rp ?? null;
  const opponentRankPoints = possessionMatch.opponent?.rp ?? null;

  const [muted, setMuted] = useState(false);
  const [quitModalOpen, setQuitModalOpen] = useState(false);

  const firstQuestionIntro = usePossessionFirstQuestionIntro({
    countdownEndsAt: possessionMatch.countdownEndsAt,
    currentQuestionIndex: possessionMatch.currentQuestion?.qIndex ?? null,
  });
  const possessionState = possessionMatch.possessionState;
  const secondHalfQuestionIntro = usePossessionSecondHalfQuestionIntro({
    phase: possessionState?.phase,
    half: possessionState?.half,
    normalQuestionsAnsweredInHalf: possessionState?.normalQuestionsAnsweredInHalf,
    currentQuestionIndex: possessionMatch.currentQuestion?.qIndex ?? null,
    currentQuestionPhase: possessionMatch.currentQuestionPhase,
  });

  const { state, actions } = useRealtimeGameLogic({
    transitionDelayMs: TRANSITION_DELAY_MS,
    blockReveal: firstQuestionIntro || secondHalfQuestionIntro,
  });

  const phase = possessionState?.phase;
  const mySeat = possessionMatch.mySeat;
  const duelMySeat = mySeat === 1 || mySeat === 2 ? mySeat : null;
  const localQuestion = state.currentQuestion;
  const localQuestionIndex = localQuestion?.qIndex ?? null;
  const phaseKind = localQuestion?.phaseKind ?? possessionState?.phaseKind ?? 'normal';
  const halftimeActive = phase === 'HALFTIME';
  // Warm the ban-category images as soon as the halftime options arrive in the
  // socket payload — usually a beat before the ban UI renders — so the cards
  // don't show blank while images download. Must warm the same optimized URL
  // that BanCategoryCard renders (the Next optimizer's largest srcSet candidate
  // at 400px), otherwise the preload caches a different variant and the card
  // still fetches cold.
  const banImageUrls = useMemo(
    () =>
      (possessionState?.halftime.categoryOptions ?? []).map((c) =>
        c.imageUrl ? preloadableRemoteImageUrl(c.imageUrl, 400) : null,
      ),
    [possessionState?.halftime.categoryOptions],
  );
  usePreloadImages(banImageUrls);
  // Decode the goal-celebration art up front so the first goal doesn't pop a
  // cold image mid-celebration.
  usePreloadImages(GOAL_OVERLAY_ASSETS);
  // Warm the half's upcoming image-MCQ picture as soon as the server announces
  // it on match:state (the half's first question) so it's fully loaded long
  // before the image slot (Q4) starts. Must be the SAME optimized URL the
  // QuestionImageCard renders (Next optimizer's largest candidate at 450px),
  // otherwise the card's fetch is still cold.
  const announcedPreloadUrls = useMemo(
    () =>
      (possessionState?.preloadImageUrls ?? []).map((url) =>
        url ? preloadableRemoteImageUrl(url, 450) : null,
      ),
    [possessionState?.preloadImageUrls],
  );
  usePreloadImages(announcedPreloadUrls);
  const isPenaltyQuestion = phaseKind === 'penalty';
  const isLastAttackQuestion = phaseKind === 'last_attack';
  const isShotQuestion = phaseKind === 'shot';
  // Penalty round display: regulation counts 1..MAX_PENALTY_ROUNDS; sudden death
  // restarts as its own one-shot set (round 1/1, pips reset) — see PenaltyHUD.
  const isPenaltySuddenDeath = possessionState?.penaltySuddenDeath ?? false;
  const penaltyRound = Math.max(1, possessionState?.phaseRound ?? 1);
  const penaltyDisplayRound = isPenaltySuddenDeath ? 1 : penaltyRound;
  const penaltyDisplayTotal = isPenaltySuddenDeath ? 1 : MAX_PENALTY_ROUNDS;
  const pendingQuestion = possessionMatch.pendingQuestion;
  const answerAck = possessionMatch.answerAck && possessionMatch.answerAck.qIndex === localQuestionIndex
    ? possessionMatch.answerAck
    : null;
  const countdownGuessAck = possessionMatch.countdownGuessAck;
  const cluesGuessAck = possessionMatch.cluesGuessAck;
  const opponentAnsweredCorrectly = possessionMatch.opponentAnsweredCorrectly;
  const opponentUserId = possessionMatch.opponent?.id ?? null;

  useEffect(() => {
    setMuted(isMuted());
  }, [isMuted]);

  usePossessionMatchSounds({
    phase,
    answerAck,
    roundResult: state.roundResult,
    devPossessionAnimation,
    playSfx,
  });

  // `phase` is intentionally kept out of these deps. The BGM should not
  // be torn down on every intra-match phase transition — each cleanup
  // arms a fade-out that can fire mid-match and silence the loop.
  useEffect(() => {
    if (disableBgm) return;
    if (possessionMatch.variant !== 'ranked_sim') return;
    playBgm('ranked');
    return () => stopBgm(400);
  }, [disableBgm, possessionMatch.variant, playBgm, stopBgm]);

  useEffect(() => {
    if (phase === 'COMPLETED') stopBgm(600);
  }, [phase, stopBgm]);

  useEffect(() => {
    if (!possessionMatch.matchId || !possessionState) return;
    logger.info('Possession debug state transition', {
      matchId: possessionMatch.matchId,
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
  }, [possessionMatch.matchId, possessionState]);

  useEffect(() => {
    if (!possessionMatch.matchId || !localQuestion) return;
    logger.info('Possession debug question event', {
      matchId: possessionMatch.matchId,
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
  }, [localQuestion, possessionMatch.matchId]);

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
    possessionState,
    mySeat,
    matchId: possessionMatch.matchId,
    variant: possessionMatch.variant,
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
    opponentRecentPoints: possessionMatch.opponentRecentPoints,
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
    opponentRecentPoints: possessionMatch.opponentRecentPoints,
    opponentAnsweredCorrectly,
    roundResult: state.roundResult,
    myRound,
    opponentRound,
    phaseKind,
    dividerX,
    unopposedBarPulse: shouldPulseUnopposedBars,
    mySeat,
  });

  const { handleHalftimeBan, handleHalftimeBanPhaseShown } = useHalftimeBanController({
    matchId: possessionMatch.matchId,
    halftimeActive,
    overlayIsHalftime: overlayModel.isHalftime,
    halftimeDeadlineAt: possessionState?.halftime.deadlineAt,
    realtimeErrorCode: realtimeError?.code,
  });

  const showMainUI = !overlayModel.isHalftime;
  const showStartCountdown = state.startCountdownActive;
  const countdownDisplay = Math.max(1, state.countdownSeconds);
  const countdownPhase: 'kickoff' | 'resume' = state.countdownReason === 'resume' ? 'resume' : 'kickoff';
  const playerPoints = state.playerScore;
  const opponentPoints = state.opponentScore;
  const questionInHalf = possessionState?.normalQuestionsAnsweredInHalf ?? 0;

  const resolvedCorrectIndex = state.roundResolved ? state.correctIndex : undefined;
  const question = useMemo(() => (
    toMultipleChoiceGameQuestion(localQuestion, resolvedCorrectIndex)
  ), [localQuestion, resolvedCorrectIndex]);

  // Warm the image-MCQ picture as soon as the question payload lands (a beat
  // before the panel mounts) so it's already decoded when it renders. Preload
  // the SAME optimized URL the card renders — otherwise the card's request
  // would still be a cold fetch.
  const mcqImageUrl = localQuestion?.question.kind === 'multipleChoice'
    ? localQuestion.question.image?.url
    : null;
  const questionImageUrl = mcqImageUrl
    ? preloadableRemoteImageUrl(mcqImageUrl, 450)
    : null;
  usePreloadImages(useMemo(() => [questionImageUrl], [questionImageUrl]));

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
    if (state.opponentAnswered && possessionMatch.opponentSelectedIndex != null) {
      return possessionMatch.opponentSelectedIndex;
    }
    if (state.roundResolved) return opponentRound?.selectedIndex ?? null;
    return null;
  }, [isMultipleChoiceQuestion, possessionMatch.opponentSelectedIndex, opponentRound?.selectedIndex, state.opponentAnswered, state.roundResolved, state.selectedAnswer]);

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

  // "Who am I?" (clues) pushes the pitch off-screen on mobile. Once the answer
  // is acked, surface a key that changes per question so the viewport can scroll
  // the pitch back into view for the result + fly animation.
  //
  // NOTE: put-in-order is deliberately excluded — its correct-answer reveal
  // renders below the pitch, and scrolling up hides it. Left as-is until we have
  // a layout that can show both the reveal and the pitch animation together.
  const autoScrollKey =
    answerAck && answerAck.questionKind === 'clues'
      ? `${answerAck.questionKind}:${answerAck.qIndex}`
      : null;

  const viewportModel: PossessionViewportModel | null = !possessionMatch.matchId || !possessionState
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
            playerRankPoints,
            opponentRankPoints,
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
              penaltyPlayerAttempts: fieldState.myPenaltyAttempts,
              penaltyOpponentAttempts: fieldState.oppPenaltyAttempts,
              playerPoints,
              opponentPoints,
              penaltyRound,
              isPenaltySuddenDeath,
              isPlayerShooter: fieldState.shooterIsMe,
              playerName: playerUsername,
              opponentName: opponentUsername,
              playerAvatarUrl: playerAvatar,
              opponentAvatarUrl: opponentAvatar,
              playerAvatarCustomization,
              opponentAvatarCustomization,
              playerRankPoints,
              opponentRankPoints,
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
              playerRankPoints,
              opponentRankPoints,
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
              speedStreakMine: fieldState.speedStreakMine,
              speedStreakOpponent: fieldState.speedStreakOpponent,
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
      autoScrollKey,
    };

  // Question counter shown in the panel header. While the round-transition
  // overlay is visible, the panel MUST show the same number the overlay
  // announces — so it reads the overlay's own frozen snapshot
  // (transitionSnapshot.upcomingQIndex) rather than deriving the number
  // independently (a live read of pendingQuestion can disagree with the
  // frozen splash when the next question arrives mid-transition). Outside the
  // transition the counter tracks localQuestion so it always matches the
  // visible question content (e.g. during answer reveal).
  const transitionQIndex = overlayModel.showRoundTransition
    ? overlayModel.transitionSnapshot.upcomingQIndex
    : null;
  const displayQIndex = transitionQIndex ?? localQuestion?.qIndex ?? 0;
  const displayQTotal = pendingQuestion?.total ?? localQuestion?.total ?? 12;

  const questionAreaModel: PossessionQuestionAreaModel | null = !possessionMatch.matchId || !possessionState
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
            penaltyDisplayRound,
            penaltyDisplayTotal,
            isPenaltySuddenDeath,
            question,
            qIndex: displayQIndex,
            totalQuestions: displayQTotal,
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
              matchId: possessionMatch.matchId,
              qIndex: displayQIndex,
              totalQuestions: displayQTotal,
              isPenaltyPhase: fieldState.isPenaltyQuestion,
              penaltyDisplayRound,
              penaltyDisplayTotal,
              isPenaltySuddenDeath,
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

  const halftimeModel: HalftimeModel | null = !possessionMatch.matchId || !possessionState || !overlayModel.isHalftime
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
      playerRankPoints,
      opponentRankPoints,
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
      // Pre-penalty ban reuses the halftime ban UI but with a penalty title.
      isPenaltyBan: possessionState.halftime.purpose === 'penalty',
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
    isReady: Boolean(possessionMatch.matchId && possessionState),
    showMainUI,
    showStartCountdown,
    countdownDisplay,
    countdownPhase,
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
