'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRealtimeGameLogic } from '@/features/game/hooks/useRealtimeGameLogic';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { getSocket } from '@/lib/realtime/socket-client';
import { QuitMatchModal } from '@/features/game/components/QuitMatchModal';
import { HalftimeScreen } from './components/HalftimeScreen';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type { AnswerStateArray, FeedDirection, PenaltyResult, Phase, ShotResult } from './types/possession.types';
import { getZone } from './hooks/usePossessionMovement';
import { PossessionHUD } from './components/PossessionHUD';
import { ShotHUD } from './components/ShotHUD';
import { PenaltyHUD } from './components/PenaltyHUD';
import { PitchVisualization } from './components/PitchVisualization';
import { PossessionFeed } from './components/PossessionFeed';
import { PossessionQuestionPanel } from './components/PossessionQuestionPanel';
import { RoundTransitionOverlay } from './components/RoundTransitionOverlay';
import { GoalCelebrationOverlay } from './components/GoalCelebrationOverlay';
import { useGameSounds } from '@/lib/sounds/useGameSounds';
import { logger } from '@/utils/logger';
import { useStoreInventory } from '@/lib/queries/store.queries';
import { LoadingScreen } from '@/components/shared/LoadingScreen';

const TRANSITION_DELAY_MS = 1600;
const FIELD_RESULT_COMPARE_MS = 900;
const FIELD_POSSESSION_CUE_MS = 300;

interface RealtimePossessionMatchScreenProps {
  playerAvatar: string;
  playerUsername: string;
  opponentAvatar: string;
  opponentUsername: string;
  onQuit: () => void;
  onForfeit: () => void;
}

type FeedResult = 'goal' | 'saved' | 'miss' | null;

function toAnswerStates(
  optionsCount: number,
  selectedAnswer: number | null,
  selfAnsweredCorrectly: boolean | null
): AnswerStateArray {
  if (selectedAnswer === null) return Array.from({ length: optionsCount }, () => 'default') as AnswerStateArray;

  if (selfAnsweredCorrectly === true) {
    return Array.from({ length: optionsCount }, (_, i) => (i === selectedAnswer ? 'correct' : 'disabled')) as AnswerStateArray;
  }
  if (selfAnsweredCorrectly === false) {
    return Array.from({ length: optionsCount }, (_, i) => (i === selectedAnswer ? 'wrong' : 'disabled')) as AnswerStateArray;
  }

  return Array.from({ length: optionsCount }, (_, i) => {
    if (i === selectedAnswer) return 'default';
    return 'disabled';
  }) as AnswerStateArray;
}

function toRevealAnswerStates(
  optionsCount: number,
  correctIndex: number | undefined,
  selectedAnswer: number | null
): AnswerStateArray {
  return Array.from({ length: optionsCount }, (_, i) => {
    if (i === correctIndex) return 'correct';
    if (selectedAnswer === i) return 'wrong';
    return 'disabled';
  }) as AnswerStateArray;
}

function createClientActionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `cc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function RealtimePossessionMatchScreen({
  playerAvatar,
  playerUsername,
  opponentAvatar,
  opponentUsername,
  onQuit,
  onForfeit,
}: RealtimePossessionMatchScreenProps) {
  const [firstQuestionIntro, setFirstQuestionIntro] = useState(true); // Start true so overlay covers question 1 from first render
  const firstIntroExpiredRef = useRef(false);
  const { state, actions } = useRealtimeGameLogic({ transitionDelayMs: TRANSITION_DELAY_MS, blockReveal: firstQuestionIntro });
  const { playSfx, toggleMute, isMuted } = useGameSounds();
  const devPossessionAnimation = useRealtimeMatchStore((store) => store.devPossessionAnimation);
  const clearDevPossessionAnimation = useRealtimeMatchStore((store) => store.clearDevPossessionAnimation);
  const match = useRealtimeMatchStore((store) => store.match);
  const applyOptimisticChanceCard = useRealtimeMatchStore((store) => store.applyOptimisticChanceCard);
  const markOptimisticChanceCardPendingSync = useRealtimeMatchStore((store) => store.markOptimisticChanceCardPendingSync);
  const answerAck = match?.answerAck ?? null;
  const opponentAnsweredCorrectly = match?.opponentAnsweredCorrectly ?? null;
  const realtimeError = useRealtimeMatchStore((store) => store.error);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [muted, setMuted] = useState(false);
  const [goalCelebration, setGoalCelebration] = useState<{ scorerName: string; isMeScorer: boolean } | null>(null);
  const goalCelebrationHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goalCelebrationQRef = useRef<number | null>(null);
  const pendingGoalRef = useRef<{ scorerName: string; isMeScorer: boolean; qIndex: number } | null>(null);
  const [transitionSnapshot, setTransitionSnapshot] = useState<{ questionNumber: number; categoryName: string; half: 1 | 2; isExtra: boolean }>({
    questionNumber: 1,
    categoryName: 'Football',
    half: 1,
    isExtra: false,
  });
  const transitionVisibleRef = useRef(false);
  const [showPlayerSplash, setShowPlayerSplash] = useState(false);
  const [showOpponentSplash, setShowOpponentSplash] = useState(false);
  const [playerSplashPoints, setPlayerSplashPoints] = useState(0);
  const [opponentSplashPoints, setOpponentSplashPoints] = useState(0);
  const [shotBallOriginX, setShotBallOriginX] = useState(440);
  const shotOriginCaptureKeyRef = useRef<string | null>(null);
  const attackOriginQRef = useRef<number | null>(null);
  const attackOriginPctRef = useRef<number | null>(null);
  const [delayedIsShooter, setDelayedIsShooter] = useState(false);
  const halftimeBanSentRef = useRef(false);
  const prevPhaseRef = useRef<string | null>(null);
  const shownSplashQRef = useRef<{ player: number | null; opponent: number | null }>({
    player: null,
    opponent: null,
  });
  const { data: inventoryData } = useStoreInventory();

  const possessionState = match?.possessionState;
  const phase = possessionState?.phase;
  const isHalftimeServer = phase === 'HALFTIME';
  const [isHalftime, setIsHalftime] = useState(false);
  const isPenaltyPhaseServer = phase === 'PENALTY_SHOOTOUT';
  const [penaltyCountdownEndsAt, setPenaltyCountdownEndsAt] = useState<number | null>(null);
  const [penaltyCountdownNow, setPenaltyCountdownNow] = useState(() => Date.now());
  const prevPenaltyPhaseRef = useRef(isPenaltyPhaseServer);

  // Delay halftime screen so the last round's result hold (2.5s), field animation, and score
  // splashes all complete before the halftime screen appears.
  useEffect(() => {
    if (isHalftimeServer) {
      const timer = setTimeout(() => setIsHalftime(true), 4500);
      return () => clearTimeout(timer);
    }
    setIsHalftime(false);
  }, [isHalftimeServer]);

  // 5-second countdown when penalty shootout starts (only on first transition into penalties)
  useEffect(() => {
    if (isPenaltyPhaseServer && !prevPenaltyPhaseRef.current) {
      setPenaltyCountdownEndsAt(Date.now() + 5000);
    }
    prevPenaltyPhaseRef.current = isPenaltyPhaseServer;
  }, [isPenaltyPhaseServer]);

  // Tick the penalty countdown
  useEffect(() => {
    if (!penaltyCountdownEndsAt) return;
    const tick = () => setPenaltyCountdownNow(Date.now());
    tick();
    if (penaltyCountdownEndsAt <= Date.now()) {
      setPenaltyCountdownEndsAt(null);
      return;
    }
    const interval = setInterval(() => {
      if (Date.now() >= penaltyCountdownEndsAt) {
        setPenaltyCountdownEndsAt(null);
        clearInterval(interval);
        return;
      }
      tick();
    }, 100);
    return () => clearInterval(interval);
  }, [penaltyCountdownEndsAt]);

  const penaltyCountdownRemainingMs = penaltyCountdownEndsAt
    ? Math.max(0, penaltyCountdownEndsAt - penaltyCountdownNow)
    : 0;
  const penaltyCountdownActive = penaltyCountdownRemainingMs > 0;
  const penaltyCountdownDisplay = Math.max(1, Math.ceil(penaltyCountdownRemainingMs / 1000));

  useEffect(() => {
    setMuted(isMuted());
  }, [isMuted]);

  useEffect(() => {
    if (!isHalftime) {
      halftimeBanSentRef.current = false;
    }
  }, [isHalftime]);

  useEffect(() => {
    if (!isHalftime) return;
    if (!realtimeError?.code) return;
    if (
      realtimeError.code === 'MATCH_HALFTIME_BAN_ERROR'
      || realtimeError.code === 'MATCH_INVALID_BAN'
      || realtimeError.code === 'INVALID_CATEGORY'
      || realtimeError.code === 'MATCH_BUSY'
    ) {
      halftimeBanSentRef.current = false;
    }
  }, [isHalftime, realtimeError?.code]);

  useEffect(() => {
    if (!phase) return;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (!prev || prev === phase) return;
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
  }, [state.roundResult, playSfx]);

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

  const mySeat = match?.mySeat;
  const shooterSeat = possessionState?.shooterSeat ?? null;
  const phaseKind = match?.currentQuestion?.phaseKind ?? possessionState?.phaseKind ?? 'normal';
  const isPenaltyQuestion = phaseKind === 'penalty';
  const isLastAttackQuestion = phaseKind === 'last_attack';
  const isShotQuestion = phaseKind === 'shot';

  const roundAttackAnimation = useMemo((): { result: ShotResult; attackerSeat: 1 | 2 | null } | null => {
    if (!state.roundResult) return null;
    const kind = state.roundResult.phaseKind ?? phaseKind;
    if (kind === 'penalty' || kind === 'shot') return null;

    const scorerSeat = state.roundResult.deltas?.goalScoredBySeat ?? null;
    if (kind === 'normal') {
      if (!scorerSeat) return null;
      return { result: 'goal', attackerSeat: scorerSeat };
    }

    if (kind === 'last_attack') {
      const attackerSeatFromRound = state.roundResult.attackerSeat ?? possessionState?.attackerSeat ?? null;
      if (scorerSeat) {
        return { result: 'goal', attackerSeat: attackerSeatFromRound ?? scorerSeat };
      }
      return { result: 'miss', attackerSeat: attackerSeatFromRound };
    }

    return null;
  }, [phaseKind, possessionState?.attackerSeat, state.roundResult]);

  const devAttackAnimation = useMemo((): { result: ShotResult; attackerSeat: 1 | 2 | null } | null => {
    if (!devPossessionAnimation) return null;
    return {
      result: devPossessionAnimation.result,
      attackerSeat: devPossessionAnimation.attackerSeat,
    };
  }, [devPossessionAnimation]);

  const activeAttackAnimation = roundAttackAnimation ?? (state.roundResult ? null : devAttackAnimation);

  useEffect(() => {
    if (!devPossessionAnimation) return;
    const holdMs = devPossessionAnimation.result === 'goal' ? 2000 : 1500;
    const timer = setTimeout(() => clearDevPossessionAnimation(), holdMs);
    return () => clearTimeout(timer);
  }, [clearDevPossessionAnimation, devPossessionAnimation]);

  const isAttackAnimationPhase = activeAttackAnimation !== null;
  const isShotVisualPhase = isShotQuestion || isAttackAnimationPhase;

  // Goal celebration: stage 1 — capture goal info from round result (but don't show yet).
  // The actual overlay waits until answer results have been displayed (roundResultHoldDone).
  useEffect(() => {
    if (!state.roundResult) return;
    const deltas = state.roundResult.deltas;
    const scorerSeat = deltas?.goalScoredBySeat ?? null;
    if (!scorerSeat) return;
    // Only celebrate normal/last_attack goals — penalty goals have their own splash.
    // Use roundResult.phaseKind directly (always present from server); never fall back to
    // the live phaseKind which may have already advanced to the next phase.
    const kind = state.roundResult.phaseKind;
    if (kind !== 'normal' && kind !== 'last_attack') return;
    // Explicitly exclude penalty outcomes that leak goalScoredBySeat
    if (deltas?.penaltyOutcome) return;
    const qIdx = state.roundResult.qIndex;
    if (goalCelebrationQRef.current === qIdx) return;
    goalCelebrationQRef.current = qIdx;
    const isMeScorer = scorerSeat === mySeat;
    pendingGoalRef.current = {
      scorerName: isMeScorer ? playerUsername : opponentUsername,
      isMeScorer,
      qIndex: qIdx,
    };
  }, [state.roundResult, mySeat, playerUsername, opponentUsername]);

  // Clear stale pending goal when the question changes — prevents a goal captured in
  // round N from firing on round N+1's roundResultHoldDone if stage 2 didn't run in time.
  // Skip clearing when currentQIdx becomes null (match end) to let roundResultHoldDone run.
  const currentQIdx = state.currentQuestion?.qIndex;
  useEffect(() => {
    if (currentQIdx !== null && currentQIdx !== undefined) {
      pendingGoalRef.current = null;
    }
  }, [currentQIdx]);

  // Goal celebration: stage 2 — show overlay AFTER answer result hold is done (notches visible for 2.5s first).
  useEffect(() => {
    if (!state.roundResultHoldDone || !pendingGoalRef.current) return;
    const info = pendingGoalRef.current;
    pendingGoalRef.current = null;
    setGoalCelebration({ scorerName: info.scorerName, isMeScorer: info.isMeScorer });
  }, [state.roundResultHoldDone]);

  // Keep goal overlay lifetime independent from roundResultHoldDone transitions.
  useEffect(() => {
    if (!goalCelebration) return;
    if (goalCelebrationHideTimerRef.current) {
      clearTimeout(goalCelebrationHideTimerRef.current);
    }
    goalCelebrationHideTimerRef.current = setTimeout(() => {
      setGoalCelebration(null);
      goalCelebrationHideTimerRef.current = null;
    }, 2500);

    return () => {
      if (goalCelebrationHideTimerRef.current) {
        clearTimeout(goalCelebrationHideTimerRef.current);
        goalCelebrationHideTimerRef.current = null;
      }
    };
  }, [goalCelebration]);

  const isShooter = mySeat !== null && mySeat !== undefined && shooterSeat === mySeat;
  // Both shooter and keeper answer during penalties (shooter correct = goal, both earn points)

  // Delay icon swap so ball returns to penalty spot before players switch positions
  useEffect(() => {
    if (!isPenaltyQuestion) {
      setDelayedIsShooter(isShooter);
      return;
    }
    const timer = setTimeout(() => setDelayedIsShooter(isShooter), 600);
    return () => clearTimeout(timer);
  }, [isShooter, isPenaltyQuestion]);

  const myGoals = useMemo(() => {
    if (!match || !possessionState) return 0;
    return mySeat === 2 ? possessionState.goals.seat2 : possessionState.goals.seat1;
  }, [match, mySeat, possessionState]);

  const oppGoals = useMemo(() => {
    if (!match || !possessionState) return 0;
    return mySeat === 2 ? possessionState.goals.seat1 : possessionState.goals.seat2;
  }, [match, mySeat, possessionState]);

  const myPenaltyGoals = useMemo(() => {
    if (!match || !possessionState) return 0;
    return mySeat === 2 ? possessionState.penaltyGoals.seat2 : possessionState.penaltyGoals.seat1;
  }, [match, mySeat, possessionState]);

  const oppPenaltyGoals = useMemo(() => {
    if (!match || !possessionState) return 0;
    return mySeat === 2 ? possessionState.penaltyGoals.seat1 : possessionState.penaltyGoals.seat2;
  }, [match, mySeat, possessionState]);

  const possessionPct = Math.max(0, Math.min(100, 50 + ((possessionState?.possessionDiff ?? 0) / 2)));
  const serverMyPossessionPct = mySeat === 2 ? 100 - possessionPct : possessionPct;
  const localQuestion = state.currentQuestion;
  const localQuestionIndex = localQuestion?.qIndex ?? null;

  // "QUESTION 1" intro overlay: starts as `true` so it covers the first question from
  // the very first render (no flash). Once countdown ends and qIndex 0 is active, schedule
  // auto-hide after 2s. The hook's reveal timer (QUESTION_REVEAL_MS=3s) is blocked via
  // blockReveal while this is true, so it starts fresh after the overlay exits — giving
  // ~2s of question-only visibility before options appear.
  useEffect(() => {
    if (firstIntroExpiredRef.current) return;
    // If we reconnected to a later question, skip the intro
    if (localQuestionIndex !== null && localQuestionIndex !== 0) {
      firstIntroExpiredRef.current = true;
      setFirstQuestionIntro(false);
      return;
    }
    // Wait for countdown to finish and question 0 to be active
    if (localQuestionIndex !== 0 || state.startCountdownActive) return;
    const timer = setTimeout(() => {
      firstIntroExpiredRef.current = true;
      setFirstQuestionIntro(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [localQuestionIndex, state.startCountdownActive]);

  const optimisticChanceCard = match?.optimisticChanceCard ?? null;

  const chanceCardBaseQuantity = useMemo(() => {
    const inventoryItems = inventoryData?.items ?? [];
    const chanceCardItem = inventoryItems.find((item) => item.slug === 'chance_card_5050');
    return chanceCardItem?.quantity ?? 0;
  }, [inventoryData?.items]);

  const activeOptimisticChanceCard = useMemo(() => {
    if (!optimisticChanceCard || localQuestionIndex === null) return null;
    if (optimisticChanceCard.qIndex !== localQuestionIndex) return null;
    return optimisticChanceCard;
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

  // Optimistic possession state/refs — values computed after myRound/oppRound are defined below
  const [optimisticOffset, setOptimisticOffset] = useState(0);
  const optimisticAppliedQRef = useRef<number | null>(null);

  useEffect(() => {
    // Only reset visuals — do NOT reset shownSplashQRef.
    // qIndex always increments, so the ref's per-qIndex guard is sufficient
    // and resetting it causes a race with React's batched state updates.
    setShowPlayerSplash(false);
    setShowOpponentSplash(false);
  }, [localQuestionIndex]);

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
      optionsCount: localQuestion.question.options.length,
      categoryName: localQuestion.question.categoryName,
      difficulty: localQuestion.question.difficulty,
    });
  }, [localQuestion, match?.matchId]);

  const handleHalftimeBan = (categoryId: string) => {
    if (!match?.matchId) return;
    if (halftimeBanSentRef.current) return;
    halftimeBanSentRef.current = true;
    getSocket().emit('match:halftime_ban', {
      matchId: match.matchId,
      categoryId,
    });
  };

  const handleUseChanceCard = () => {
    if (!match || !localQuestion) return;
    if (match.mode !== 'ranked') return;
    if (isPenaltyQuestion || isShotVisualPhase || isHalftime) return;
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
  };

  const meUserId = useRealtimeMatchStore((store) => store.selfUserId);
  const opponentUserId = match?.opponent.id ?? null;

  const myRound = useMemo(() => {
    if (!state.roundResult) return null;
    if (meUserId && state.roundResult.players[meUserId]) return state.roundResult.players[meUserId];
    if (opponentUserId) {
      const entry = Object.entries(state.roundResult.players).find(([userId]) => userId !== opponentUserId);
      return entry?.[1] ?? null;
    }
    return Object.values(state.roundResult.players)[0] ?? null;
  }, [state.roundResult, meUserId, opponentUserId]);

  const oppRound = useMemo(() => {
    if (!state.roundResult) return null;
    if (opponentUserId && state.roundResult.players[opponentUserId]) return state.roundResult.players[opponentUserId];
    if (meUserId) {
      const entry = Object.entries(state.roundResult.players).find(([userId]) => userId !== meUserId);
      return entry?.[1] ?? null;
    }
    return Object.values(state.roundResult.players)[1] ?? null;
  }, [state.roundResult, meUserId, opponentUserId]);

  // Compute optimistic possession offset when round resolves.
  // Normal phases: no optimistic offset — the server possessionPct update moves the field once.
  // Non-normal phases (last_attack): apply immediately for snappy feedback.
  useEffect(() => {
    if (!state.roundResult || !myRound || !oppRound) return;
    const kind = state.roundResult.phaseKind ?? phaseKind;
    if (kind === 'normal') return; // let server state handle the single field animation
    if (kind !== 'last_attack') return;
    const qIdx = state.roundResult.qIndex;
    if (optimisticAppliedQRef.current === qIdx) return;
    optimisticAppliedQRef.current = qIdx;

    const deltas = state.roundResult.deltas;
    if (deltas) {
      const mySignedDelta = mySeat === 2 ? -deltas.possessionDelta : deltas.possessionDelta;
      setOptimisticOffset(mySignedDelta / 2);
    } else {
      const mySignedDelta = myRound.pointsEarned - oppRound.pointsEarned;
      setOptimisticOffset(mySignedDelta / 2);
    }
  }, [state.roundResult, myRound, oppRound, phaseKind, mySeat]);

  // Clear optimistic offset when server state arrives (real data overwrites)
  useEffect(() => {
    setOptimisticOffset(0);
  }, [possessionPct]);

  const immediateMyPossessionPct = Math.max(10, Math.min(90, serverMyPossessionPct + optimisticOffset));
  const [myPossessionPct, setMyPossessionPct] = useState(immediateMyPossessionPct);
  const latestPossessionRef = useRef(immediateMyPossessionPct);
  const prevPhaseForFieldResetRef = useRef<string | null>(phase ?? null);
  const delayedFieldQRef = useRef<number | null>(null);
  const fieldReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fieldMotionLocked, setFieldMotionLocked] = useState(false);

  useEffect(() => {
    latestPossessionRef.current = immediateMyPossessionPct;
  }, [immediateMyPossessionPct]);

  useEffect(() => {
    const prevPhase = prevPhaseForFieldResetRef.current;
    prevPhaseForFieldResetRef.current = phase ?? null;
    if (prevPhase !== 'HALFTIME' || phase !== 'NORMAL_PLAY' || possessionState?.half !== 2) return;

    // Start second half from center instantly before the next question motion.
    if (fieldReleaseTimerRef.current) {
      clearTimeout(fieldReleaseTimerRef.current);
      fieldReleaseTimerRef.current = null;
    }
    delayedFieldQRef.current = null;
    setFieldMotionLocked(false);
    setOptimisticOffset(0);
    latestPossessionRef.current = 50;
    setMyPossessionPct(50);
  }, [phase, possessionState?.half]);

  useEffect(() => {
    if (fieldMotionLocked) return;
    const activeRoundQIdx = state.roundResult?.qIndex ?? null;
    if (activeRoundQIdx !== null && delayedFieldQRef.current === activeRoundQIdx) return;
    setMyPossessionPct(immediateMyPossessionPct);
  }, [fieldMotionLocked, immediateMyPossessionPct, state.roundResult]);

  useLayoutEffect(() => {
    if (!state.roundResult) return;
    const kind = state.roundResult.phaseKind ?? phaseKind;
    if (kind !== 'normal' && kind !== 'last_attack') return;
    const qIdx = state.roundResult.qIndex;
    if (delayedFieldQRef.current === qIdx) return;
    delayedFieldQRef.current = qIdx;
    setFieldMotionLocked(true);
    if (fieldReleaseTimerRef.current) clearTimeout(fieldReleaseTimerRef.current);
    fieldReleaseTimerRef.current = setTimeout(() => {
      setFieldMotionLocked(false);
      setMyPossessionPct(latestPossessionRef.current);
      fieldReleaseTimerRef.current = null;
    }, FIELD_RESULT_COMPARE_MS + FIELD_POSSESSION_CUE_MS);
  }, [phaseKind, state.roundResult]);

  useEffect(() => {
    delayedFieldQRef.current = null;
    if (fieldReleaseTimerRef.current) {
      clearTimeout(fieldReleaseTimerRef.current);
      fieldReleaseTimerRef.current = null;
    }
    setFieldMotionLocked(false);
    setMyPossessionPct(latestPossessionRef.current);
  }, [localQuestionIndex]);

  useEffect(() => {
    if (phase !== 'HALFTIME' && phase !== 'COMPLETED') return;
    if (fieldReleaseTimerRef.current) {
      clearTimeout(fieldReleaseTimerRef.current);
      fieldReleaseTimerRef.current = null;
    }
    setFieldMotionLocked(false);
    setMyPossessionPct(latestPossessionRef.current);
  }, [phase]);

  useEffect(() => {
    return () => {
      if (fieldReleaseTimerRef.current) clearTimeout(fieldReleaseTimerRef.current);
    };
  }, []);

  const attackerSeat = (isAttackAnimationPhase
    ? activeAttackAnimation?.attackerSeat
    : (localQuestion?.attackerSeat ?? possessionState?.attackerSeat)) ?? null;
  const attackerIsMe = attackerSeat !== null && attackerSeat === mySeat;
  const shooterIsMe = shooterSeat !== null && shooterSeat === mySeat;

  const mirrored = false; // Always keep blue on bottom, red on top (no side switching)
  const ballOnPlayer = myPossessionPct > 50 || (myPossessionPct === 50 && possessionState?.kickOffSeat === mySeat);

  // Capture the attack-start position once per resolved round so shot origin does not
  // jump when possession resets to center after a goal.
  useEffect(() => {
    if (!isAttackAnimationPhase) {
      attackOriginQRef.current = null;
      attackOriginPctRef.current = null;
      return;
    }
    const qIdx = state.roundResult?.qIndex ?? localQuestion?.qIndex ?? null;
    if (qIdx === null) return;
    if (attackOriginQRef.current === qIdx) return;
    attackOriginQRef.current = qIdx;
    attackOriginPctRef.current = myPossessionPct;
  }, [isAttackAnimationPhase, localQuestion?.qIndex, myPossessionPct, state.roundResult?.qIndex]);

  useEffect(() => {
    if (!isShotVisualPhase || !possessionState) {
      shotOriginCaptureKeyRef.current = null;
      return;
    }
    const captureKey = isAttackAnimationPhase
      ? `attack:${state.roundResult?.qIndex ?? localQuestion?.qIndex ?? 'na'}`
      : `shot:${localQuestion?.qIndex ?? 'na'}`;
    if (shotOriginCaptureKeyRef.current === captureKey) return;
    shotOriginCaptureKeyRef.current = captureKey;

    const sourcePossessionPct = isAttackAnimationPhase
      ? (attackOriginPctRef.current ?? myPossessionPct)
      : myPossessionPct;
    const isAttackerMe = attackerSeat === mySeat;
    // Always use non-mirrored calculation (blue bottom, red top)
    const basePlayerX = 30 + (sourcePossessionPct / 100) * 440;
    const baseOpponentX = basePlayerX - 30;
    setShotBallOriginX(isAttackerMe ? basePlayerX + 14 : baseOpponentX - 14);
  }, [
    attackerSeat,
    isAttackAnimationPhase,
    isShotVisualPhase,
    localQuestion?.qIndex,
    myPossessionPct,
    mySeat,
    possessionState,
    state.roundResult?.qIndex,
  ]);

  const shotAnimationVariant = useMemo(() => {
    if (state.roundResult) {
      return state.roundResult.qIndex % 5;
    }
    if (devPossessionAnimation) {
      return devPossessionAnimation.id % 5;
    }
    return (localQuestion?.qIndex ?? 0) % 5;
  }, [devPossessionAnimation, localQuestion?.qIndex, state.roundResult]);

  const targetGoal = useMemo((): 'left' | 'right' | undefined => {
    if (!isShotVisualPhase && !isPenaltyQuestion) return undefined;
    // Penalties: always the same goal (like real football) — only icons swap via isPlayerShooter.
    if (isPenaltyQuestion) return mirrored ? 'left' : 'right';
    // Shots: goal depends on who's attacking XOR half (camera follows the attacker).
    const isMyAction = attackerIsMe;
    return (isMyAction !== mirrored) ? 'right' : 'left';
  }, [isShotVisualPhase, isPenaltyQuestion, attackerIsMe, mirrored]);

  // Instant player splash — fires the moment player taps a correct answer.
  // Uses selectedAnswerQIndex to prevent stale selectedAnswer from the previous
  // question firing a phantom splash when a new question arrives.
  useEffect(() => {
    if (state.selectedAnswer === null || typeof state.correctIndex !== 'number') return;
    if (state.selectedAnswerQIndex == null) return;
    if (phaseKind !== 'normal' && phaseKind !== 'last_attack') return;
    const activeQIndex = localQuestion?.qIndex ?? null;
    if (activeQIndex === null) return;
    // Ensure the answer belongs to THIS question
    if (state.selectedAnswerQIndex !== activeQIndex) return;
    if (shownSplashQRef.current.player === activeQIndex) return;
    if (state.selectedAnswer !== state.correctIndex) return;

    const optimisticPoints = Math.max(0, Math.min(100, state.timeRemaining * 10));
    const points = answerAck?.pointsEarned ?? optimisticPoints;
    setPlayerSplashPoints(points);
    setShowPlayerSplash(true);
    shownSplashQRef.current.player = activeQIndex;
  }, [answerAck?.pointsEarned, localQuestion?.qIndex, phaseKind, state.correctIndex, state.selectedAnswer, state.selectedAnswerQIndex]);

  // Update player splash points when server ack arrives with actual value
  useEffect(() => {
    if (!answerAck || !answerAck.isCorrect) return;
    if (shownSplashQRef.current.player === answerAck.qIndex) {
      setPlayerSplashPoints(answerAck.pointsEarned);
    }
  }, [answerAck]);

  // Instant opponent splash — fires on opponent_answered socket event
  useEffect(() => {
    if (!state.opponentAnswered && !state.roundResult) return;
    if ((state.roundResult?.phaseKind ?? phaseKind) !== 'normal' && (state.roundResult?.phaseKind ?? phaseKind) !== 'last_attack') return;

    const activeQIndex = localQuestion?.qIndex ?? state.roundResult?.qIndex ?? null;
    if (activeQIndex === null) return;
    if (shownSplashQRef.current.opponent === activeQIndex) return;

    const opponentCorrectImmediate = state.opponentAnswered && opponentAnsweredCorrectly === true;
    const opponentCorrectResolved = oppRound?.isCorrect === true;
    if (opponentCorrectImmediate || opponentCorrectResolved) {
      const points = opponentCorrectImmediate
        ? Math.max(0, Math.min(100, state.timeRemaining * 10))
        : (oppRound?.pointsEarned ?? 0);
      setOpponentSplashPoints(points);
      setShowOpponentSplash(true);
      shownSplashQRef.current.opponent = activeQIndex;
    }
  }, [localQuestion?.qIndex, oppRound, opponentAnsweredCorrectly, phaseKind, state.opponentAnswered, state.roundResult, state.timeRemaining]);

  // Reconcile opponent splash points to authoritative round result when it arrives.
  useEffect(() => {
    if (!state.roundResult || !oppRound?.isCorrect) return;
    if (shownSplashQRef.current.opponent !== state.roundResult.qIndex) return;
    setOpponentSplashPoints(oppRound.pointsEarned);
  }, [oppRound, state.roundResult]);

  // Optimistic shot outcome — predict from local data before round_result arrives
  const optimisticShotResult: ShotResult = useMemo(() => {
    if (!isShotQuestion) return 'pending';
    // If round_result arrived (legacy without deltas), derive from player data
    if (state.roundResult && (state.roundResult.phaseKind ?? phaseKind) === 'shot' && myRound && oppRound) {
      const attackerCorrect = attackerIsMe ? myRound.isCorrect : oppRound.isCorrect;
      const defenderCorrect = attackerIsMe ? oppRound.isCorrect : myRound.isCorrect;
      if (attackerCorrect && !defenderCorrect) return 'goal';
      if (defenderCorrect) return 'saved';
      return 'miss';
    }
    // Optimistic: predict from local answer data + opponent_answered
    const myAnswerCorrect = answerAck?.isCorrect;
    const oppAnswerCorrect = opponentAnsweredCorrectly;
    if (myAnswerCorrect == null || oppAnswerCorrect == null) return 'pending';
    const attackerCorrect = attackerIsMe ? myAnswerCorrect : oppAnswerCorrect;
    const defenderCorrect = attackerIsMe ? oppAnswerCorrect : myAnswerCorrect;
    if (attackerCorrect && !defenderCorrect) return 'goal';
    if (defenderCorrect) return 'saved';
    return 'miss';
  }, [answerAck?.isCorrect, attackerIsMe, isShotQuestion, myRound, oppRound, opponentAnsweredCorrectly, phaseKind, state.roundResult]);

  const shotResult: ShotResult = isAttackAnimationPhase
    ? (activeAttackAnimation?.result ?? 'pending')
    : optimisticShotResult;

  // Use the round result's shooterSeat (stable) instead of live shooterSeat which may already point to next penalty
  const resultShooterIsMe = state.roundResult?.shooterSeat != null && state.roundResult.shooterSeat === mySeat;

  // Optimistic penalty outcome — predict from local data before round_result arrives
  const optimisticPenaltyResult: PenaltyResult = useMemo(() => {
    if (!isPenaltyQuestion) return null;
    // If round_result has authoritative deltas, use those
    if (state.roundResult?.deltas?.penaltyOutcome) {
      return state.roundResult.deltas.penaltyOutcome;
    }
    // If round_result arrived (legacy without deltas), derive from player data
    if (state.roundResult && (state.roundResult.phaseKind ?? phaseKind) === 'penalty') {
      const shooterRound = resultShooterIsMe ? myRound : oppRound;
      const keeperRound = resultShooterIsMe ? oppRound : myRound;
      const shooterCorrect = shooterRound?.isCorrect ?? false;
      const keeperCorrect = keeperRound?.isCorrect ?? false;
      if (!shooterCorrect) return 'saved';
      if (!keeperCorrect) return 'goal';
      return (shooterRound?.timeMs ?? 10000) < (keeperRound?.timeMs ?? 10000) ? 'goal' : 'saved';
    }
    // Optimistic: predict from local answer data
    // In penalties, opponent_answered may not emit (penalty mode hides it) — only predict if we have data
    const myAnswerCorrect = answerAck?.isCorrect;
    if (myAnswerCorrect == null) return null;
    // If both answers known (opponent_answered also sent for penalties now in some cases)
    if (opponentAnsweredCorrectly != null) {
      const shooterCorrect = shooterIsMe ? myAnswerCorrect : opponentAnsweredCorrectly;
      const keeperCorrect = shooterIsMe ? opponentAnsweredCorrectly : myAnswerCorrect;
      if (!shooterCorrect) return 'saved';
      if (!keeperCorrect) return 'goal';
      // Both correct — uncertain about time, default optimistic for shooter
      return 'goal';
    }
    return null;
  }, [answerAck?.isCorrect, isPenaltyQuestion, myRound, oppRound, opponentAnsweredCorrectly, phaseKind, resultShooterIsMe, shooterIsMe, state.roundResult]);

  const penaltyResult: PenaltyResult = optimisticPenaltyResult;

  const uiPhase: Phase = useMemo(() => {
    if (isHalftime) return 'halftime';
    if (isPenaltyQuestion) {
      // Trigger result phase on optimistic or server-confirmed outcome
      if (state.roundResolved || penaltyResult) return 'penalty-result';
      return state.questionPhase === 'playing' ? 'penalty-playing' : 'penalty-question';
    }
    if (isShotVisualPhase) {
      // Trigger result phase on optimistic or server-confirmed outcome
      if (state.roundResolved || (shotResult !== 'pending')) return 'shot-result';
      return 'shot';
    }
    if (state.roundResolved) return 'reveal';
    return state.questionPhase === 'playing' ? 'playing' : 'question-reveal';
  }, [isHalftime, isPenaltyQuestion, isShotVisualPhase, penaltyResult, shotResult, state.questionPhase, state.roundResolved]);

  const question: GameQuestion | null = useMemo(() => {
    if (!localQuestion) return null;
    return {
      id: localQuestion.question.id,
      prompt: localQuestion.question.prompt,
      options: localQuestion.question.options,
      correctIndex: typeof state.correctIndex === 'number' ? state.correctIndex : -1,
      categoryId: localQuestion.question.categoryId,
      categoryName: localQuestion.question.categoryName,
      difficulty: localQuestion.question.difficulty,
      explanation: localQuestion.question.explanation ?? undefined,
    };
  }, [localQuestion, state.correctIndex]);

  const answerStates = useMemo(() => {
    const optionsCount = question?.options.length ?? 4;
    if (state.roundResolved) {
      return toRevealAnswerStates(optionsCount, state.correctIndex, state.selectedAnswer);
    }
    // Use correctIndex from question payload for instant feedback (no server wait)
    const selfAnsweredCorrectly =
      state.selectedAnswer !== null && typeof state.correctIndex === 'number'
        ? state.selectedAnswer === state.correctIndex
        : answerAck?.isCorrect ?? null;
    return toAnswerStates(optionsCount, state.selectedAnswer, selfAnsweredCorrectly);
  }, [answerAck?.isCorrect, question?.options.length, state.correctIndex, state.roundResolved, state.selectedAnswer]);

  const opponentAnswer = useMemo(() => {
    // Only reveal opponent's pick after player has also answered
    if (state.selectedAnswer === null) return null;
    if (state.opponentAnswered && match?.opponentSelectedIndex != null) {
      return match.opponentSelectedIndex;
    }
    if (state.roundResolved) return oppRound?.selectedIndex ?? null;
    return null;
  }, [match?.opponentSelectedIndex, oppRound?.selectedIndex, state.opponentAnswered, state.roundResolved, state.selectedAnswer]);

  const { zone, color: zoneColor } = useMemo(() => getZone(myPossessionPct), [myPossessionPct]);
  const questionInHalf = possessionState?.normalQuestionsAnsweredInHalf ?? 0;
  const questionProgress = useMemo(() => {
    if (phase === 'HALFTIME') return 6;
    if (localQuestion?.phaseKind === 'last_attack') return 6;

    if (
      localQuestion?.phaseKind === 'normal' &&
      typeof localQuestion.phaseRound === 'number' &&
      localQuestion.phaseRound > 0
    ) {
      return ((localQuestion.phaseRound - 1) % 6) + 1;
    }
    if (typeof localQuestion?.qIndex === 'number') {
      return (localQuestion.qIndex % 6) + 1;
    }
    return Math.min(6, Math.max(0, questionInHalf));
  }, [localQuestion?.phaseKind, localQuestion?.phaseRound, localQuestion?.qIndex, phase, questionInHalf]);

  const feed = useMemo((): { message: string | null; direction: FeedDirection; side: 'left' | 'right'; penaltyResult?: FeedResult } => {
    if (!state.roundResult || !myRound || !oppRound) {
      if (answerAck) {
        return { message: null, direction: answerAck.isCorrect ? 'forward' : 'backward', side: 'left' };
      }
      if (state.opponentAnswered && opponentAnsweredCorrectly !== null) {
        return { message: null, direction: opponentAnsweredCorrectly ? 'backward' : 'forward', side: 'right' };
      }
      return { message: null, direction: 'neutral', side: 'left' };
    }

    const kind = state.roundResult.phaseKind ?? phaseKind;
    if (kind === 'shot' || isAttackAnimationPhase) {
      const side = shotResult === 'goal'
        ? (attackerIsMe ? 'left' : 'right')
        : shotResult === 'saved'
          ? (attackerIsMe ? 'right' : 'left')
          : (attackerIsMe ? 'left' : 'right');
      const feedResult: FeedResult = shotResult === 'goal' || shotResult === 'saved' || shotResult === 'miss'
        ? shotResult
        : null;
      return { message: null, direction: 'neutral', side, penaltyResult: feedResult };
    }

    if (kind === 'penalty') {
      const side = penaltyResult === 'goal'
        ? (resultShooterIsMe ? 'left' : 'right')
        : (resultShooterIsMe ? 'right' : 'left');
      const feedResult: FeedResult = penaltyResult === 'goal' || penaltyResult === 'saved' ? penaltyResult : null;
      return { message: null, direction: 'neutral', side, penaltyResult: feedResult };
    }

    if (!myRound.isCorrect && !oppRound.isCorrect) {
      return { message: null, direction: 'neutral', side: 'left' };
    }
    if (myRound.isCorrect && !oppRound.isCorrect) {
      return { message: null, direction: 'forward', side: 'left' };
    }
    if (!myRound.isCorrect && oppRound.isCorrect) {
      return { message: null, direction: 'backward', side: 'right' };
    }
    if (myRound.timeMs < oppRound.timeMs) {
      return { message: null, direction: 'forward', side: 'left' };
    }
    if (oppRound.timeMs < myRound.timeMs) {
      return { message: null, direction: 'backward', side: 'right' };
    }
    return { message: null, direction: 'neutral', side: 'left' };
  }, [answerAck, attackerIsMe, isAttackAnimationPhase, myRound, oppRound, opponentAnsweredCorrectly, penaltyResult, phaseKind, resultShooterIsMe, shotResult, state.opponentAnswered, state.roundResult]);

  const pendingQuestion = match?.pendingQuestion ?? null;
  const isHalfBoundaryRound = state.roundResult?.phaseKind === 'normal' && state.roundResult?.phaseRound === 6;
  const hasConcreteNextQuestion = Boolean(pendingQuestion);
  const allowBoundaryTransition = !isHalfBoundaryRound || hasConcreteNextQuestion;

  // Round transition overlay — for normal-phase inter-round transitions + first question intro
  const showRoundTransition = phase === 'NORMAL_PLAY'
    && (state.roundResultHoldDone || firstQuestionIntro)
    && allowBoundaryTransition
    && !isPenaltyQuestion && !isShotQuestion && !isLastAttackQuestion && !isHalftime
    && !goalCelebration; // Hide transition overlay while goal celebration is playing

  // Snapshot transition data when the overlay APPEARS, so the values stay stable
  // during the exit animation (prevents "Question 5" jumping to "Question 6" when
  // the pending question gets promoted while the overlay is fading out).
  useEffect(() => {
    if (showRoundTransition && !transitionVisibleRef.current) {
      transitionVisibleRef.current = true;
      const isExtra = pendingQuestion?.phaseKind === 'last_attack';
      const questionNumber = firstQuestionIntro
        ? 1
        : isExtra
          ? 0 // unused when isExtra=true, overlay shows "Extra Question"
          : (pendingQuestion?.phaseRound
            ?? (typeof localQuestion?.phaseRound === 'number' ? localQuestion.phaseRound + 1 : 1));
      const categoryName = firstQuestionIntro
        ? (localQuestion?.question.categoryName ?? 'Football')
        : (pendingQuestion?.question.categoryName
          ?? localQuestion?.question.categoryName
          ?? 'Football');
      const half = (possessionState?.half ?? 1) as 1 | 2;
      setTransitionSnapshot({ questionNumber, categoryName, half, isExtra });
      return;
    }

    if (!showRoundTransition && transitionVisibleRef.current) {
      transitionVisibleRef.current = false;
    }
  }, [
    firstQuestionIntro,
    localQuestion?.phaseRound,
    localQuestion?.question.categoryName,
    pendingQuestion?.phaseKind,
    pendingQuestion?.phaseRound,
    pendingQuestion?.question.categoryName,
    possessionState?.half,
    showRoundTransition,
  ]);

  const showMainUI = !isHalftime;
  const showStartCountdown = state.startCountdownActive;
  const countdownDisplay = Math.max(1, state.countdownSeconds);

  if (!match || !possessionState) {
    return (
      <div className="min-h-dvh w-full bg-[#0f1420] flex items-center justify-center">
        {state.startCountdownActive ? (
          <div className="flex flex-col items-center gap-2">
            <div className="text-white/60 text-xs uppercase tracking-[0.28em] font-fun font-bold">Kickoff in</div>
            <div className="size-28 rounded-full border-4 border-[#1CB0F6]/60 bg-[#131F24] flex items-center justify-center shadow-[0_0_40px_rgba(28,176,246,0.25)]">
              <span className="text-5xl leading-none font-fun font-black text-white tabular-nums">{countdownDisplay}</span>
            </div>
          </div>
        ) : (
          <LoadingScreen fullScreen={false} className="min-h-0 h-auto" />
        )}
      </div>
    );
  }

  // Shared pitch props used for both landscape (mobile) and portrait (desktop) instances
  const pitchProps = {
    playerPosition: myPossessionPct,
    playerAvatarUrl: playerAvatar,
    opponentAvatarUrl: opponentAvatar,
    playerName: playerUsername,
    opponentName: opponentUsername,
    penaltyMode: isPenaltyQuestion ? {
      isPlayerShooter: delayedIsShooter,
      result: penaltyResult,
      phase: (state.roundResolved ? 'result' : (state.questionPhase === 'playing' ? 'playing' : 'setup')) as 'setup' | 'playing' | 'result',
    } : undefined,
    shotMode: isShotVisualPhase ? {
      result: shotResult,
      ballOriginX: shotBallOriginX,
      isPlayerAttacker: attackerIsMe,
      variant: shotAnimationVariant,
    } : undefined,
    zoomToGoal: isPenaltyQuestion || isShotVisualPhase,
    mirrored,
    targetGoal,
    ballOnPlayer,
  } as const;

  // Penalty result splash — shared between mobile (absolute over column) and desktop (inside pitch panel)
  const penaltySplash = isPenaltyQuestion && penaltyResult && state.roundResolved ? (
    <motion.div
      key={`pen-splash-${localQuestionIndex}`}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="absolute inset-x-0 top-[35%] z-30 flex flex-col items-center pointer-events-none"
    >
      <div className={`text-5xl font-black font-fun uppercase tracking-wider ${
        penaltyResult === 'goal' ? 'text-[#58CC02]' : 'text-[#FF4B4B]'
      }`}
        style={{
          textShadow: penaltyResult === 'goal'
            ? '0 0 30px rgba(88,204,2,0.5), 0 4px 0 rgba(70,163,2,0.8)'
            : '0 0 30px rgba(255,75,75,0.5), 0 4px 0 rgba(200,40,40,0.8)',
        }}
      >
        {penaltyResult === 'goal' ? 'GOAL!' : 'SAVED!'}
      </div>
      <div className="mt-1 text-sm font-bold text-white/60 font-fun uppercase tracking-widest">
        {penaltyResult === 'goal'
          ? (resultShooterIsMe ? 'You scored!' : 'Opponent scored')
          : (resultShooterIsMe ? 'Keeper saves it!' : 'You saved it!')}
      </div>
    </motion.div>
  ) : null;

  return (
    <div className="min-h-dvh bg-[#0f1420] flex flex-col items-center justify-center relative">
      <button
        onClick={() => {
          const next = toggleMute();
          setMuted(next);
        }}
        className="fixed top-4 left-4 z-40 size-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-lg transition-colors"
        aria-label={muted ? 'Unmute audio' : 'Mute audio'}
        aria-pressed={muted}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '\ud83d\udd07' : '\ud83d\udd0a'}
      </button>

      <AnimatePresence>
        {showStartCountdown && (
          <motion.div
            key="match-start-countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          >
            <div className="absolute inset-0 bg-[#0f1420]/45 backdrop-blur-[1.5px]" />
            <motion.div
              key={`countdown-${countdownDisplay}`}
              initial={{ scale: 0.72, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 340, damping: 22 }}
              className="relative flex flex-col items-center gap-2"
            >
              <div className="text-white/70 text-xs uppercase tracking-[0.28em] font-fun font-bold">Kickoff in</div>
              <div className="size-32 rounded-full border-4 border-[#1CB0F6]/70 bg-[#131F24] flex items-center justify-center shadow-[0_0_50px_rgba(28,176,246,0.3)]">
                <span className="text-6xl leading-none font-fun font-black text-white tabular-nums">{countdownDisplay}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {penaltyCountdownActive && (
          <motion.div
            key="penalty-countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          >
            <div className="absolute inset-0 bg-[#0f1420]/60 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="relative flex flex-col items-center gap-4"
            >
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="text-4xl font-black font-fun uppercase tracking-wider text-[#FF4B4B]"
                style={{ textShadow: '0 0 30px rgba(255,75,75,0.5), 0 4px 0 rgba(200,40,40,0.8)' }}
              >
                Penalty Shootout
              </motion.div>
              <motion.div
                key={`pen-cd-${penaltyCountdownDisplay}`}
                initial={{ scale: 0.72, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 340, damping: 22 }}
              >
                <div className="size-28 rounded-full border-4 border-[#FF4B4B]/70 bg-[#131F24] flex items-center justify-center shadow-[0_0_50px_rgba(255,75,75,0.3)]">
                  <span className="text-5xl leading-none font-fun font-black text-white tabular-nums">{penaltyCountdownDisplay}</span>
                </div>
              </motion.div>
              <div className="text-white/60 text-sm font-fun font-bold uppercase tracking-widest">Get Ready</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-lg flex flex-col lg:max-w-7xl lg:flex-row lg:h-[calc(100dvh-2rem)] lg:items-stretch lg:gap-4 lg:px-4">

        {/* LEFT: Portrait pitch — desktop only */}
        {showMainUI && (
          <div className="hidden lg:flex lg:w-[42%] lg:items-center lg:py-4 relative">
            <div className="h-full w-full max-h-[calc(100dvh-2rem)]">
              <PitchVisualization {...pitchProps} orientation="portrait" />
            </div>
            {/* Penalty splash overlay — desktop (inside pitch panel) */}
            <AnimatePresence>{penaltySplash}</AnimatePresence>
          </div>
        )}

        {/* RIGHT: HUD + Pitch (mobile) + Feed + Question + Answers */}
        <div className="w-full flex flex-col lg:flex-1 lg:max-w-2xl lg:mx-auto lg:justify-start lg:py-4">
          {showMainUI && (
            <>
              {isShotVisualPhase ? (
                <ShotHUD
                  playerGoals={myGoals}
                  opponentGoals={oppGoals}
                  playerAvatarUrl={playerAvatar}
                  opponentAvatarUrl={opponentAvatar}
                  timeRemaining={state.roundResolved ? 0 : state.timeRemaining}
                  phase={state.roundResolved ? 'goal' : 'shot'}
                  isPlayerAttacker={attackerIsMe}
                  playerName={playerUsername}
                  opponentName={opponentUsername}
                  onQuit={() => setShowQuitModal(true)}
                />
              ) : isPenaltyQuestion ? (
                <PenaltyHUD
                  penaltyPlayerScore={myPenaltyGoals}
                  penaltyOpponentScore={oppPenaltyGoals}
                  penaltyRound={Math.max(1, possessionState.phaseRound)}
                  isPenaltySuddenDeath={possessionState.penaltySuddenDeath ?? false}
                  isPlayerShooter={isShooter}
                  playerName={playerUsername}
                  opponentName={opponentUsername}
                  playerAvatarUrl={playerAvatar}
                  opponentAvatarUrl={opponentAvatar}
                  timeRemaining={state.roundResolved ? 0 : state.timeRemaining}
                  phase={state.questionPhase === 'playing' ? 'penalty-playing' : 'penalty-question'}
                  onQuit={() => setShowQuitModal(true)}
                />
              ) : (
                <PossessionHUD
                  playerGoals={myGoals}
                  opponentGoals={oppGoals}
                  playerName={playerUsername}
                  opponentName={opponentUsername}
                  playerAvatarUrl={playerAvatar}
                  opponentAvatarUrl={opponentAvatar}
                  timeRemaining={state.questionPhase === 'playing' && state.showOptions && !state.roundResolved ? state.timeRemaining : null}
                  half={possessionState.half}
                  questionInHalf={questionProgress}
                  zone={zone}
                  zoneColor={zoneColor}
                  onQuit={() => setShowQuitModal(true)}
                  opponentAnswered={state.opponentAnswered}
                  opponentAnsweredCorrectly={opponentAnsweredCorrectly}
                />
              )}

              {/* Mobile landscape pitch — hidden on desktop */}
              <div className="lg:hidden">
                <PitchVisualization {...pitchProps} orientation="landscape" />
              </div>

              {/* Penalty result splash overlay — mobile only (absolute over column) */}
              <div className="lg:hidden relative">
                <AnimatePresence>{penaltySplash}</AnimatePresence>
              </div>

              {!showStartCountdown && !penaltyCountdownActive && (
                <>
                  <PossessionFeed
                    message={feed.message}
                    direction={feed.direction}
                    side={feed.side}
                    penaltyResult={feed.penaltyResult ?? null}
                  />

                  <div className="relative">
                    {/* Question panel fades in AFTER overlay exits (opacity 0 while overlay showing) */}
                    <motion.div
                      animate={{ opacity: showRoundTransition ? 0 : 1 }}
                      transition={{ duration: showRoundTransition ? 0 : 0.8 }}
                      initial={false}
                    >
                      <PossessionQuestionPanel
                        phase={uiPhase}
                        isPenaltyPhase={isPenaltyQuestion}
                        isShotPhase={isShotVisualPhase}
                        isLastAttackPhase={isLastAttackQuestion}
                        question={question}
                        showOptions={state.showOptions}
                        selectedAnswer={state.selectedAnswer}
                        answerStates={answerStates}
                        eliminatedIndices={activeOptimisticChanceCard?.eliminatedIndices ?? []}
                        opponentAnswer={opponentAnswer}
                        chanceCardCount={chanceCardCount}
                        chanceCardPending={Boolean(activeOptimisticChanceCard?.pending || activeOptimisticChanceCard?.pendingSync)}
                        chanceCardPendingSync={Boolean(activeOptimisticChanceCard?.pendingSync)}
                        onUseChanceCard={handleUseChanceCard}
                        showPlayerSplash={showPlayerSplash}
                        showOpponentSplash={showOpponentSplash}
                        playerSplashPoints={playerSplashPoints}
                        opponentSplashPoints={opponentSplashPoints}
                        onPlayerSplashComplete={() => setShowPlayerSplash(false)}
                        onOpponentSplashComplete={() => setShowOpponentSplash(false)}
                        onAnswer={(index) => {
                          if (state.matchPaused) return;
                          actions.submitAnswer(index);
                        }}
                      />
                    </motion.div>
                    <AnimatePresence>
                      {showRoundTransition && (
                        <RoundTransitionOverlay
                          questionNumber={transitionSnapshot.questionNumber}
                          categoryName={transitionSnapshot.categoryName}
                          half={transitionSnapshot.half}
                          isExtra={transitionSnapshot.isExtra}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </>
          )}

          {isHalftime && possessionState && (
            <HalftimeScreen
              visible={true}
              playerGoals={myGoals}
              opponentGoals={oppGoals}
              playerName={playerUsername}
              opponentName={opponentUsername}
              playerAvatarUrl={playerAvatar}
              opponentAvatarUrl={opponentAvatar}
              playerPosition={myPossessionPct}
              deadlineAt={possessionState.halftime.deadlineAt}
              categoryOptions={possessionState.halftime.categoryOptions}
              mySeat={mySeat}
              firstBanSeat={possessionState.halftime.firstBanSeat}
              myBan={mySeat === 2 ? possessionState.halftime.bans.seat2 : mySeat === 1 ? possessionState.halftime.bans.seat1 : null}
              opponentBan={mySeat === 2 ? possessionState.halftime.bans.seat1 : mySeat === 1 ? possessionState.halftime.bans.seat2 : null}
              onBanCategory={handleHalftimeBan}
            />
          )}
        </div>

      </div>

      {/* Goal celebration overlay */}
      <AnimatePresence>
        {goalCelebration && (
          <GoalCelebrationOverlay
            scorerName={goalCelebration.scorerName}
            isMeScorer={goalCelebration.isMeScorer}
          />
        )}
      </AnimatePresence>

      <QuitMatchModal
        open={showQuitModal}
        onOpenChange={setShowQuitModal}
        description="Leave temporarily and rejoin before the timer ends, or forfeit now."
        secondaryConfirmLabel="Leave Temporarily"
        onSecondaryConfirm={() => {
          setShowQuitModal(false);
          onQuit();
        }}
        confirmLabel="Forfeit Match"
        onConfirm={() => {
          setShowQuitModal(false);
          onForfeit();
        }}
      />
    </div>
  );
}
