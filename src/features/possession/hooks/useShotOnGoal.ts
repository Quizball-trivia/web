'use client';

import { useCallback, useRef } from 'react';
import { usePossessionMatchStore } from '@/stores/possessionMatch.store';
import { HARD_QUESTIONS, pickQuestion } from '../data/mockQuestions';
import { TIMER_SECONDS, BALL_ANIM_MS, QUESTIONS_PER_HALF } from '../types/possession.types';
import type { AnswerStateArray } from '../types/possession.types';
import { playSfx } from '@/lib/sounds';

export function useShotOnGoal(
  usedQuestionIdsRef: React.RefObject<Set<string>>,
  advanceToNextQuestion: (position: number) => void,
) {
  const store = usePossessionMatchStore;
  const shotBallOriginRef = useRef(0);

  const initializeShot = useCallback(() => {
    const { player, setTimeRemaining } = store.getState();
    const playerX = 30 + (player.position / 100) * 440;
    shotBallOriginRef.current = player.position > 50 ? playerX + 14 : playerX - 14;

    const sq = pickQuestion(HARD_QUESTIONS, usedQuestionIdsRef.current!);
    usedQuestionIdsRef.current!.add(sq.id);

    const s = store.getState();
    s.setShotQuestion(sq);
    s.setShotSelectedAnswer(null);
    s.setShotOpponentAnswer(null);
    s.setShotAnswerStates(['default', 'default', 'default', 'default']);
    s.setShotResult('pending');
    s.setShotPlayerTime(0);
    s.setShotOpponentTime(0);
    s.incrementTotalShots();

    // Pre-determine AI defender answer
    const aiDelay = 2 + Math.random() * 6;
    const isCorrect = Math.random() < 0.55;
    const aiAnswer = isCorrect
      ? sq.correctIndex
      : ((sq.correctIndex + 1 + Math.floor(Math.random() * 3)) % 4);
    s.setShotOpponentAnswer(aiAnswer);
    s.setShotOpponentTime(aiDelay);

    setTimeRemaining(TIMER_SECONDS);
  }, [usedQuestionIdsRef]);

  const handleShotAnswer = useCallback((index: number, stopTimer: () => void) => {
    const s = store.getState();
    if (s.shotSelectedAnswer !== null || !s.shotQuestion) return;

    const elapsed = TIMER_SECONDS - s.timeRemaining;
    s.setShotPlayerTime(elapsed);
    s.setShotSelectedAnswer(index);
    stopTimer();

    const playerCorrect = index === s.shotQuestion.correctIndex;
    const aiCorrect = s.shotOpponentAnswer === s.shotQuestion.correctIndex;
    const newStates: AnswerStateArray = s.shotQuestion.options.map((_, i) => {
      if (i === s.shotQuestion!.correctIndex) return 'correct';
      if (i === index && i !== s.shotQuestion!.correctIndex) return 'wrong';
      return 'disabled';
    }) as AnswerStateArray;
    s.setShotAnswerStates(newStates);

    const { normalQuestionsInHalf, half, player, opponent } = s;

    const handlePostShot = (resetPos: number) => {
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
        advanceToNextQuestion(resetPos);
      }
    };

    setTimeout(() => {
      if (!playerCorrect) {
        // MISS
        playSfx('kick');
        store.getState().setShotResult('miss');
        store.getState().incrementTotalQuestions();
        setTimeout(() => {
          const st = store.getState();
          st.setShotResult('pending');
          st.setPlayer((p) => ({ ...p, position: 60, momentum: 0, isShooting: false }));
          st.setOpponent((o) => ({ ...o, position: 40 }));
        }, BALL_ANIM_MS);
        setTimeout(() => handlePostShot(60), 2500);
      } else if (aiCorrect && s.shotOpponentTime <= elapsed) {
        // SAVED
        playSfx('kick');
        store.getState().setShotResult('saved');
        store.getState().incrementTotalCorrect();
        store.getState().incrementTotalQuestions();
        setTimeout(() => {
          const st = store.getState();
          st.setShotResult('pending');
          st.setPlayer((p) => ({ ...p, position: 60, momentum: 0, isShooting: false }));
          st.setOpponent((o) => ({ ...o, position: 40 }));
        }, BALL_ANIM_MS);
        setTimeout(() => handlePostShot(60), 2500);
      } else {
        // GOAL!
        playSfx('kick');
        store.getState().setShotResult('goal');
        store.getState().incrementTotalCorrect();
        store.getState().incrementTotalQuestions();
        setTimeout(() => {
          const st = store.getState();
          st.setShotResult('pending');
          st.setPlayer((p) => ({ ...p, goals: p.goals + 1, position: 50, momentum: 0, isShooting: false }));
          st.setOpponent((o) => ({ ...o, position: 50 }));
          setTimeout(() => store.getState().setPhase('goal'), 500);
        }, BALL_ANIM_MS);
      }
    }, 1500);
  }, [advanceToNextQuestion]);

  return { initializeShot, handleShotAnswer, shotBallOriginRef };
}
