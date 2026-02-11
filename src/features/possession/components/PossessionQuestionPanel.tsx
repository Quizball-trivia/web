'use client';

import { motion } from 'motion/react';
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

  // For shot questions, there's no dedicated 'shot-reveal' phase — all four
  // answerStates flip from 'default' simultaneously, so checking [0] is enough
  // to detect reveal. For normal/penalty phases we use explicit phase names.
  const isReveal = isPenaltyPhase
    ? phase === 'penalty-reveal' || phase === 'penalty-result'
    : isShotPhase
      ? answerStates[0] !== 'default'
      : phase === 'reveal';

  const isPlaying = isPenaltyPhase
    ? phase === 'penalty-playing'
    : isShotPhase
      ? phase === 'shot' && selectedAnswer === null
      : phase === 'playing';

  return (
    <>
      {/* Question card */}
      <motion.div
        key={`question-${question.id}`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="px-4 mt-2"
      >
        <QuestionArena
          question={question.prompt}
          category={question.categoryName ?? categoryLabel}
          categoryIcon="⚽"
          difficulty={getDifficultyLabel(question.difficulty)}
        />
      </motion.div>

      {/* "Get ready..." text */}
      {(phase === 'question-reveal' || phase === 'penalty-question') && (
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
      {showOptions && (
        <motion.div
          key={`options-${question.id}`}
          className="grid grid-cols-2 gap-3 px-4 mt-4 pb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.2, 0.9, 0.3, 1] }}
        >
          {question.options.map((opt, i) => (
            <motion.div
              key={`${question.id}-${i}`}
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
                label={ANSWER_LABELS[i]}
                text={opt}
                index={i}
                isSelected={selectedAnswer === i}
                state={answerStates[i]}
                fadeOut={isReveal}
                opponentPicked={!isPenaltyPhase && opponentAnswer === i && phase === 'reveal'}
                opponentPickCorrect={!isPenaltyPhase && opponentAnswer !== null ? opponentAnswer === question.correctIndex : undefined}
                onClick={() => {
                  if (!isPlaying) return;
                  onAnswer(i);
                }}
                disabled={!isPlaying}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </>
  );
}
