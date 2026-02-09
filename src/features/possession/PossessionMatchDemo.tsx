'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QuestionArena } from '@/features/game/components/QuestionArena';
import { AnswerCard } from '@/features/game/components/AnswerCard';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import { getDiceBearAvatarUrl, DEFAULT_AVATAR_PRIMARY, DEFAULT_AVATAR_SECONDARY } from '@/lib/avatars';
import { PitchVisualization } from './components/PitchVisualization';
import { PossessionHUD } from './components/PossessionHUD';
import { ShotOverlay } from './components/ShotOverlay';
import { HalftimeScreen, type TacticalCard } from './components/HalftimeScreen';
import { PossessionFeed } from './components/PossessionFeed';
import FulltimeResultsScreen from './components/FulltimeResultsScreen';

// ─── Avatar URLs ──────────────────────────────────────────────────
const PLAYER_AVATAR = getDiceBearAvatarUrl(DEFAULT_AVATAR_PRIMARY, 128);
const OPPONENT_AVATAR = getDiceBearAvatarUrl(DEFAULT_AVATAR_SECONDARY, 128);

// ─── Question Pools by Difficulty ─────────────────────────────────
const EASY_QUESTIONS: GameQuestion[] = [
  { id: 'e1', prompt: 'Which country has won the most FIFA World Cups?', options: ['Germany', 'Brazil', 'Argentina', 'Italy'], correctIndex: 1, categoryName: 'World Cup', difficulty: 'easy' },
  { id: 'e2', prompt: 'In which year was the first FIFA World Cup held?', options: ['1928', '1930', '1934', '1926'], correctIndex: 1, categoryName: 'History', difficulty: 'easy' },
  { id: 'e3', prompt: 'Which club has won the most UEFA Champions League titles?', options: ['AC Milan', 'Barcelona', 'Real Madrid', 'Bayern Munich'], correctIndex: 2, categoryName: 'Champions League', difficulty: 'easy' },
  { id: 'e4', prompt: 'Who scored the "Hand of God" goal?', options: ['Pelé', 'Diego Maradona', 'Zinedine Zidane', 'Johan Cruyff'], correctIndex: 1, categoryName: 'Iconic Moments', difficulty: 'easy' },
  { id: 'e5', prompt: 'Which country hosted the 2014 FIFA World Cup?', options: ['South Africa', 'Russia', 'Brazil', 'Germany'], correctIndex: 2, categoryName: 'World Cup', difficulty: 'easy' },
  { id: 'e6', prompt: 'What does VAR stand for?', options: ['Video Analysis Review', 'Video Assistant Referee', 'Visual Aid Replay', 'Video Action Replay'], correctIndex: 1, categoryName: 'Rules', difficulty: 'easy' },
  { id: 'e7', prompt: 'How long is a standard football match (excluding extra time)?', options: ['80 minutes', '90 minutes', '100 minutes', '120 minutes'], correctIndex: 1, categoryName: 'Rules', difficulty: 'easy' },
  { id: 'e8', prompt: 'Which club is known as "The Red Devils"?', options: ['Liverpool', 'Arsenal', 'Manchester United', 'Bayern Munich'], correctIndex: 2, categoryName: 'Clubs', difficulty: 'easy' },
  { id: 'e9', prompt: 'How many players are on the field per team?', options: ['9', '10', '11', '12'], correctIndex: 2, categoryName: 'Rules', difficulty: 'easy' },
  { id: 'e10', prompt: 'Which player is nicknamed "CR7"?', options: ['Cristiano Ronaldo', 'Carlos Tevez', 'Clarence Seedorf', 'Cafu'], correctIndex: 0, categoryName: 'Players', difficulty: 'easy' },
];

const MEDIUM_QUESTIONS: GameQuestion[] = [
  { id: 'm1', prompt: 'Who holds the record for most goals in a single World Cup tournament?', options: ['Pelé', 'Miroslav Klose', 'Just Fontaine', 'Ronaldo'], correctIndex: 2, categoryName: 'Records', difficulty: 'medium' },
  { id: 'm2', prompt: 'What is the maximum number of substitutions allowed in a standard FIFA match?', options: ['3', '4', '5', '6'], correctIndex: 2, categoryName: 'Rules', difficulty: 'medium' },
  { id: 'm3', prompt: 'Which team completed "The Invincibles" season in 2003-04?', options: ['Manchester United', 'Chelsea', 'Arsenal', 'Liverpool'], correctIndex: 2, categoryName: 'Premier League', difficulty: 'medium' },
  { id: 'm4', prompt: 'Which player has scored the most goals in Champions League history?', options: ['Lionel Messi', 'Cristiano Ronaldo', 'Raúl', 'Robert Lewandowski'], correctIndex: 1, categoryName: 'Champions League', difficulty: 'medium' },
  { id: 'm5', prompt: 'Which country won the first ever European Championship in 1960?', options: ['West Germany', 'Soviet Union', 'Spain', 'Italy'], correctIndex: 1, categoryName: 'Euros', difficulty: 'medium' },
  { id: 'm6', prompt: 'Who managed Barcelona during the "tiki-taka" era?', options: ['Frank Rijkaard', 'Pep Guardiola', 'Luis Enrique', 'Johan Cruyff'], correctIndex: 1, categoryName: 'Managers', difficulty: 'medium' },
  { id: 'm7', prompt: 'Which player scored the fastest hat-trick in Premier League history?', options: ['Robbie Fowler', 'Sadio Mané', 'Alan Shearer', 'Sergio Agüero'], correctIndex: 1, categoryName: 'Records', difficulty: 'medium' },
  { id: 'm8', prompt: 'What year did the Premier League start?', options: ['1990', '1991', '1992', '1993'], correctIndex: 2, categoryName: 'History', difficulty: 'medium' },
  { id: 'm9', prompt: 'Which nation has appeared in the most World Cup finals?', options: ['Brazil', 'Germany', 'Argentina', 'Italy'], correctIndex: 1, categoryName: 'World Cup', difficulty: 'medium' },
  { id: 'm10', prompt: 'Who is the all-time top scorer for the Brazilian national team?', options: ['Pelé', 'Ronaldo', 'Neymar', 'Romário'], correctIndex: 2, categoryName: 'Records', difficulty: 'medium' },
];

const HARD_QUESTIONS: GameQuestion[] = [
  { id: 'h1', prompt: 'In the 1950 World Cup, which team upset Brazil in the final match (the "Maracanazo")?', options: ['Argentina', 'Uruguay', 'Sweden', 'Spain'], correctIndex: 1, categoryName: 'World Cup', difficulty: 'hard' },
  { id: 'h2', prompt: 'Who is the youngest player to score in a World Cup final?', options: ['Pelé', 'Kylian Mbappé', 'Michael Owen', 'Ronaldo'], correctIndex: 0, categoryName: 'Records', difficulty: 'hard' },
  { id: 'h3', prompt: 'Which club won six trophies in a single calendar year in 2009?', options: ['Real Madrid', 'Manchester United', 'Barcelona', 'Bayern Munich'], correctIndex: 2, categoryName: 'Clubs', difficulty: 'hard' },
  { id: 'h4', prompt: 'How many times has the World Cup final ended 0-0 after 90 minutes?', options: ['Never', 'Once', 'Twice', 'Three times'], correctIndex: 2, categoryName: 'World Cup', difficulty: 'hard' },
  { id: 'h5', prompt: 'Which goalkeeper has the most clean sheets in Premier League history?', options: ['David James', 'Petr Čech', 'Edwin van der Sar', 'Peter Schmeichel'], correctIndex: 1, categoryName: 'Premier League', difficulty: 'hard' },
  { id: 'h6', prompt: 'Who won the first ever Ballon d\'Or?', options: ['Alfredo Di Stéfano', 'Stanley Matthews', 'Raymond Kopa', 'Lev Yashin'], correctIndex: 1, categoryName: 'Awards', difficulty: 'hard' },
  { id: 'h7', prompt: 'Which African nation was the first to reach a World Cup quarter-final?', options: ['Nigeria', 'Ghana', 'Cameroon', 'Senegal'], correctIndex: 2, categoryName: 'World Cup', difficulty: 'hard' },
  { id: 'h8', prompt: 'What is the diameter of a regulation football?', options: ['20-22 cm', '22-23 cm', '18-20 cm', '24-26 cm'], correctIndex: 0, categoryName: 'Rules', difficulty: 'hard' },
  { id: 'h9', prompt: 'Which player scored in three different World Cup finals?', options: ['Pelé', 'Zinedine Zidane', 'Vavá', 'Kylian Mbappé'], correctIndex: 2, categoryName: 'World Cup', difficulty: 'hard' },
  { id: 'h10', prompt: 'Who was the first player to score 100 Champions League goals?', options: ['Lionel Messi', 'Cristiano Ronaldo', 'Raúl', 'Karim Benzema'], correctIndex: 1, categoryName: 'Champions League', difficulty: 'hard' },
];

// ─── Types ────────────────────────────────────────────────────────
type Phase =
  | 'pregame'
  | 'question-reveal'
  | 'playing'
  | 'reveal'
  | 'possession-move'
  | 'shot'
  | 'goal'
  | 'saved'
  | 'halftime'
  | 'fulltime';

const QUESTION_REVEAL_MS = 2000;

interface PossessionState {
  position: number;   // 0–100
  momentum: number;   // 0–6
  goals: number;
  isShooting: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────
function getZone(position: number): { zone: string; color: string } {
  if (position >= 71) return { zone: 'BOX', color: '#FF4B4B' };
  if (position >= 46) return { zone: 'ATT', color: '#FF9600' };
  if (position >= 21) return { zone: 'MID', color: '#FFFFFF' };
  return { zone: 'DEF', color: '#9CA3AF' };
}

function getDifficultyForZone(position: number): 'easy' | 'medium' | 'hard' {
  if (position >= 71) return Math.random() < 0.5 ? 'medium' : 'hard';
  if (position >= 46) return 'medium';
  if (position >= 21) return Math.random() < 0.5 ? 'easy' : 'medium';
  return 'easy';
}

function getDifficultyLabel(d?: string): string {
  if (d === 'hard') return 'Hard';
  if (d === 'medium') return 'Medium';
  return 'Easy';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function calculateSpeedBonus(remainingSeconds: number): number {
  const questionPoints = remainingSeconds * 100;
  return clamp(Math.floor(questionPoints / 300), 0, 5);
}

function pickQuestion(
  pool: GameQuestion[],
  usedIds: Set<string>
): GameQuestion {
  const available = pool.filter(q => !usedIds.has(q.id));
  if (available.length === 0) {
    // All used, reset and pick any
    usedIds.clear();
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

function getQuestionPool(difficulty: 'easy' | 'medium' | 'hard'): GameQuestion[] {
  switch (difficulty) {
    case 'easy': return EASY_QUESTIONS;
    case 'medium': return MEDIUM_QUESTIONS;
    case 'hard': return HARD_QUESTIONS;
  }
}

const LABELS = ['A', 'B', 'C', 'D'];
const QUESTIONS_PER_HALF = 6;
const TIMER_SECONDS = 10;

// ─── Component ────────────────────────────────────────────────────
export function PossessionMatchDemo() {
  // Match state
  const [half, setHalf] = useState<1 | 2>(1);
  const [normalQuestionsInHalf, setNormalQuestionsInHalf] = useState(0);
  const [phase, setPhase] = useState<Phase>('pregame');
  const [tactic, setTactic] = useState<TacticalCard | null>(null);

  // Possession
  const [player, setPlayer] = useState<PossessionState>({ position: 50, momentum: 0, goals: 0, isShooting: false });
  const [opponent, setOpponent] = useState<PossessionState>({ position: 50, momentum: 0, goals: 0, isShooting: false });

  // Current question (picked by difficulty)
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion>(EASY_QUESTIONS[0]);
  const usedQuestionIdsRef = useRef<Set<string>>(new Set());

  // Question interaction
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [opponentAnswer, setOpponentAnswer] = useState<number | null>(null);
  const [opponentTime, setOpponentTime] = useState(0);
  const [playerTime, setPlayerTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(TIMER_SECONDS);
  const [answerStates, setAnswerStates] = useState<Array<'default' | 'correct' | 'wrong' | 'disabled'>>(['default', 'default', 'default', 'default']);
  const [showOptions, setShowOptions] = useState(false);

  // Shot overlay
  const [shotQuestion, setShotQuestion] = useState<GameQuestion | null>(null);
  const [shotSelectedAnswer, setShotSelectedAnswer] = useState<number | null>(null);
  const [shotAnswerStates, setShotAnswerStates] = useState<Array<'default' | 'correct' | 'wrong' | 'disabled'>>(['default', 'default', 'default', 'default']);
  const [shotResult, setShotResult] = useState<'pending' | 'goal' | 'saved'>('pending');

  // Feed
  const [feedMessage, setFeedMessage] = useState<string | null>(null);
  const [feedDirection, setFeedDirection] = useState<'forward' | 'backward' | 'neutral'>('neutral');

  // Stats tracking
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalShots, setTotalShots] = useState(0);
  const [positionSum, setPositionSum] = useState(0);
  const [positionSamples, setPositionSamples] = useState(0);

  // Refs for timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { zone, color: zoneColor } = getZone(player.position);

  // ─── Pick next question based on position ───────────────────────
  const pickNextQuestion = useCallback((position: number) => {
    const difficulty = getDifficultyForZone(position);
    const pool = getQuestionPool(difficulty);
    const q = pickQuestion(pool, usedQuestionIdsRef.current);
    usedQuestionIdsRef.current.add(q.id);
    setCurrentQuestion(q);
  }, []);

  // ─── Tactic modifiers ──────────────────────────────────────────
  const getTacticModifiers = useCallback(() => {
    if (half === 1 || !tactic) {
      return {
        correctVsWrongGain: 12,
        wrongVsCorrectPenalty: -10,
        speedBonusMultiplier: 1,
        shotMomentumThreshold: 4,
      };
    }
    switch (tactic) {
      case 'press-high':
        return {
          correctVsWrongGain: 12,
          wrongVsCorrectPenalty: -12,
          speedBonusMultiplier: 1.25,
          shotMomentumThreshold: 4,
        };
      case 'play-safe':
        return {
          correctVsWrongGain: 9,
          wrongVsCorrectPenalty: -8,
          speedBonusMultiplier: 1,
          shotMomentumThreshold: 4,
        };
      case 'all-in':
        return {
          correctVsWrongGain: 14,
          wrongVsCorrectPenalty: -14,
          speedBonusMultiplier: 1,
          shotMomentumThreshold: 3,
        };
    }
  }, [half, tactic]);

  // ─── Timer ────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    setTimeRemaining(TIMER_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { stopTimer(); };
  }, [stopTimer]);

  // Auto-expire when timer hits 0
  useEffect(() => {
    if (timeRemaining === 0 && phase === 'playing' && selectedAnswer === null) {
      handleAnswer(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, phase]);

  // ─── Pregame ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'pregame') {
      pickNextQuestion(50);
      const t = setTimeout(() => {
        setPhase('question-reveal');
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [phase, pickNextQuestion]);

  // ─── Question reveal ─────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'question-reveal') return;
    setShowOptions(false);
    const t = setTimeout(() => {
      setShowOptions(true);
      setPhase('playing');
      startTimer();
    }, QUESTION_REVEAL_MS);
    return () => clearTimeout(t);
  }, [phase, startTimer]);

  // ─── Simulate opponent ────────────────────────────────────────
  useEffect(() => {
    if (phase === 'playing') {
      const delay = 2000 + Math.random() * 6000;
      const q = currentQuestion;
      const isCorrect = Math.random() < 0.55;
      const answer = isCorrect ? q.correctIndex : ((q.correctIndex + 1 + Math.floor(Math.random() * 3)) % 4);
      const t = setTimeout(() => {
        setOpponentAnswer(answer);
        setOpponentTime(delay / 1000);
      }, delay);
      return () => clearTimeout(t);
    }
  }, [phase, currentQuestion]);

  // ─── Handle player answer ─────────────────────────────────────
  const handleAnswer = useCallback((index: number) => {
    if (selectedAnswer !== null) return;
    const elapsed = TIMER_SECONDS - timeRemaining;
    setPlayerTime(elapsed);
    setSelectedAnswer(index);
    stopTimer();
    setTimeout(() => setPhase('reveal'), 300);
  }, [selectedAnswer, timeRemaining, stopTimer]);

  // ─── Reveal phase ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'reveal') return;

    const q = currentQuestion;
    const newStates: Array<'default' | 'correct' | 'wrong' | 'disabled'> = q.options.map((_, i) => {
      if (i === q.correctIndex) return 'correct';
      if (i === selectedAnswer && i !== q.correctIndex) return 'wrong';
      return 'disabled';
    });
    setAnswerStates(newStates);

    const playerCorrect = selectedAnswer === q.correctIndex;
    if (playerCorrect) setTotalCorrect(c => c + 1);
    setTotalQuestions(n => n + 1);

    const t = setTimeout(() => setPhase('possession-move'), 2000);
    return () => clearTimeout(t);
  }, [phase, currentQuestion, selectedAnswer]);

  // ─── Possession move phase ────────────────────────────────────
  useEffect(() => {
    if (phase !== 'possession-move') return;

    const q = currentQuestion;
    const playerCorrect = selectedAnswer === q.correctIndex;
    const oppCorrect = opponentAnswer === q.correctIndex;
    const mods = getTacticModifiers();

    const remainingSeconds = TIMER_SECONDS - playerTime;
    const speedBonus = Math.round(calculateSpeedBonus(remainingSeconds) * mods.speedBonusMultiplier);
    const playerFaster = playerTime < opponentTime;
    const playerFast = playerTime <= 3; // "fast" answer for +1 momentum

    let posDelta = 0;
    let momDelta = 0;
    let message = '';
    let direction: 'forward' | 'backward' | 'neutral' = 'neutral';

    if (playerCorrect && !oppCorrect) {
      // Player correct, opponent wrong
      posDelta = mods.correctVsWrongGain + speedBonus;
      momDelta = 2 + (playerFast ? 1 : 0);
      message = `+${posDelta} → ATTACK!`;
      direction = 'forward';
    } else if (!playerCorrect && oppCorrect) {
      // Player wrong, opponent correct
      posDelta = mods.wrongVsCorrectPenalty;
      momDelta = -1;
      message = `${posDelta} → Pushed back`;
      direction = 'backward';
    } else if (playerCorrect && oppCorrect) {
      // Both correct
      if (playerFaster) {
        posDelta = 6 + speedBonus;
        momDelta = 1;
        message = `+${posDelta} → Faster answer!`;
        direction = 'forward';
      } else {
        posDelta = 3;
        momDelta = 0;
        message = '+3 → Correct but slower';
        direction = 'forward';
      }
    } else {
      // Both wrong
      posDelta = -2;
      momDelta = 0;
      message = 'Both wrong → -2';
      direction = 'neutral';
    }

    const newPos = clamp(player.position + posDelta, 0, 100);
    const newMom = clamp(player.momentum + momDelta, 0, 6);

    setPlayer(p => ({ ...p, position: newPos, momentum: newMom }));
    setOpponent(o => ({ ...o, position: 100 - newPos }));
    setFeedMessage(message);
    setFeedDirection(direction);
    setPositionSum(s => s + newPos);
    setPositionSamples(s => s + 1);

    const t = setTimeout(() => {
      setFeedMessage(null);

      // Check for shot opportunity: position >= 75 OR momentum >= threshold
      if (newPos >= 75 || newMom >= mods.shotMomentumThreshold) {
        setPhase('shot');
        return;
      }

      // Check for half/match end
      const nextQInHalf = normalQuestionsInHalf + 1;
      if (nextQInHalf >= QUESTIONS_PER_HALF) {
        if (half === 1) {
          setPhase('halftime');
        } else {
          setPhase('fulltime');
        }
        return;
      }

      // Next question
      advanceToNextQuestion(newPos);
    }, 1500);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ─── Shot phase ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'shot') return;
    const sq = pickQuestion(HARD_QUESTIONS, usedQuestionIdsRef.current);
    usedQuestionIdsRef.current.add(sq.id);
    setShotQuestion(sq);
    setShotSelectedAnswer(null);
    setShotAnswerStates(['default', 'default', 'default', 'default']);
    setShotResult('pending');
    setTotalShots(s => s + 1);
  }, [phase]);

  const handleShotAnswer = useCallback((index: number) => {
    if (shotSelectedAnswer !== null || !shotQuestion) return;
    setShotSelectedAnswer(index);

    const isCorrect = index === shotQuestion.correctIndex;
    const newStates: Array<'default' | 'correct' | 'wrong' | 'disabled'> = shotQuestion.options.map((_, i) => {
      if (i === shotQuestion.correctIndex) return 'correct';
      if (i === index && i !== shotQuestion.correctIndex) return 'wrong';
      return 'disabled';
    });
    setShotAnswerStates(newStates);

    setTimeout(() => {
      if (isCorrect) {
        // GOAL!
        setShotResult('goal');
        setPlayer(p => ({ ...p, goals: p.goals + 1, position: 50, momentum: 0, isShooting: false }));
        setOpponent(o => ({ ...o, position: 50 }));
        setTotalCorrect(c => c + 1);
        setTotalQuestions(n => n + 1);
        setTimeout(() => {
          setPhase('goal');
        }, 500);
      } else {
        // SAVED — rebound
        setShotResult('saved');
        setPlayer(p => ({ ...p, position: 60, momentum: 0, isShooting: false }));
        setOpponent(o => ({ ...o, position: 40 }));
        setTotalQuestions(n => n + 1);
        setTimeout(() => {
          const nextQInHalf = normalQuestionsInHalf + 1;
          if (nextQInHalf >= QUESTIONS_PER_HALF) {
            if (half === 1) {
              setPhase('halftime');
            } else {
              setPhase('fulltime');
            }
          } else {
            advanceToNextQuestion(60);
          }
        }, 2500);
      }
    }, 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shotSelectedAnswer, shotQuestion, normalQuestionsInHalf, half]);

  // ─── Goal phase ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'goal') return;
    const t = setTimeout(() => {
      const nextQInHalf = normalQuestionsInHalf + 1;
      if (nextQInHalf >= QUESTIONS_PER_HALF) {
        if (half === 1) {
          setPhase('halftime');
        } else {
          setPhase('fulltime');
        }
      } else {
        advanceToNextQuestion(50);
      }
    }, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ─── Halftime tactic selection ─────────────────────────────────
  const handleTacticSelected = useCallback((selectedTactic: TacticalCard) => {
    setTactic(selectedTactic);
    // Start 2nd half after a brief delay
    setTimeout(() => {
      setHalf(2);
      setNormalQuestionsInHalf(0);
      setPlayer(p => ({ ...p, position: 50, momentum: 0 }));
      setOpponent(o => ({ ...o, position: 50 }));
      pickNextQuestion(50);
      resetQuestionState();
      setPhase('question-reveal');
    }, 500);
  }, [pickNextQuestion]);

  // ─── Advance helpers ─────────────────────────────────────────
  function advanceToNextQuestion(currentPosition: number) {
    setNormalQuestionsInHalf(q => q + 1);
    pickNextQuestion(currentPosition);
    resetQuestionState();
    setPhase('question-reveal');
  }

  function resetQuestionState() {
    setSelectedAnswer(null);
    setOpponentAnswer(null);
    setAnswerStates(['default', 'default', 'default', 'default']);
    setShowOptions(false);
    setPlayerTime(0);
    setOpponentTime(0);
  }

  // ─── Play again ───────────────────────────────────────────────
  function handlePlayAgain() {
    setHalf(1);
    setNormalQuestionsInHalf(0);
    setPlayer({ position: 50, momentum: 0, goals: 0, isShooting: false });
    setOpponent({ position: 50, momentum: 0, goals: 0, isShooting: false });
    setTactic(null);
    setTotalCorrect(0);
    setTotalQuestions(0);
    setTotalShots(0);
    setPositionSum(0);
    setPositionSamples(0);
    usedQuestionIdsRef.current.clear();
    resetQuestionState();
    setPhase('pregame');
  }

  // ─── Render ───────────────────────────────────────────────────
  const showMainUI = phase === 'question-reveal' || phase === 'playing' || phase === 'reveal' || phase === 'possession-move' || phase === 'goal';

  return (
    <div className="min-h-screen bg-[#0f1420] flex flex-col items-center">
      <div className="w-full max-w-lg flex flex-col">
        {/* Pregame overlay */}
        <AnimatePresence>
          {phase === 'pregame' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="text-center font-fun"
              >
                <div className="text-5xl mb-3">⚽</div>
                <div className="text-4xl font-black text-white uppercase tracking-widest">
                  Kick Off!
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main game UI */}
        {showMainUI && (
          <>
            {/* HUD */}
            <PossessionHUD
              playerGoals={player.goals}
              opponentGoals={opponent.goals}
              playerName="You"
              opponentName="CPU"
              playerAvatarUrl={PLAYER_AVATAR}
              opponentAvatarUrl={OPPONENT_AVATAR}
              timeRemaining={timeRemaining}
              half={half}
              questionInHalf={normalQuestionsInHalf}
              zone={zone}
              zoneColor={zoneColor}
              momentum={player.momentum}
            />

            {/* Pitch */}
            <PitchVisualization
              playerPosition={player.position}
              playerAvatarUrl={PLAYER_AVATAR}
              opponentAvatarUrl={OPPONENT_AVATAR}
            />

            {/* Feed */}
            <PossessionFeed message={feedMessage} direction={feedDirection} />

            {/* Question with slide-in animation */}
            <motion.div
              key={`question-${currentQuestion.id}`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="px-4 mt-2"
            >
              <QuestionArena
                question={currentQuestion.prompt}
                category={currentQuestion.categoryName ?? 'Football'}
                categoryIcon="⚽"
                difficulty={getDifficultyLabel(currentQuestion.difficulty)}
              />
            </motion.div>

            {/* "Get ready..." during question reveal */}
            {phase === 'question-reveal' && (
              <div className="w-full max-w-2xl mx-auto -mt-2 text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-blue-300 font-fun font-bold text-sm"
                >
                  <span className="inline-block animate-pulse">⚡</span> Get ready...
                </motion.div>
              </div>
            )}

            {/* Answer cards */}
            {showOptions && (
              <motion.div
                key={`options-${currentQuestion.id}`}
                className="grid grid-cols-2 gap-3 px-4 mt-4 pb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.2, 0.9, 0.3, 1] }}
              >
                {currentQuestion.options.map((opt, i) => (
                  <motion.div
                    key={`${currentQuestion.id}-${i}`}
                    initial={{ opacity: 0, y: 16, scale: 0.94, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 20,
                      mass: 0.7,
                      delay: i * 0.065,
                      filter: { duration: 0.22 },
                    }}
                  >
                    <AnswerCard
                      label={LABELS[i]}
                      text={opt}
                      index={i}
                      isSelected={selectedAnswer === i}
                      state={answerStates[i]}
                      fadeOut={phase === 'reveal'}
                      opponentPicked={opponentAnswer === i && phase === 'reveal'}
                      opponentPickCorrect={opponentAnswer !== null ? opponentAnswer === currentQuestion.correctIndex : undefined}
                      onClick={() => phase === 'playing' && handleAnswer(i)}
                      disabled={phase !== 'playing'}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        )}

        {/* Shot overlay */}
        <ShotOverlay
          visible={phase === 'shot' || phase === 'goal'}
          question={shotQuestion}
          selectedAnswer={shotSelectedAnswer}
          answerStates={shotAnswerStates}
          result={phase === 'goal' ? 'goal' : shotResult}
          onAnswer={handleShotAnswer}
          disabled={shotSelectedAnswer !== null}
        />

        {/* Halftime */}
        <HalftimeScreen
          visible={phase === 'halftime'}
          playerGoals={player.goals}
          opponentGoals={opponent.goals}
          playerName="You"
          opponentName="CPU"
          playerAvatarUrl={PLAYER_AVATAR}
          opponentAvatarUrl={OPPONENT_AVATAR}
          onSelectTactic={handleTacticSelected}
        />

        {/* Fulltime — Results Screen */}
        <AnimatePresence>
          {phase === 'fulltime' && (
            <FulltimeResultsScreen
              playerGoals={player.goals}
              opponentGoals={opponent.goals}
              playerAvatarUrl={PLAYER_AVATAR}
              opponentAvatarUrl={OPPONENT_AVATAR}
              totalCorrect={totalCorrect}
              totalQuestions={totalQuestions}
              totalShots={totalShots}
              avgPosition={positionSamples > 0 ? Math.round(positionSum / positionSamples) : 50}
              onPlayAgain={handlePlayAgain}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
