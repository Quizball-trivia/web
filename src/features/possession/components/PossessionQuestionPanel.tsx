'use client';

import { motion, AnimatePresence } from 'motion/react';
import { QuestionArena } from '@/features/game/components/QuestionArena';
import { AnswerCard } from '@/features/game/components/AnswerCard';
import { ArenaScoreSplash } from '@/features/game/components/ArenaScoreSplash';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type { AnswerStateArray, Phase } from '../types/possession.types';
import { ANSWER_LABELS } from '../types/possession.types';
import { getDifficultyLabel } from '../data/mockQuestions';

interface PossessionQuestionPanelProps {
  phase: Phase;
  isPenaltyPhase: boolean;
  isShotPhase: boolean;

  // Question data (resolved by caller for the active mode)
  question: GameQuestion | null;
  showOptions: boolean;
  selectedAnswer: number | null;
  answerStates: AnswerStateArray;
  opponentAnswer: number | null;
  opponentAvatarUrl?: string;

  // Splashes
  showPlayerSplash: boolean;
  showOpponentSplash: boolean;
  playerSplashPoints: number;
  opponentSplashPoints: number;
  onPlayerSplashComplete: () => void;
  onOpponentSplashComplete: () => void;

  // Handlers
  onAnswer: (index: number) => void;
}

export function PossessionQuestionPanel({
  phase,
  isPenaltyPhase,
  isShotPhase,
  question,
  showOptions,
  selectedAnswer,
  answerStates,
  opponentAnswer,
  opponentAvatarUrl,
  showPlayerSplash,
  showOpponentSplash,
  playerSplashPoints,
  opponentSplashPoints,
  onPlayerSplashComplete,
  onOpponentSplashComplete,
  onAnswer,
}: PossessionQuestionPanelProps) {
  if (phase === 'goal') return null;
  if (!question) return null;

  const categoryLabel = isPenaltyPhase ? 'Penalty' : isShotPhase ? 'Shot on Goal' : 'Football';

  const isReveal = isPenaltyPhase
    ? phase === 'penalty-reveal' || phase === 'penalty-result'
    : isShotPhase
      ? phase === 'shot-result'
      : phase === 'reveal';

  const isPlaying = isPenaltyPhase
    ? phase === 'penalty-playing'
    : isShotPhase
      ? phase === 'shot' && selectedAnswer === null
      : phase === 'playing';

  return (
    <>
      {/* Question card — AnimatePresence for smooth cross-fade between questions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`question-${question.id}`}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="px-4 mt-2"
        >
          <QuestionArena
            question={question.prompt}
            category={question.categoryName ?? categoryLabel}
            categoryIcon="⚽"
            difficulty={getDifficultyLabel(question.difficulty)}
          />
        </motion.div>
      </AnimatePresence>



      {/* Arena score splashes */}
      <div className="relative h-0">
        <ArenaScoreSplash
          show={showPlayerSplash}
          points={playerSplashPoints}
          side="left"
          onComplete={onPlayerSplashComplete}
        />
        <ArenaScoreSplash
          show={showOpponentSplash}
          points={opponentSplashPoints}
          side="right"
          onComplete={onOpponentSplashComplete}
        />
      </div>

      {/* Answer cards */}
      <motion.div
        key={`options-${question.id}`}
        className={`grid grid-cols-2 gap-3 px-4 mt-4 pb-6 min-h-[15rem] ${
          showOptions ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        initial={false}
        animate={{ opacity: showOptions ? 1 : 0, y: showOptions ? 0 : 8 }}
        transition={{ duration: 0.25 }}
        aria-hidden={!showOptions}
      >
        {question.options.map((opt, i) => (
          <motion.div
            key={`${question.id}-${i}`}
            initial={false}
            animate={{
              opacity: showOptions ? 1 : 0.9,
              y: showOptions ? 0 : 6,
              scale: showOptions ? 1 : 0.98,
            }}
            transition={{
              type: 'spring',
              stiffness: 320,
              damping: 24,
              mass: 0.75,
              delay: showOptions ? i * 0.05 : 0,
            }}
          >
            <AnswerCard
              label={ANSWER_LABELS[i]}
              text={opt}
              index={i}
              isSelected={selectedAnswer === i}
              state={answerStates[i]}
              fadeOut={isReveal}
              opponentPicked={!isPenaltyPhase && opponentAnswer === i}
              opponentPickCorrect={!isPenaltyPhase && opponentAnswer !== null ? opponentAnswer === question.correctIndex : undefined}
              opponentAvatarUrl={opponentAvatarUrl}
              onClick={() => {
                if (!showOptions || !isPlaying) return;
                onAnswer(i);
              }}
              disabled={!showOptions || !isPlaying}
            />
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}
