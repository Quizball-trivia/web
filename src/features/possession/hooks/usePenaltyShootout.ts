'use client';

import { useState, useCallback, useRef } from 'react';
import type { GameQuestion } from '@/lib/domain/gameQuestion';

const PENALTY_TIMER = 5;
const MAX_PENALTY_ROUNDS = 5;

export interface PenaltyState {
  round: number;
  playerScore: number;
  opponentScore: number;
  isSuddenDeath: boolean;
  isPlayerShooter: boolean;
  question: GameQuestion | null;
  playerAnswer: number | null;
  opponentAnswer: number | null;
  playerTime: number;
  opponentTime: number;
  answerStates: Array<'default' | 'correct' | 'wrong' | 'disabled'>;
  result: 'pending' | 'goal' | 'saved' | null;
  showOptions: boolean;
  timeRemaining: number;
}

export function usePenaltyShootout() {
  const [state, setState] = useState<PenaltyState>({
    round: 1,
    playerScore: 0,
    opponentScore: 0,
    isSuddenDeath: false,
    isPlayerShooter: true,
    question: null,
    playerAnswer: null,
    opponentAnswer: null,
    playerTime: 0,
    opponentTime: 0,
    answerStates: ['default', 'default', 'default', 'default'],
    result: null,
    showOptions: false,
    timeRemaining: PENALTY_TIMER,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setState(s => ({ ...s, timeRemaining: PENALTY_TIMER }));
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setState(s => {
        if (s.timeRemaining <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return { ...s, timeRemaining: 0 };
        }
        return { ...s, timeRemaining: s.timeRemaining - 1 };
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const initialize = useCallback(() => {
    setState({
      round: 1,
      playerScore: 0,
      opponentScore: 0,
      isSuddenDeath: false,
      isPlayerShooter: true,
      question: null,
      playerAnswer: null,
      opponentAnswer: null,
      playerTime: 0,
      opponentTime: 0,
      answerStates: ['default', 'default', 'default', 'default'],
      result: null,
      showOptions: false,
      timeRemaining: PENALTY_TIMER,
    });
  }, []);

  const setQuestion = useCallback((question: GameQuestion) => {
    setState(s => ({
      ...s,
      question,
      playerAnswer: null,
      opponentAnswer: null,
      answerStates: ['default', 'default', 'default', 'default'],
      result: null,
      showOptions: false,
      playerTime: 0,
      opponentTime: 0,
    }));
  }, []);

  const showOptionsAndStartTimer = useCallback(() => {
    setState(s => ({ ...s, showOptions: true }));
    startTimer();
  }, [startTimer]);

  const setPlayerAnswer = useCallback((index: number, elapsed: number) => {
    setState(s => ({ ...s, playerAnswer: index, playerTime: elapsed }));
    stopTimer();
  }, [stopTimer]);

  const setOpponentAnswer = useCallback((index: number, elapsed: number) => {
    setState(s => ({ ...s, opponentAnswer: index, opponentTime: elapsed }));
  }, []);

  const revealAnswers = useCallback(() => {
    setState(s => {
      if (!s.question) return s;
      const newStates: Array<'default' | 'correct' | 'wrong' | 'disabled'> = s.question.options.map((_, i) => {
        if (i === s.question!.correctIndex) return 'correct';
        if (i === s.playerAnswer && i !== s.question!.correctIndex) return 'wrong';
        return 'disabled';
      });
      return { ...s, answerStates: newStates };
    });
  }, []);

  const resolveResult = useCallback(() => {
    setState(s => {
      if (!s.question) return s;

      const playerCorrect = s.playerAnswer === s.question.correctIndex;
      const opponentCorrect = s.opponentAnswer === s.question.correctIndex;

      let scored = false;
      let newPlayerScore = s.playerScore;
      let newOpponentScore = s.opponentScore;

      if (s.isPlayerShooter) {
        if (playerCorrect && (!opponentCorrect || s.playerTime < s.opponentTime)) {
          scored = true;
          newPlayerScore++;
        }
      } else {
        if (opponentCorrect && (!playerCorrect || s.opponentTime < s.playerTime)) {
          scored = true;
          newOpponentScore++;
        }
      }

      return {
        ...s,
        result: scored ? 'goal' : 'saved',
        playerScore: newPlayerScore,
        opponentScore: newOpponentScore,
      };
    });
  }, []);

  const nextPenalty = useCallback(() => {
    setState(s => ({
      ...s,
      round: s.round + 1,
      isPlayerShooter: !s.isPlayerShooter,
      question: null,
      playerAnswer: null,
      opponentAnswer: null,
      answerStates: ['default', 'default', 'default', 'default'],
      result: null,
      showOptions: false,
      playerTime: 0,
      opponentTime: 0,
      timeRemaining: PENALTY_TIMER,
    }));
  }, []);

  const enterSuddenDeath = useCallback(() => {
    setState(s => ({ ...s, isSuddenDeath: true }));
  }, []);

  const checkShootoutEnd = useCallback((): 'player-wins' | 'opponent-wins' | 'continue' | 'sudden-death' => {
    const { round, playerScore, opponentScore, isSuddenDeath, isPlayerShooter, result } = state;

    if (isSuddenDeath) {
      const scored = result === 'goal';
      if ((isPlayerShooter && scored) || (!isPlayerShooter && !scored)) {
        return 'player-wins';
      } else if ((!isPlayerShooter && scored) || (isPlayerShooter && !scored)) {
        return 'opponent-wins';
      }
      return 'continue';
    }

    if (round >= MAX_PENALTY_ROUNDS) {
      if (playerScore === opponentScore) {
        return 'sudden-death';
      } else if (playerScore > opponentScore) {
        return 'player-wins';
      } else {
        return 'opponent-wins';
      }
    }

    return 'continue';
  }, [state]);

  return {
    state,
    actions: {
      initialize,
      setQuestion,
      showOptionsAndStartTimer,
      setPlayerAnswer,
      setOpponentAnswer,
      revealAnswers,
      resolveResult,
      nextPenalty,
      enterSuddenDeath,
      checkShootoutEnd,
      stopTimer,
    },
    constants: {
      PENALTY_TIMER,
      MAX_PENALTY_ROUNDS,
    },
  };
}
