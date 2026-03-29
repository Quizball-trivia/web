'use client';

import { AnimatePresence, motion } from 'motion/react';

import { AnswerCard } from '@/features/game/components/AnswerCard';
import { ArenaScoreSplash } from '@/features/game/components/ArenaScoreSplash';
import { QuestionArena } from '@/features/game/components/QuestionArena';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type { AnswerStateArray, Phase } from '@/lib/types/game.types';
import { ANSWER_LABELS } from '@/lib/types/game.types';

function getDifficultyLabel(difficulty?: string): string {
  const normalizedDifficulty = difficulty?.trim().toLowerCase();

  if (normalizedDifficulty === 'hard') return 'Hard';
  if (normalizedDifficulty === 'medium') return 'Medium';
  return 'Easy';
}

export interface PartyQuestionPanelProps {
  phase: Phase;
  question: GameQuestion | null;
  showOptions: boolean;
  selectedAnswer: number | null;
  answerStates: AnswerStateArray;
  showPlayerSplash: boolean;
  playerSplashPoints: number;
  onPlayerSplashComplete: () => void;
  onAnswer: (index: number) => void;
}

export function PartyQuestionPanel({
  phase,
  question,
  showOptions,
  selectedAnswer,
  answerStates,
  showPlayerSplash,
  playerSplashPoints,
  onPlayerSplashComplete,
  onAnswer,
}: PartyQuestionPanelProps) {
  if (!question) return null;

  const isPlaying = phase === 'playing';

  return (
    <div className="relative rounded-[28px] border border-white/10 bg-[#131F24]/88 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur sm:p-5">
      {/* Score splash — overlays entire panel */}
      <ArenaScoreSplash
        show={showPlayerSplash}
        points={playerSplashPoints}
        side="left"
        onComplete={onPlayerSplashComplete}
      />

      {/* Question */}
      <div className="relative">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`party-question-${question.id}`}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <QuestionArena
              question={question.prompt}
              category={question.categoryName ?? 'Football'}
              categoryIcon="⚽"
              difficulty={getDifficultyLabel(question.difficulty)}
            />
          </motion.div>
        </AnimatePresence>

        {/* Answer cards */}
        <motion.div
          key={`party-options-${question.id}`}
          className={`mt-4 grid min-h-[15rem] grid-cols-1 gap-3 sm:grid-cols-2 ${
            showOptions ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
          initial={false}
          animate={{ opacity: showOptions ? 1 : 0, y: showOptions ? 0 : 8 }}
          transition={{ duration: 0.25 }}
          aria-hidden={!showOptions}
        >
          {question.options.map((option, index) => (
            <motion.div
              key={`${question.id}-${index}`}
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
                delay: showOptions ? index * 0.05 : 0,
              }}
            >
              <AnswerCard
                label={ANSWER_LABELS[index]}
                text={option}
                index={index}
                isSelected={selectedAnswer === index}
                state={answerStates[index]}
                onClick={() => {
                  if (!showOptions || !isPlaying) return;
                  onAnswer(index);
                }}
                disabled={!showOptions || !isPlaying}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
