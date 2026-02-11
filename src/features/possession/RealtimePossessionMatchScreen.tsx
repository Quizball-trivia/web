'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRealtimeGameLogic } from '@/features/game/hooks/useRealtimeGameLogic';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { getSocket } from '@/lib/realtime/socket-client';
import { QuitMatchModal } from '@/features/game/components/QuitMatchModal';
import { HalftimeScreen } from './components/HalftimeScreen';
import type { TacticalCard } from '@/lib/realtime/socket.types';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type { AnswerStateArray, FeedDirection, PenaltyResult, Phase, ShotResult } from './types/possession.types';
import { DEFAULT_ANSWER_STATES } from './types/possession.types';
import { getZone } from './hooks/usePossessionMovement';
import { PossessionHUD } from './components/PossessionHUD';
import { ShotHUD } from './components/ShotHUD';
import { PenaltyHUD } from './components/PenaltyHUD';
import { PitchVisualization } from './components/PitchVisualization';
import { PossessionFeed } from './components/PossessionFeed';
import { PossessionQuestionPanel } from './components/PossessionQuestionPanel';
import { useGameSounds } from '@/lib/sounds/useGameSounds';
import { logger } from '@/utils/logger';

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
  if (selectedAnswer === null) return DEFAULT_ANSWER_STATES;

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

export function RealtimePossessionMatchScreen({
  playerAvatar,
  playerUsername,
  opponentAvatar,
  opponentUsername,
  onQuit,
  onForfeit,
}: RealtimePossessionMatchScreenProps) {
  const { state, actions } = useRealtimeGameLogic();
  const { playSfx, toggleMute, isMuted } = useGameSounds();
  const match = useRealtimeMatchStore((store) => store.match);
  const answerAck = match?.answerAck ?? null;
  const opponentAnsweredCorrectly = match?.opponentAnsweredCorrectly ?? null;
  const opponentRecentPoints = match?.opponentRecentPoints ?? 0;
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showPlayerSplash, setShowPlayerSplash] = useState(false);
  const [showOpponentSplash, setShowOpponentSplash] = useState(false);
  const [playerSplashPoints, setPlayerSplashPoints] = useState(0);
  const [opponentSplashPoints, setOpponentSplashPoints] = useState(0);
  const [shotBallOriginX, setShotBallOriginX] = useState(440);
  const [delayedIsShooter, setDelayedIsShooter] = useState(false);
  const tacticSentRef = useRef(false);
  const prevPhaseRef = useRef<string | null>(null);
  const shownSplashQRef = useRef<{ player: number | null; opponent: number | null }>({
    player: null,
    opponent: null,
  });

  const possessionState = match?.possessionState;
  const phase = possessionState?.phase;
  const isHalftime = phase === 'HALFTIME';

  useEffect(() => {
    setMuted(isMuted());
  }, [isMuted]);

  useEffect(() => {
    if (!isHalftime) {
      tacticSentRef.current = false;
    }
  }, [isHalftime]);

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
    if (state.roundResult.phaseKind === 'normal') playSfx('pass');
    if (state.roundResult.phaseKind === 'shot' || state.roundResult.phaseKind === 'penalty') playSfx('kick');
  }, [state.roundResult, playSfx]);

  useEffect(() => {
    if (!match?.matchId || !possessionState) return;
    logger.info('Possession debug state transition', {
      matchId: match.matchId,
      phase: possessionState.phase,
      half: possessionState.half,
      sharedPossession: possessionState.sharedPossession,
      normalQuestionsAnsweredInHalf: possessionState.normalQuestionsAnsweredInHalf,
      phaseKind: possessionState.phaseKind,
      phaseRound: possessionState.phaseRound,
      attackerSeat: possessionState.attackerSeat,
      shooterSeat: possessionState.shooterSeat,
      goals: possessionState.goals,
      penaltyGoals: possessionState.penaltyGoals,
      seatMomentum: possessionState.seatMomentum,
    });
  }, [match?.matchId, possessionState]);

  const mySeat = match?.mySeat;
  const shooterSeat = possessionState?.shooterSeat ?? null;
  const phaseKind = match?.currentQuestion?.phaseKind ?? possessionState?.phaseKind ?? 'normal';
  const isPenaltyQuestion = phaseKind === 'penalty';
  const isShotQuestion = phaseKind === 'shot';
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

  const possessionPct = possessionState?.sharedPossession ?? 50;
  const myPossessionPct = mySeat === 2 ? 100 - possessionPct : possessionPct;
  const myMomentum = mySeat === 2 ? possessionState?.seatMomentum.seat2 ?? 0 : possessionState?.seatMomentum.seat1 ?? 0;
  const oppMomentum = mySeat === 2 ? possessionState?.seatMomentum.seat1 ?? 0 : possessionState?.seatMomentum.seat2 ?? 0;
  const localQuestion = state.currentQuestion;
  const localQuestionIndex = localQuestion?.qIndex ?? null;

  useEffect(() => {
    shownSplashQRef.current = { player: null, opponent: null };
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

  useEffect(() => {
    if (localQuestionIndex === null || !possessionState) return;
    if (phaseKind !== 'shot') return;
    const isMirrored = possessionState.half === 2;
    const isAttackerMe = possessionState.attackerSeat === mySeat;
    if (isMirrored) {
      const basePlayerX = 470 - (myPossessionPct / 100) * 440;
      const baseOpponentX = basePlayerX + 30;
      setShotBallOriginX(isAttackerMe ? basePlayerX - 14 : baseOpponentX + 14);
    } else {
      const basePlayerX = 30 + (myPossessionPct / 100) * 440;
      const baseOpponentX = basePlayerX - 30;
      setShotBallOriginX(isAttackerMe ? basePlayerX + 14 : baseOpponentX - 14);
    }
  }, [localQuestionIndex, myPossessionPct, mySeat, phaseKind, possessionState]);

  const handleSelectTactic = (tactic: TacticalCard) => {
    if (!match?.matchId) return;
    if (tacticSentRef.current) return;
    tacticSentRef.current = true;
    getSocket().emit('match:tactic_select', {
      matchId: match.matchId,
      tactic,
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

  const attackerSeat = localQuestion?.attackerSeat ?? possessionState?.attackerSeat ?? null;
  const attackerIsMe = attackerSeat !== null && attackerSeat === mySeat;
  const shooterIsMe = shooterSeat !== null && shooterSeat === mySeat;

  const mirrored = (possessionState?.half ?? 1) === 2;
  const ballOnPlayer = myPossessionPct > 50 || (myPossessionPct === 50 && possessionState?.kickOffSeat === mySeat);

  const targetGoal = useMemo((): 'left' | 'right' | undefined => {
    if (!isShotQuestion && !isPenaltyQuestion) return undefined;
    // Penalties: always the same goal (like real football) — only icons swap via isPlayerShooter.
    if (isPenaltyQuestion) return mirrored ? 'left' : 'right';
    // Shots: goal depends on who's attacking XOR half (camera follows the attacker).
    const isMyAction = attackerIsMe;
    return (isMyAction !== mirrored) ? 'right' : 'left';
  }, [isShotQuestion, isPenaltyQuestion, attackerIsMe, mirrored]);

  useEffect(() => {
    if (!answerAck && !state.roundResult && !state.opponentAnswered) return;
    const kind = state.roundResult?.phaseKind ?? answerAck?.phaseKind ?? phaseKind;
    if (kind !== 'normal') return;

    const activeQIndex = localQuestion?.qIndex ?? answerAck?.qIndex ?? state.roundResult?.qIndex ?? null;
    if (activeQIndex === null) return;

    let opponentTimer: ReturnType<typeof setTimeout> | null = null;
    const immediatePlayerCorrect = answerAck?.isCorrect ?? myRound?.isCorrect ?? null;
    const immediatePlayerPoints = answerAck?.pointsEarned ?? myRound?.pointsEarned ?? 0;
    if (immediatePlayerCorrect && shownSplashQRef.current.player !== activeQIndex) {
      setPlayerSplashPoints(immediatePlayerPoints);
      setShowPlayerSplash(true);
      shownSplashQRef.current.player = activeQIndex;
    }

    const opponentCorrectImmediate = state.opponentAnswered && opponentAnsweredCorrectly === true;
    const opponentCorrectResolved = oppRound?.isCorrect === true;
    if ((opponentCorrectImmediate || opponentCorrectResolved) && shownSplashQRef.current.opponent !== activeQIndex) {
      const points = opponentCorrectImmediate
        ? opponentRecentPoints
        : (oppRound?.pointsEarned ?? 0);
      setOpponentSplashPoints(points);
      opponentTimer = setTimeout(() => setShowOpponentSplash(true), 350);
      shownSplashQRef.current.opponent = activeQIndex;
    }
    return () => {
      if (opponentTimer) clearTimeout(opponentTimer);
    };
  }, [answerAck, localQuestion?.qIndex, myRound, oppRound, opponentAnsweredCorrectly, opponentRecentPoints, phaseKind, state.opponentAnswered, state.roundResult]);

  const shotResult: ShotResult = useMemo(() => {
    if (!state.roundResult || (state.roundResult.phaseKind ?? phaseKind) !== 'shot' || !myRound || !oppRound) return 'pending';
    const attackerCorrect = attackerIsMe ? myRound.isCorrect : oppRound.isCorrect;
    const defenderCorrect = attackerIsMe ? oppRound.isCorrect : myRound.isCorrect;
    if (attackerCorrect && !defenderCorrect) return 'goal';
    if (defenderCorrect) return 'saved';
    return 'miss';
  }, [attackerIsMe, myRound, oppRound, phaseKind, state.roundResult]);

  // Use the round result's shooterSeat (stable) instead of live shooterSeat which may already point to next penalty
  const resultShooterIsMe = state.roundResult?.shooterSeat != null && state.roundResult.shooterSeat === mySeat;

  const penaltyResult: PenaltyResult = useMemo(() => {
    if (!state.roundResult || (state.roundResult.phaseKind ?? phaseKind) !== 'penalty') return null;
    const shooterRound = resultShooterIsMe ? myRound : oppRound;
    const keeperRound = resultShooterIsMe ? oppRound : myRound;
    const shooterCorrect = shooterRound?.isCorrect ?? false;
    const keeperCorrect = keeperRound?.isCorrect ?? false;
    // Mirror backend: shooter wrong → saved, both correct → faster wins, shooter correct + keeper wrong → goal
    if (!shooterCorrect) return 'saved';
    if (!keeperCorrect) return 'goal';
    return (shooterRound?.timeMs ?? 10000) < (keeperRound?.timeMs ?? 10000) ? 'goal' : 'saved';
  }, [myRound, oppRound, phaseKind, resultShooterIsMe, state.roundResult]);

  const uiPhase: Phase = useMemo(() => {
    if (isHalftime) return 'halftime';
    if (isPenaltyQuestion) {
      if (state.roundResolved) return 'penalty-result';
      return state.questionPhase === 'playing' ? 'penalty-playing' : 'penalty-question';
    }
    if (isShotQuestion) return 'shot';
    if (state.roundResolved) return 'reveal';
    return state.questionPhase === 'playing' ? 'playing' : 'question-reveal';
  }, [isHalftime, isPenaltyQuestion, isShotQuestion, state.questionPhase, state.roundResolved]);

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
    return toAnswerStates(optionsCount, state.selectedAnswer, answerAck?.isCorrect ?? null);
  }, [answerAck?.isCorrect, question?.options.length, state.correctIndex, state.roundResolved, state.selectedAnswer]);

  const opponentAnswer = useMemo(() => {
    if (!state.roundResolved) return null;
    return oppRound?.selectedIndex ?? null;
  }, [oppRound?.selectedIndex, state.roundResolved]);

  const { zone, color: zoneColor } = useMemo(() => getZone(myPossessionPct), [myPossessionPct]);
  const questionInHalf = possessionState?.normalQuestionsAnsweredInHalf ?? 0;
  const questionProgress = useMemo(() => {
    if (phase === 'HALFTIME') return 6;

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
        return answerAck.isCorrect
          ? { message: 'You answered correctly', direction: 'forward', side: 'left' }
          : { message: 'You missed', direction: 'backward', side: 'left' };
      }
      if (state.opponentAnswered && opponentAnsweredCorrectly !== null) {
        return opponentAnsweredCorrectly
          ? { message: 'Opponent answered correctly', direction: 'backward', side: 'right' }
          : { message: 'Opponent missed', direction: 'forward', side: 'right' };
      }
      return { message: null, direction: 'neutral', side: 'left' };
    }

    const kind = state.roundResult.phaseKind ?? phaseKind;
    if (kind === 'shot') {
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
        ? (shooterIsMe ? 'left' : 'right')
        : (shooterIsMe ? 'right' : 'left');
      const feedResult: FeedResult = penaltyResult === 'goal' || penaltyResult === 'saved' ? penaltyResult : null;
      return { message: null, direction: 'neutral', side, penaltyResult: feedResult };
    }

    if (!myRound.isCorrect && !oppRound.isCorrect) {
      return { message: 'Both wrong · midfield drift', direction: 'neutral', side: 'left' };
    }
    if (myRound.isCorrect && !oppRound.isCorrect) {
      return { message: 'You win the duel', direction: 'forward', side: 'left' };
    }
    if (!myRound.isCorrect && oppRound.isCorrect) {
      return { message: 'Opponent wins the duel', direction: 'backward', side: 'right' };
    }
    if (myRound.timeMs < oppRound.timeMs) {
      return { message: 'Both correct · you were faster', direction: 'forward', side: 'left' };
    }
    if (oppRound.timeMs < myRound.timeMs) {
      return { message: 'Both correct · opponent was faster', direction: 'backward', side: 'right' };
    }
    return { message: 'Both correct · even duel', direction: 'neutral', side: 'left' };
  }, [answerAck, attackerIsMe, myRound, oppRound, opponentAnsweredCorrectly, penaltyResult, phaseKind, shooterIsMe, shotResult, state.opponentAnswered, state.roundResult]);

  const showMainUI = !isHalftime && phase !== 'COMPLETED';

  if (!match || !possessionState) {
    return (
      <div className="min-h-dvh w-full bg-[#0f1420] flex items-center justify-center">
        <div className="text-sm text-white/50 font-fun font-bold">Waiting for possession state...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1420] flex flex-col items-center relative">
      <button
        onClick={() => {
          const next = toggleMute();
          setMuted(next);
        }}
        className="fixed top-4 left-4 z-40 size-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-lg transition-colors"
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '\ud83d\udd07' : '\ud83d\udd0a'}
      </button>

      <div className="w-full max-w-lg flex flex-col">
        {showMainUI && (
          <>
            {isShotQuestion ? (
              <ShotHUD
                playerGoals={myGoals}
                opponentGoals={oppGoals}
                playerAvatarUrl={playerAvatar}
                opponentAvatarUrl={opponentAvatar}
                timeRemaining={state.timeRemaining}
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
                isPenaltySuddenDeath={Math.max(myPenaltyGoals, oppPenaltyGoals) >= 5}
                isPlayerShooter={isShooter}
                playerAvatarUrl={playerAvatar}
                opponentAvatarUrl={opponentAvatar}
                timeRemaining={state.timeRemaining}
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
                timeRemaining={state.timeRemaining}
                half={possessionState.half}
                questionInHalf={questionProgress}
                zone={zone}
                zoneColor={zoneColor}
                onQuit={() => setShowQuitModal(true)}
              />
            )}

            <PitchVisualization
              playerPosition={myPossessionPct}
              playerAvatarUrl={playerAvatar}
              opponentAvatarUrl={opponentAvatar}
              myMomentum={(isPenaltyQuestion || isShotQuestion) ? 0 : myMomentum}
              oppMomentum={(isPenaltyQuestion || isShotQuestion) ? 0 : oppMomentum}
              penaltyMode={isPenaltyQuestion ? {
                isPlayerShooter: delayedIsShooter,
                result: penaltyResult,
                phase: state.roundResolved ? 'result' : (state.questionPhase === 'playing' ? 'playing' : 'setup'),
              } : undefined}
              shotMode={isShotQuestion ? {
                result: shotResult,
                ballOriginX: shotBallOriginX,
              } : undefined}
              zoomToGoal={isPenaltyQuestion || isShotQuestion}
              mirrored={mirrored}
              targetGoal={targetGoal}
              ballOnPlayer={ballOnPlayer}
            />

            {/* Penalty result splash overlay */}
            <AnimatePresence>
              {isPenaltyQuestion && penaltyResult && state.roundResolved && (
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
              )}
            </AnimatePresence>

            <PossessionFeed
              message={feed.message}
              direction={feed.direction}
              side={feed.side}
              penaltyResult={feed.penaltyResult ?? null}
            />

            <PossessionQuestionPanel
              phase={uiPhase}
              isPenaltyPhase={isPenaltyQuestion}
              isShotPhase={isShotQuestion}
              question={question}
              showOptions={state.showOptions}
              selectedAnswer={state.selectedAnswer}
              answerStates={answerStates}
              opponentAnswer={opponentAnswer}
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
          </>
        )}

        {isHalftime && (
          <HalftimeScreen
            visible={true}
            playerGoals={myGoals}
            opponentGoals={oppGoals}
            playerName={playerUsername}
            opponentName={opponentUsername}
            playerAvatarUrl={playerAvatar}
            opponentAvatarUrl={opponentAvatar}
            playerPosition={myPossessionPct}
            playerMomentum={myMomentum}
            myReady={mySeat === 2 ? !!possessionState.halftimeReady?.seat2 : !!possessionState.halftimeReady?.seat1}
            opponentReady={mySeat === 2 ? !!possessionState.halftimeReady?.seat1 : !!possessionState.halftimeReady?.seat2}
            onSelectTactic={handleSelectTactic}
          />
        )}

      </div>

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
