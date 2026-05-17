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
  opponentAnswer: number | null;

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
  correctIndex: number | undefined,
  showOptions: boolean,
): 'default' | 'selected-correct' | 'selected-wrong' | 'reveal-correct' {
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
    <div className="px-3 mt-1.5">
      {/* Header pills: QUESTION X/Y + timer */}
      <div className="flex items-stretch gap-2.5">
        <div
          className="flex flex-1 items-center justify-center rounded-[16px] bg-brand-blue px-5 text-white h-[40px] sm:h-[52px] md:h-[62px] lg:h-[72px]"
          style={{ ...poppins, fontSize: 'clamp(14px, 2.2vw, 26px)' }}
        >
          QUESTION {displayQuestionNum}/{totalQuestions}
        </div>
        <div
          className="flex w-[64px] items-center justify-center rounded-[16px] bg-brand-blue text-white h-[40px] sm:h-[52px] sm:w-[92px] md:h-[62px] md:w-[116px] lg:h-[72px] lg:w-[136px] tabular-nums"
          style={{ ...poppins, fontSize: 'clamp(14px, 2.2vw, 26px)' }}
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
            className="flex items-center rounded-[24px] bg-surface-page px-5 py-5 text-white sm:px-6 sm:py-6 md:px-8 md:py-7"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(15px, 1.9vw, 26px)',
              minHeight: 'clamp(108px, 15vw, 176px)',
            }}
          >
            <p className="leading-snug">{question.prompt}</p>
          </div>

          {/* +points floating splash — player on left, opponent on right.
              The data-splash-anchor attribute lets `usePossessionBarBattleFlights`
              measure these exact screen positions so a `+N` flight ghost can
              launch from here onto the pitch.
              The min-size is critical: when `ArenaScoreSplash` is hidden
              (e.g. before the player has answered) the wrapper would collapse
              to 0×0 and `findVisibleRect` would reject it — silently breaking
              the flight in production matches. A 1×1 anchor keeps the flight
              launch position findable without affecting layout. */}
          <div
            data-splash-anchor="player"
            className="pointer-events-none absolute left-[-12px] top-1/2 z-10 -translate-y-1/2"
            style={{ minWidth: 1, minHeight: 1 }}
          >
            <ArenaScoreSplash
              show={showPlayerSplash}
              points={playerSplashPoints}
              variant={playerSplashVariant}
              side="left"
              onComplete={onPlayerSplashComplete}
            />
          </div>
          <div
            data-splash-anchor="opponent"
            className="pointer-events-none absolute right-[-12px] top-1/2 z-10 -translate-y-1/2"
            style={{ minWidth: 1, minHeight: 1 }}
          >
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
        className={`mt-2.5 grid grid-cols-2 gap-2.5 ${
          showOptions ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        initial={false}
        animate={{ opacity: showOptions ? 1 : 0.95, y: showOptions ? 0 : 4 }}
        transition={{ duration: 0.25 }}
        aria-hidden={!showOptions}
      >
        {question.options.map((opt, i) => {
          const buttonState = getButtonState(i, selectedAnswer, answerStates, correctIndex, showOptions);
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
              disabled={!showOptions || !isPlaying}
              onClick={() => {
                if (!showOptions || !isPlaying) return;
                onAnswer(i);
              }}
              initial={false}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 24,
                mass: 0.75,
                delay: showOptions ? i * 0.04 : 0,
              }}
              className="relative flex items-center justify-center overflow-hidden rounded-[16px] px-3 transition-shadow duration-150 h-[60px] sm:h-[78px] md:h-[94px] lg:h-[116px]"
              style={{
                ...poppins,
                fontSize: 'clamp(13px, 1.7vw, 26px)',
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
                cursor: !showOptions || !isPlaying ? 'default' : 'pointer',
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
