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
import { HalftimeScreen } from './components/HalftimeScreen';
import { PossessionFeed } from './components/PossessionFeed';

// ─── Avatar URLs ──────────────────────────────────────────────────
const PLAYER_AVATAR = getDiceBearAvatarUrl(DEFAULT_AVATAR_PRIMARY, 128);
const OPPONENT_AVATAR = getDiceBearAvatarUrl(DEFAULT_AVATAR_SECONDARY, 128);

// ─── Mock Questions ───────────────────────────────────────────────
const QUESTIONS: GameQuestion[] = [
  { id: '1', prompt: 'Which country has won the most FIFA World Cups?', options: ['Germany', 'Brazil', 'Argentina', 'Italy'], correctIndex: 1, categoryName: 'World Cup', difficulty: 'easy' },
  { id: '2', prompt: 'Who holds the record for most goals in a single World Cup tournament?', options: ['Pelé', 'Miroslav Klose', 'Just Fontaine', 'Ronaldo'], correctIndex: 2, categoryName: 'Records', difficulty: 'medium' },
  { id: '3', prompt: 'In which year was the first FIFA World Cup held?', options: ['1928', '1930', '1934', '1926'], correctIndex: 1, categoryName: 'History', difficulty: 'easy' },
  { id: '4', prompt: 'Which club has won the most UEFA Champions League titles?', options: ['AC Milan', 'Barcelona', 'Real Madrid', 'Bayern Munich'], correctIndex: 2, categoryName: 'Champions League', difficulty: 'easy' },
  { id: '5', prompt: 'Who scored the "Hand of God" goal?', options: ['Pelé', 'Diego Maradona', 'Zinedine Zidane', 'Johan Cruyff'], correctIndex: 1, categoryName: 'Iconic Moments', difficulty: 'easy' },
  { id: '6', prompt: 'What is the maximum number of substitutions allowed in a standard FIFA match?', options: ['3', '4', '5', '6'], correctIndex: 2, categoryName: 'Rules', difficulty: 'medium' },
  { id: '7', prompt: 'Which goalkeeper has the most clean sheets in Premier League history?', options: ['David James', 'Petr Čech', 'Edwin van der Sar', 'Peter Schmeichel'], correctIndex: 1, categoryName: 'Premier League', difficulty: 'hard' },
  { id: '8', prompt: 'Which country hosted the 2014 FIFA World Cup?', options: ['South Africa', 'Russia', 'Brazil', 'Germany'], correctIndex: 2, categoryName: 'World Cup', difficulty: 'easy' },
  { id: '9', prompt: 'Who won the first ever Ballon d\'Or?', options: ['Alfredo Di Stéfano', 'Stanley Matthews', 'Raymond Kopa', 'Lev Yashin'], correctIndex: 1, categoryName: 'Awards', difficulty: 'hard' },
  { id: '10', prompt: 'What does VAR stand for?', options: ['Video Analysis Review', 'Video Assistant Referee', 'Visual Aid Replay', 'Video Action Replay'], correctIndex: 1, categoryName: 'Rules', difficulty: 'easy' },
  { id: '11', prompt: 'Which team completed "The Invincibles" season in 2003-04?', options: ['Manchester United', 'Chelsea', 'Arsenal', 'Liverpool'], correctIndex: 2, categoryName: 'Premier League', difficulty: 'medium' },
  { id: '12', prompt: 'How long is a standard football match (excluding extra time)?', options: ['80 minutes', '90 minutes', '100 minutes', '120 minutes'], correctIndex: 1, categoryName: 'Rules', difficulty: 'easy' },
  { id: '13', prompt: 'Which player has scored the most goals in Champions League history?', options: ['Lionel Messi', 'Cristiano Ronaldo', 'Raúl', 'Robert Lewandowski'], correctIndex: 1, categoryName: 'Champions League', difficulty: 'medium' },
  { id: '14', prompt: 'Which African nation was the first to reach a World Cup quarter-final?', options: ['Nigeria', 'Ghana', 'Cameroon', 'Senegal'], correctIndex: 2, categoryName: 'World Cup', difficulty: 'hard' },
  { id: '15', prompt: 'What is the diameter of a regulation football?', options: ['20-22 cm', '22-23 cm', '18-20 cm', '24-26 cm'], correctIndex: 0, categoryName: 'Rules', difficulty: 'hard' },
  { id: '16', prompt: 'Which club is known as "The Red Devils"?', options: ['Liverpool', 'Arsenal', 'Manchester United', 'Bayern Munich'], correctIndex: 2, categoryName: 'Clubs', difficulty: 'easy' },
];

const SHOT_QUESTIONS: GameQuestion[] = [
  { id: 's1', prompt: 'In the 1950 World Cup, which team upset Brazil in the final match (the "Maracanazo")?', options: ['Argentina', 'Uruguay', 'Sweden', 'Spain'], correctIndex: 1, categoryName: 'World Cup', difficulty: 'hard' },
  { id: 's2', prompt: 'Who is the youngest player to score in a World Cup final?', options: ['Pelé', 'Kylian Mbappé', 'Michael Owen', 'Ronaldo'], correctIndex: 0, categoryName: 'Records', difficulty: 'hard' },
  { id: 's3', prompt: 'Which club won six trophies in a single calendar year in 2009?', options: ['Real Madrid', 'Manchester United', 'Barcelona', 'Bayern Munich'], correctIndex: 2, categoryName: 'Clubs', difficulty: 'hard' },
  { id: 's4', prompt: 'How many times has the World Cup final ended 0-0 after 90 minutes?', options: ['Never', 'Once', 'Twice', 'Three times'], correctIndex: 2, categoryName: 'World Cup', difficulty: 'hard' },
];

// ─── Types ────────────────────────────────────────────────────────
type Phase = 'pregame' | 'question-reveal' | 'playing' | 'reveal' | 'possession-move' | 'shot' | 'goal' | 'saved' | 'halftime' | 'fulltime';

const QUESTION_REVEAL_MS = 2000; // show question only for 2s before options appear

interface PossessionState {
  position: number;
  goals: number;
}

// ─── Helpers ──────────────────────────────────────────────────────
function getZone(position: number): { zone: string; color: string } {
  if (position >= 80) return { zone: 'BOX', color: '#FF4B4B' };
  if (position >= 55) return { zone: 'ATT', color: '#FF9600' };
  if (position >= 30) return { zone: 'MID', color: '#FFFFFF' };
  return { zone: 'DEF', color: '#9CA3AF' };
}

function getDifficultyLabel(d?: string): string {
  if (d === 'hard') return 'Hard';
  if (d === 'medium') return 'Medium';
  return 'Easy';
}

const LABELS = ['A', 'B', 'C', 'D'];
const QUESTIONS_PER_HALF = 6;
const TIMER_SECONDS = 10;

// ─── Component ────────────────────────────────────────────────────
export function PossessionMatchDemo() {
  // Match state
  const [half, setHalf] = useState<1 | 2>(1);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionInHalf, setQuestionInHalf] = useState(0);
  const [phase, setPhase] = useState<Phase>('pregame');

  // Possession
  const [player, setPlayer] = useState<PossessionState>({ position: 50, goals: 0 });
  const [opponent, setOpponent] = useState<PossessionState>({ position: 50, goals: 0 });

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
  const shotQuestionIndexRef = useRef(0);

  const currentQuestion = QUESTIONS[questionIndex % QUESTIONS.length];
  const { zone, color: zoneColor } = getZone(player.position);

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

  // ─── Cleanup timer on unmount ──────────────────────────────────
  useEffect(() => {
    return () => { stopTimer(); };
  }, [stopTimer]);

  // ─── Auto-expire when timer hits 0 ────────────────────────────
  useEffect(() => {
    if (timeRemaining === 0 && phase === 'playing' && selectedAnswer === null) {
      // Player ran out of time — treat as wrong
      handleAnswer(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, phase]);

  // ─── Pregame ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'pregame') {
      const t = setTimeout(() => {
        setPhase('question-reveal');
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // ─── Question reveal (show question, then options after delay) ──
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
      const delay = 2000 + Math.random() * 6000; // 2-8s
      const q = QUESTIONS[questionIndex % QUESTIONS.length];
      const isCorrect = Math.random() < 0.55;
      const answer = isCorrect ? q.correctIndex : ((q.correctIndex + 1 + Math.floor(Math.random() * 3)) % 4);
      const t = setTimeout(() => {
        setOpponentAnswer(answer);
        setOpponentTime(delay / 1000);
      }, delay);
      return () => clearTimeout(t);
    }
  }, [phase, questionIndex]);

  // ─── Handle player answer ─────────────────────────────────────
  const handleAnswer = useCallback((index: number) => {
    if (selectedAnswer !== null) return;
    const elapsed = TIMER_SECONDS - timeRemaining;
    setPlayerTime(elapsed);
    setSelectedAnswer(index);
    stopTimer();

    // Wait a tiny beat then go to reveal
    setTimeout(() => setPhase('reveal'), 300);
  }, [selectedAnswer, timeRemaining, stopTimer]);

  // ─── Reveal phase ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'reveal') return;

    const q = QUESTIONS[questionIndex % QUESTIONS.length];
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
  }, [phase, questionIndex, selectedAnswer]);

  // ─── Possession move phase ────────────────────────────────────
  useEffect(() => {
    if (phase !== 'possession-move') return;

    const q = QUESTIONS[questionIndex % QUESTIONS.length];
    const playerCorrect = selectedAnswer === q.correctIndex;
    const oppCorrect = opponentAnswer === q.correctIndex;

    let delta = 0;
    let message = '';
    let direction: 'forward' | 'backward' | 'neutral' = 'neutral';

    if (playerCorrect && !oppCorrect) {
      delta = 20;
      message = '+20 → ATTACK!';
      direction = 'forward';
    } else if (playerCorrect && oppCorrect && playerTime < opponentTime) {
      delta = 10;
      message = '+10 → Faster answer!';
      direction = 'forward';
    } else if (playerCorrect && oppCorrect && playerTime >= opponentTime) {
      delta = 5;
      message = '+5 → Correct but slower';
      direction = 'forward';
    } else if (!playerCorrect && !oppCorrect) {
      delta = 0;
      message = 'Both wrong — no change';
      direction = 'neutral';
    } else if (!playerCorrect && oppCorrect) {
      delta = -10;
      message = '-10 → Pushed back';
      direction = 'backward';
    }

    const newPos = Math.max(0, Math.min(100, player.position + delta));
    setPlayer(p => ({ ...p, position: newPos }));
    setOpponent(o => ({ ...o, position: 100 - newPos }));
    setFeedMessage(message);
    setFeedDirection(direction);
    setPositionSum(s => s + newPos);
    setPositionSamples(s => s + 1);

    const t = setTimeout(() => {
      setFeedMessage(null);

      // Check for shot opportunity
      if (newPos >= 80) {
        setPhase('shot');
        return;
      }

      // Check for half/match end
      const nextQInHalf = questionInHalf + 1;
      if (nextQInHalf >= QUESTIONS_PER_HALF) {
        if (half === 1) {
          setPhase('halftime');
        } else {
          setPhase('fulltime');
        }
        return;
      }

      // Next question
      advanceToNextQuestion();
    }, 1500);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ─── Shot phase ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'shot') return;
    const sq = SHOT_QUESTIONS[shotQuestionIndexRef.current % SHOT_QUESTIONS.length];
    shotQuestionIndexRef.current++;
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
        setShotResult('goal');
        setPlayer(p => ({ ...p, goals: p.goals + 1, position: 50 }));
        setOpponent(o => ({ ...o, position: 50 }));
        setTotalCorrect(c => c + 1);
        setTotalQuestions(n => n + 1);
        setTimeout(() => {
          setPhase('goal');
        }, 500);
      } else {
        setShotResult('saved');
        setPlayer(p => ({ ...p, position: 65 }));
        setOpponent(o => ({ ...o, position: 35 }));
        setTotalQuestions(n => n + 1);
        setTimeout(() => {
          // Continue match after save
          const nextQInHalf = questionInHalf + 1;
          if (nextQInHalf >= QUESTIONS_PER_HALF) {
            if (half === 1) {
              setPhase('halftime');
            } else {
              setPhase('fulltime');
            }
          } else {
            advanceToNextQuestion();
          }
        }, 2500);
      }
    }, 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shotSelectedAnswer, shotQuestion, questionInHalf, half]);

  // ─── Goal phase ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'goal') return;
    const t = setTimeout(() => {
      const nextQInHalf = questionInHalf + 1;
      if (nextQInHalf >= QUESTIONS_PER_HALF) {
        if (half === 1) {
          setPhase('halftime');
        } else {
          setPhase('fulltime');
        }
      } else {
        advanceToNextQuestion();
      }
    }, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ─── Halftime phase ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'halftime') return;
    const t = setTimeout(() => {
      setHalf(2);
      setQuestionInHalf(0);
      setPlayer(p => ({ ...p, position: 50 }));
      setOpponent(o => ({ ...o, position: 50 }));
      resetQuestionState();
      setPhase('question-reveal');
    }, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ─── Advance helpers ─────────────────────────────────────────
  function advanceToNextQuestion() {
    setQuestionIndex(i => i + 1);
    setQuestionInHalf(q => q + 1);
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
    setQuestionIndex(0);
    setQuestionInHalf(0);
    setPlayer({ position: 50, goals: 0 });
    setOpponent({ position: 50, goals: 0 });
    setTotalCorrect(0);
    setTotalQuestions(0);
    setTotalShots(0);
    setPositionSum(0);
    setPositionSamples(0);
    resetQuestionState();
    shotQuestionIndexRef.current = 0;
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
              questionInHalf={questionInHalf}
              zone={zone}
              zoneColor={zoneColor}
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
              key={`question-${questionIndex}`}
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

            {/* Answer cards — staggered entrance like real game */}
            {showOptions && (
              <motion.div
                key={`options-${questionIndex}`}
                className="grid grid-cols-2 gap-3 px-4 mt-4 pb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.2, 0.9, 0.3, 1] }}
              >
                {currentQuestion.options.map((opt, i) => (
                  <motion.div
                    key={`${questionIndex}-${i}`}
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

        {/* Halftime / Fulltime */}
        <HalftimeScreen
          visible={phase === 'halftime' || phase === 'fulltime'}
          type={phase === 'halftime' ? 'halftime' : 'fulltime'}
          playerGoals={player.goals}
          opponentGoals={opponent.goals}
          playerName="You"
          opponentName="CPU"
          playerAvatarUrl={PLAYER_AVATAR}
          opponentAvatarUrl={OPPONENT_AVATAR}
          stats={{
            avgPosition: positionSamples > 0 ? positionSum / positionSamples : 50,
            shotsOnGoal: totalShots,
            correctAnswers: totalCorrect,
            totalQuestions: totalQuestions,
          }}
          onPlayAgain={handlePlayAgain}
        />
      </div>
    </div>
  );
}
