'use client';

import { motion, AnimatePresence } from 'motion/react';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type { AnswerStateArray, Phase } from '../types/possession.types';
import { ArenaScoreSplash } from '@/components/game/ArenaScoreSplash';

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

interface PossessionQuestionPanelProps {
  phase: Phase;
  isPenaltyPhase: boolean;
  isShotPhase: boolean;
  isLastAttackPhase: boolean;

  question: GameQuestion | null;
  qIndex: number;
  totalQuestions: number;
  timeRemaining: number | null;

  showOptions: boolean;
  selectedAnswer: number | null;
  answerStates: AnswerStateArray;
  eliminatedIndices?: number[];
  opponentAnswer: number | null;

  chanceCardCount?: number;
  chanceCardPending?: boolean;
  chanceCardPendingSync?: boolean;
  onUseChanceCard?: () => void;

  showPlayerSplash?: boolean;
  showOpponentSplash?: boolean;
  playerSplashPoints?: number | null;
  opponentSplashPoints?: number | null;
  playerSplashVariant?: 'pending' | 'points';
  opponentSplashVariant?: 'pending' | 'points';
  onPlayerSplashComplete?: () => void;
  onOpponentSplashComplete?: () => void;

  onAnswer: (index: number) => void;
}

function getButtonState(
  index: number,
  selectedAnswer: number | null,
  answerStates: AnswerStateArray,
  eliminatedIndices: number[],
  correctIndex: number | undefined,
  showOptions: boolean,
): 'default' | 'selected-correct' | 'selected-wrong' | 'reveal-correct' | 'eliminated' {
  if (eliminatedIndices.includes(index) && selectedAnswer !== index) return 'eliminated';

  const state = answerStates[index];
  if (state === 'correct') return 'selected-correct';
  if (state === 'wrong') return 'selected-wrong';

  // After round resolves, reveal the correct answer (even if not selected by player)
  if (!showOptions && correctIndex === index) return 'reveal-correct';

  return 'default';
}

export function PossessionQuestionPanel({
  phase,
  isPenaltyPhase,
  isShotPhase,
  question,
  qIndex,
  totalQuestions,
  timeRemaining,
  showOptions,
  selectedAnswer,
  answerStates,
  eliminatedIndices = [],
  opponentAnswer,
  showPlayerSplash = false,
  showOpponentSplash = false,
  playerSplashPoints = null,
  opponentSplashPoints = null,
  playerSplashVariant = 'points',
  opponentSplashVariant = 'points',
  onPlayerSplashComplete,
  onOpponentSplashComplete,
  onAnswer,
}: PossessionQuestionPanelProps) {
  if (phase === 'goal') return null;
  if (!question) return null;

  const isPlaying = isPenaltyPhase
    ? phase === 'penalty-playing'
    : isShotPhase
      ? phase === 'shot' && selectedAnswer === null
      : phase === 'playing';

  const correctIndex = question.correctIndex;
  const displayQuestionNum = qIndex + 1;
  const displayTimer = timeRemaining ?? 0;
  const timerLabel = displayTimer >= 10 ? `${displayTimer}` : `0${displayTimer}`;

  return (
    <div className="px-4 mt-2">
      {/* Header pills: QUESTION X/Y + timer */}
      <div className="flex items-stretch gap-3">
        <div
          className="flex flex-1 items-center justify-center rounded-[20px] bg-[#1645FF] px-6 text-white h-[52px] sm:h-[68px] md:h-[80px] lg:h-[92px]"
          style={{ ...poppins, fontSize: 'clamp(18px, 3vw, 36px)' }}
        >
          QUESTION {displayQuestionNum}/{totalQuestions}
        </div>
        <div
          className="flex w-[80px] items-center justify-center rounded-[20px] bg-[#1645FF] text-white h-[52px] sm:h-[68px] sm:w-[120px] md:h-[80px] md:w-[150px] lg:h-[92px] lg:w-[175px] tabular-nums"
          style={{ ...poppins, fontSize: 'clamp(18px, 3vw, 36px)' }}
        >
          {timerLabel}
        </div>
      </div>

      {/* Question card — popLayout pops exiting question out of flow to prevent height doubling */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={`question-${question.id}`}
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="relative mt-3"
        >
          <div
            className="flex items-center rounded-[30px] bg-[#071013] px-6 py-6 text-white sm:px-8 sm:py-8 md:px-10 md:py-10"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(18px, 2.4vw, 36px)',
              minHeight: 'clamp(140px, 20vw, 232px)',
            }}
          >
            <p className="leading-snug">{question.prompt}</p>
          </div>

          {/* +points floating splash — player on left, opponent on right */}
          <div className="pointer-events-none absolute left-[-12px] top-1/2 z-10 -translate-y-1/2">
            <ArenaScoreSplash
              show={showPlayerSplash}
              points={playerSplashPoints}
              variant={playerSplashVariant}
              side="left"
              onComplete={onPlayerSplashComplete}
            />
          </div>
          <div className="pointer-events-none absolute right-[-12px] top-1/2 z-10 -translate-y-1/2">
            <ArenaScoreSplash
              show={showOpponentSplash}
              points={opponentSplashPoints}
              variant={opponentSplashVariant}
              side="right"
              onComplete={onOpponentSplashComplete}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Answer cards — 2x2 grid */}
      <motion.div
        key={`options-${question.id}`}
        className={`mt-3 grid grid-cols-2 gap-3 ${
          showOptions ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        initial={false}
        animate={{ opacity: showOptions ? 1 : 0.95, y: showOptions ? 0 : 4 }}
        transition={{ duration: 0.25 }}
        aria-hidden={!showOptions}
      >
        {question.options.map((opt, i) => {
          const buttonState = getButtonState(i, selectedAnswer, answerStates, eliminatedIndices, correctIndex, showOptions);
          const isEliminated = buttonState === 'eliminated';
          const isWinningAnswer = buttonState === 'selected-correct' || buttonState === 'reveal-correct';
          const isWrongPick = buttonState === 'selected-wrong';

          const isPlayerPicked = selectedAnswer === i;
          const opponentPickedThis = !isPenaltyPhase && opponentAnswer === i;
          const opponentPickCorrect = opponentAnswer !== null && correctIndex !== undefined
            ? opponentAnswer === correctIndex
            : null;

          return (
            <motion.button
              key={`${question.id}-${i}`}
              type="button"
              disabled={!showOptions || !isPlaying || isEliminated}
              onClick={() => {
                if (!showOptions || !isPlaying || isEliminated) return;
                onAnswer(i);
              }}
              initial={false}
              animate={{
                opacity: isEliminated ? 0.3 : 1,
                scale: 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 24,
                mass: 0.75,
                delay: showOptions ? i * 0.04 : 0,
              }}
              className="relative flex items-center justify-center overflow-hidden rounded-[20px] px-4 transition-shadow duration-150 h-[80px] sm:h-[100px] md:h-[120px] lg:h-[148px]"
              style={{
                ...poppins,
                fontSize: 'clamp(16px, 2.2vw, 36px)',
                textTransform: 'uppercase',
                color: isWrongPick ? '#FB3101' : '#FFFFFF',
                backgroundColor: isWinningAnswer ? '#38B60E' : 'transparent',
                border: isWinningAnswer
                  ? 'none'
                  : isWrongPick
                    ? '2px solid #FB3101'
                    : '2px solid #FFE500',
                boxShadow: isWinningAnswer
                  ? '0 1.76px 6.334px 1.32px rgba(56,182,14,0.25)'
                  : isWrongPick
                    ? '0 1.76px 6.334px 1.32px rgba(251,49,1,0.25)'
                    : '0 0 6.334px 1.32px rgba(255,229,0,0.25)',
                cursor: !showOptions || !isPlaying || isEliminated ? 'default' : 'pointer',
              }}
            >
              {/* Player's pick notch (left) */}
              {isPlayerPicked && (
                <motion.div
                  initial={{ x: -14, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className="absolute left-0 top-1/2 h-12 w-[6px] -translate-y-1/2 rounded-r-md"
                  style={{ backgroundColor: '#FFFFFF' }}
                />
              )}
              {/* Opponent's pick notch (right) */}
              {opponentPickedThis && opponentPickCorrect !== null && (
                <motion.div
                  initial={{ x: 14, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className="absolute right-0 top-1/2 h-12 w-[6px] -translate-y-1/2 rounded-l-md"
                  style={{ backgroundColor: opponentPickCorrect ? '#38B60E' : '#FB3101' }}
                />
              )}

              <span className="text-center leading-tight">{opt}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
