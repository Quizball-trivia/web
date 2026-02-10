'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePossessionMatchStore } from '@/stores/possessionMatch.store';
import { useGameSounds } from '@/lib/sounds/useGameSounds';
import {
  TIMER_SECONDS,
  PENALTY_TIMER,
  QUESTION_REVEAL_MS,
  QUESTIONS_PER_HALF,
  MAX_PENALTY_ROUNDS,
} from '../types/possession.types';
import type { AnswerStateArray, TacticalCard } from '../types/possession.types';
import {
  getZone,
  getDifficultyForZone,
  getTacticModifiers,
  calculatePossessionMove,
  shouldTriggerShot,
  clamp,
} from './usePossessionMovement';
import { getQuestionPool, pickQuestion, HARD_QUESTIONS } from '../data/mockQuestions';
import { useShotOnGoal } from './useShotOnGoal';
import { getDiceBearAvatarUrl, DEFAULT_AVATAR_PRIMARY, DEFAULT_AVATAR_SECONDARY } from '@/lib/avatars';

const PLAYER_AVATAR = getDiceBearAvatarUrl(DEFAULT_AVATAR_PRIMARY, 128);
const OPPONENT_AVATAR = getDiceBearAvatarUrl(DEFAULT_AVATAR_SECONDARY, 128);

export function usePossessionGameLogic() {
  const { playSfx, toggleMute, isMuted } = useGameSounds();
  const store = usePossessionMatchStore;

  // Subscribe to all state for re-renders
  const state = usePossessionMatchStore(useShallow((s) => s));

  const usedQuestionIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const penaltyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Shot hook ────────────────────────────────────────────────
  const advanceToNextQuestion = useCallback((currentPosition: number) => {
    const s = store.getState();
    s.setNormalQuestionsInHalf((q) => q + 1);
    const difficulty = getDifficultyForZone(currentPosition);
    const pool = getQuestionPool(difficulty);
    const q = pickQuestion(pool, usedQuestionIdsRef.current);
    usedQuestionIdsRef.current.add(q.id);
    s.setCurrentQuestion(q);
    s.resetQuestionState();
    s.setPhase('question-reveal');
  }, []);

  const { initializeShot, handleShotAnswer, shotBallOriginRef } = useShotOnGoal(
    usedQuestionIdsRef,
    advanceToNextQuestion,
  );

  // ─── Timer management ─────────────────────────────────────────
  const startTimer = useCallback(() => {
    store.getState().setTimeRemaining(TIMER_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      store.getState().setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startPenaltyTimer = useCallback(() => {
    store.getState().setTimeRemaining(PENALTY_TIMER);
    if (penaltyTimerRef.current) clearInterval(penaltyTimerRef.current);
    penaltyTimerRef.current = setInterval(() => {
      store.getState().setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (penaltyTimerRef.current) clearInterval(penaltyTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopPenaltyTimer = useCallback(() => {
    if (penaltyTimerRef.current) {
      clearInterval(penaltyTimerRef.current);
      penaltyTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      stopPenaltyTimer();
    };
  }, [stopTimer, stopPenaltyTimer]);

  // ─── Auto-expire timers ───────────────────────────────────────
  useEffect(() => {
    if (state.timeRemaining === 0 && state.phase === 'playing' && state.selectedAnswer === null) {
      handleAnswer(-1);
    }
  }, [state.timeRemaining, state.phase, state.selectedAnswer]);

  useEffect(() => {
    if (state.timeRemaining === 0 && state.phase === 'penalty-playing' && state.penaltyPlayerAnswer === null) {
      handlePenaltyAnswer(-1);
    }
  }, [state.timeRemaining, state.phase, state.penaltyPlayerAnswer]);

  useEffect(() => {
    if (state.timeRemaining === 0 && state.phase === 'shot' && state.shotSelectedAnswer === null) {
      handleShotAnswer(-1, stopTimer);
    }
  }, [state.timeRemaining, state.phase, state.shotSelectedAnswer]);

  // ─── Phase effects ────────────────────────────────────────────

  // Pregame
  useEffect(() => {
    if (state.phase !== 'pregame') return;
    playSfx('whistle');
    const difficulty = getDifficultyForZone(50);
    const pool = getQuestionPool(difficulty);
    const q = pickQuestion(pool, usedQuestionIdsRef.current);
    usedQuestionIdsRef.current.add(q.id);
    store.getState().setCurrentQuestion(q);
    const t = setTimeout(() => store.getState().setPhase('question-reveal'), 2000);
    return () => clearTimeout(t);
  }, [state.phase]);

  // Question reveal
  useEffect(() => {
    if (state.phase !== 'question-reveal') return;
    store.getState().setShowOptions(false);
    const t = setTimeout(() => {
      store.getState().setShowOptions(true);
      store.getState().setPhase('playing');
      startTimer();
    }, QUESTION_REVEAL_MS);
    return () => clearTimeout(t);
  }, [state.phase, startTimer]);

  // Simulate opponent
  useEffect(() => {
    if (state.phase !== 'playing') return;
    const q = state.currentQuestion;
    if (!q) return;
    const delay = 2000 + Math.random() * 6000;
    const isCorrect = Math.random() < 0.55;
    const answer = isCorrect ? q.correctIndex : ((q.correctIndex + 1 + Math.floor(Math.random() * 3)) % 4);
    const t = setTimeout(() => {
      store.getState().setOpponentAnswer(answer);
      store.getState().setOpponentTime(delay / 1000);
    }, delay);
    return () => clearTimeout(t);
  }, [state.phase, state.currentQuestion?.id]);

  // Reveal phase
  useEffect(() => {
    if (state.phase !== 'reveal') return;
    const q = state.currentQuestion;
    if (!q) return;

    const newStates = q.options.map((_, i) => {
      if (i === q.correctIndex) return 'correct';
      if (i === state.selectedAnswer && i !== q.correctIndex) return 'wrong';
      return 'disabled';
    }) as AnswerStateArray;
    store.getState().setAnswerStates(newStates);

    const playerCorrect = state.selectedAnswer === q.correctIndex;
    if (playerCorrect) store.getState().incrementTotalCorrect();
    store.getState().incrementTotalQuestions();

    // Score splashes
    if (playerCorrect) {
      const pts = Math.max(50, Math.round((TIMER_SECONDS - state.playerTime) / TIMER_SECONDS * 100));
      store.getState().setPlayerSplashPoints(pts);
      store.getState().setShowPlayerSplash(true);
    }
    const oppCorrect = state.opponentAnswer === q.correctIndex;
    if (oppCorrect) {
      const oppPts = Math.max(50, Math.round((TIMER_SECONDS - state.opponentTime) / TIMER_SECONDS * 100));
      const oppTimer = setTimeout(() => {
        store.getState().setOpponentSplashPoints(oppPts);
        store.getState().setShowOpponentSplash(true);
      }, 400);
      const t2 = setTimeout(() => store.getState().setPhase('possession-move'), 2000);
      return () => { clearTimeout(oppTimer); clearTimeout(t2); };
    }

    const t = setTimeout(() => store.getState().setPhase('possession-move'), 2000);
    return () => clearTimeout(t);
  }, [state.phase]);

  // Possession move
  useEffect(() => {
    if (state.phase !== 'possession-move') return;
    playSfx('pass');

    const q = state.currentQuestion;
    if (!q) return;
    const playerCorrect = state.selectedAnswer === q.correctIndex;
    const oppCorrect = state.opponentAnswer === q.correctIndex;
    const mods = getTacticModifiers(state.half, state.tactic);

    const result = calculatePossessionMove(
      playerCorrect, oppCorrect, state.playerTime, state.opponentTime, mods, TIMER_SECONDS,
    );

    const newPos = clamp(state.player.position + result.posDelta, 0, 100);
    const newMom = clamp(state.player.momentum + result.momDelta, 0, 6);

    const s = store.getState();
    s.setPlayer((p) => ({ ...p, position: newPos, momentum: newMom }));
    s.setOpponent((o) => ({ ...o, position: 100 - newPos }));
    s.setFeedMessage(result.message);
    s.setFeedDirection(result.direction);
    s.addPositionSample(newPos);

    const t = setTimeout(() => {
      store.getState().setFeedMessage(null);

      if (shouldTriggerShot(newPos, newMom, mods.shotMomentumThreshold)) {
        store.getState().setPhase('shot');
        return;
      }

      const nextQInHalf = state.normalQuestionsInHalf + 1;
      if (nextQInHalf >= QUESTIONS_PER_HALF) {
        if (state.half === 1) {
          store.getState().setPhase('halftime');
        } else {
          store.getState().setPhase(
            state.player.goals === state.opponent.goals ? 'penalty-transition' : 'fulltime',
          );
        }
        return;
      }

      advanceToNextQuestion(newPos);
    }, 1500);

    return () => clearTimeout(t);
  }, [state.phase]);

  // Shot phase init
  useEffect(() => {
    if (state.phase !== 'shot') return;
    initializeShot();
    startTimer();
  }, [state.phase, startTimer, initializeShot]);

  // Goal phase
  useEffect(() => {
    if (state.phase !== 'goal') return;
    const { normalQuestionsInHalf, half, player, opponent } = store.getState();
    const t = setTimeout(() => {
      const nextQInHalf = normalQuestionsInHalf + 1;
      if (nextQInHalf >= QUESTIONS_PER_HALF) {
        if (half === 1) {
          store.getState().setPhase('halftime');
        } else {
          store.getState().setPhase(
            player.goals === opponent.goals ? 'penalty-transition' : 'fulltime',
          );
        }
      } else {
        advanceToNextQuestion(50);
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [state.phase]);

  // Halftime
  useEffect(() => {
    if (state.phase !== 'halftime') return;
    playSfx('whistle');
  }, [state.phase]);

  // Fulltime
  useEffect(() => {
    if (state.phase !== 'fulltime') return;
    playSfx('whistle');
  }, [state.phase]);

  // ─── Penalty effects ──────────────────────────────────────────
  useEffect(() => {
    if (state.phase !== 'penalty-transition') return;
    const t = setTimeout(() => {
      const s = store.getState();
      s.setPenaltyRound(1);
      s.setPenaltyPlayerScore(0);
      s.setPenaltyOpponentScore(0);
      s.setIsPenaltySuddenDeath(false);
      s.setIsPlayerShooter(true);
      s.setPhase('penalty-question');
    }, 3000);
    return () => clearTimeout(t);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== 'penalty-question') return;
    const pq = pickQuestion(HARD_QUESTIONS, usedQuestionIdsRef.current);
    usedQuestionIdsRef.current.add(pq.id);
    const s = store.getState();
    s.setPenaltyQuestion(pq);
    s.setPenaltyPlayerAnswer(null);
    s.setPenaltyOpponentAnswer(null);
    s.setPenaltyAnswerStates(['default', 'default', 'default', 'default']);
    s.setPenaltyResult(null);
    s.setPenaltyShowOptions(false);
    s.setPenaltyPlayerTime(0);
    s.setPenaltyOpponentTime(0);
    s.setPenaltyFieldPhase('setup');

    const t = setTimeout(() => {
      const st = store.getState();
      st.setPenaltyShowOptions(true);
      st.setPenaltyFieldPhase('playing');
      st.setPhase('penalty-playing');
      startPenaltyTimer();
    }, 1500);
    return () => clearTimeout(t);
  }, [state.phase, startPenaltyTimer]);

  useEffect(() => {
    if (state.phase !== 'penalty-playing' || !state.penaltyQuestion) return;
    const pq = state.penaltyQuestion;
    const delay = 1000 + Math.random() * 3000;
    const isCorrect = Math.random() < 0.6;
    const answer = isCorrect
      ? pq.correctIndex
      : ((pq.correctIndex + 1 + Math.floor(Math.random() * 3)) % 4);
    const t = setTimeout(() => {
      store.getState().setPenaltyOpponentAnswer(answer);
      store.getState().setPenaltyOpponentTime(delay / 1000);
    }, delay);
    return () => clearTimeout(t);
  }, [state.phase, state.penaltyQuestion?.id]);

  useEffect(() => {
    if (state.phase !== 'penalty-reveal' || !state.penaltyQuestion) return;
    const pq = state.penaltyQuestion;
    const newStates = pq.options.map((_, i) => {
      if (i === pq.correctIndex) return 'correct';
      if (i === state.penaltyPlayerAnswer && i !== pq.correctIndex) return 'wrong';
      return 'disabled';
    }) as AnswerStateArray;
    store.getState().setPenaltyAnswerStates(newStates);

    const t = setTimeout(() => {
      store.getState().setPenaltyFieldPhase('result');
      store.getState().setPhase('penalty-result');
    }, 2000);
    return () => clearTimeout(t);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== 'penalty-result' || !state.penaltyQuestion) return;
    playSfx('kick');

    const playerCorrect = state.penaltyPlayerAnswer === state.penaltyQuestion.correctIndex;
    const opponentCorrect = state.penaltyOpponentAnswer === state.penaltyQuestion.correctIndex;

    let scored = false;
    if (state.isPlayerShooter) {
      if (playerCorrect && (!opponentCorrect || state.penaltyPlayerTime < state.penaltyOpponentTime)) {
        scored = true;
        store.getState().setPenaltyResult('goal');
        store.getState().setPenaltyPlayerScore((s) => s + 1);
      } else {
        store.getState().setPenaltyResult('saved');
      }
    } else {
      if (opponentCorrect && (!playerCorrect || state.penaltyOpponentTime < state.penaltyPlayerTime)) {
        scored = true;
        store.getState().setPenaltyResult('goal');
        store.getState().setPenaltyOpponentScore((s) => s + 1);
      } else {
        store.getState().setPenaltyResult('saved');
      }
    }


    const t = setTimeout(() => {
      const {
        penaltyRound, penaltyPlayerScore, penaltyOpponentScore,
        isPenaltySuddenDeath, isPlayerShooter,
      } = store.getState();

      const playerScore = penaltyPlayerScore;
      const oppScore = penaltyOpponentScore;

      if (isPenaltySuddenDeath) {
        if ((isPlayerShooter && scored) || (!isPlayerShooter && !scored)) {
          store.getState().setPlayer((p) => ({ ...p, goals: p.goals + 1 }));
          store.getState().setPhase('fulltime');
          return;
        } else if ((!isPlayerShooter && scored) || (isPlayerShooter && !scored)) {
          store.getState().setOpponent((o) => ({ ...o, goals: o.goals + 1 }));
          store.getState().setPhase('fulltime');
          return;
        } else {
          store.getState().setIsPlayerShooter((s) => !s);
          store.getState().setPenaltyRound((r) => r + 1);
          store.getState().setPhase('penalty-question');
        }
      } else if (penaltyRound >= MAX_PENALTY_ROUNDS) {
        if (playerScore === oppScore) {
          store.getState().setIsPenaltySuddenDeath(true);
          store.getState().setIsPlayerShooter((s) => !s);
          store.getState().setPenaltyRound((r) => r + 1);
          store.getState().setPhase('penalty-question');
        } else {
          if (playerScore > oppScore) {
            store.getState().setPlayer((p) => ({ ...p, goals: p.goals + 1 }));
          } else {
            store.getState().setOpponent((o) => ({ ...o, goals: o.goals + 1 }));
          }
          store.getState().setPhase('fulltime');
        }
      } else {
        store.getState().setIsPlayerShooter((s) => !s);
        store.getState().setPenaltyRound((r) => r + 1);
        store.getState().setPhase('penalty-question');
      }
    }, 3000);

    return () => clearTimeout(t);
  }, [state.phase]);

  // ─── Handlers ─────────────────────────────────────────────────
  const handleAnswer = useCallback((index: number) => {
    const s = store.getState();
    if (s.selectedAnswer !== null) return;
    const elapsed = TIMER_SECONDS - s.timeRemaining;
    s.setPlayerTime(elapsed);
    s.setSelectedAnswer(index);
    stopTimer();
    setTimeout(() => store.getState().setPhase('reveal'), 300);
  }, [stopTimer]);

  const handlePenaltyAnswer = useCallback((index: number) => {
    const s = store.getState();
    if (s.penaltyPlayerAnswer !== null || !s.penaltyQuestion) return;
    const elapsed = PENALTY_TIMER - s.timeRemaining;
    s.setPenaltyPlayerTime(elapsed);
    s.setPenaltyPlayerAnswer(index);
    stopPenaltyTimer();
    setTimeout(() => store.getState().setPhase('penalty-reveal'), 300);
  }, [stopPenaltyTimer]);

  const wrappedHandleShotAnswer = useCallback((index: number) => {
    handleShotAnswer(index, stopTimer);
  }, [handleShotAnswer, stopTimer]);

  const handleTacticSelected = useCallback((selectedTactic: TacticalCard) => {
    const s = store.getState();
    s.setTactic(selectedTactic);
    playSfx('whistle');
    setTimeout(() => {
      const st = store.getState();
      st.setHalf(2);
      st.setNormalQuestionsInHalf(0);
      st.setPlayer((p) => ({ ...p, position: 50, momentum: 0 }));
      st.setOpponent((o) => ({ ...o, position: 50 }));
      const difficulty = getDifficultyForZone(50);
      const pool = getQuestionPool(difficulty);
      const q = pickQuestion(pool, usedQuestionIdsRef.current);
      usedQuestionIdsRef.current.add(q.id);
      st.setCurrentQuestion(q);
      st.resetQuestionState();
      st.setPhase('question-reveal');
    }, 500);
  }, []);

  const handlePlayAgain = useCallback(() => {
    usedQuestionIdsRef.current.clear();
    store.getState().resetMatch();
    store.getState().setPhase('pregame');
  }, []);

  // ─── Dev helpers ──────────────────────────────────────────────
  const handleSkipToShot = useCallback(() => {
    const s = store.getState();
    s.setPlayer((p) => ({ ...p, position: 80, momentum: 5 }));
    s.setOpponent((o) => ({ ...o, position: 20 }));
    s.resetQuestionState();
    s.setPhase('shot');
  }, []);

  const handleSkipToPenalties = useCallback(() => {
    const s = store.getState();
    s.setHalf(2);
    s.setPlayer((p) => ({ ...p, goals: 1 }));
    s.setOpponent((o) => ({ ...o, goals: 1 }));
    s.setPhase('penalty-transition');
  }, []);

  const handleSkipToHalftime = useCallback(() => {
    const s = store.getState();
    s.setHalf(1);
    s.setNormalQuestionsInHalf(QUESTIONS_PER_HALF);
    s.setPlayer((p) => ({ ...p, goals: 1, position: 65, momentum: 3 }));
    s.setOpponent((o) => ({ ...o, goals: 1, position: 35 }));
    s.setPhase('halftime');
  }, []);

  // ─── Derived state ────────────────────────────────────────────
  const { zone, color: zoneColor } = getZone(state.player.position);
  const isPenaltyPhase = state.phase === 'penalty-question' || state.phase === 'penalty-playing' || state.phase === 'penalty-reveal' || state.phase === 'penalty-result';
  const isShotPhase = state.phase === 'shot' || state.phase === 'goal';
  const showMainUI = state.phase === 'question-reveal' || state.phase === 'playing' || state.phase === 'reveal' || state.phase === 'possession-move' || isShotPhase || isPenaltyPhase;
  const avgPosition = state.positionSamples > 0 ? Math.round(state.positionSum / state.positionSamples) : 50;

  return {
    // State
    ...state,
    zone,
    zoneColor,
    isPenaltyPhase,
    isShotPhase,
    showMainUI,
    avgPosition,
    shotBallOriginRef,

    // Avatars
    playerAvatar: PLAYER_AVATAR,
    opponentAvatar: OPPONENT_AVATAR,

    // Actions
    handleAnswer,
    handleShotAnswer: wrappedHandleShotAnswer,
    handlePenaltyAnswer,
    handleTacticSelected,
    handlePlayAgain,
    handleSkipToShot,
    handleSkipToPenalties,
    handleSkipToHalftime,
    toggleMute,
    isMuted,
  };
}
