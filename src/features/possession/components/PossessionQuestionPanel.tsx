'use client';

import { motion, AnimatePresence } from 'motion/react';
import { QuestionArena } from '@/features/game/components/QuestionArena';
import { AnswerCard } from '@/features/game/components/AnswerCard';
import { ArenaScoreSplash } from '@/features/game/components/ArenaScoreSplash';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type { AnswerStateArray, Phase } from '../types/possession.types';
import { ANSWER_LABELS } from '../types/possession.types';
function getDifficultyLabel(d?: string): string {
  if (d === 'hard') return 'Hard';
  if (d === 'medium') return 'Medium';
  return 'Easy';
}

interface PossessionQuestionPanelProps {
  phase: Phase;
  isPenaltyPhase: boolean;
  isShotPhase: boolean;
  isLastAttackPhase: boolean;

  // Question data (resolved by caller for the active mode)
  question: GameQuestion | null;
  showOptions: boolean;
  selectedAnswer: number | null;
  answerStates: AnswerStateArray;
  eliminatedIndices?: number[];
  opponentAnswer: number | null;
  opponentAvatarUrl?: string;
  chanceCardCount?: number;
  chanceCardPending?: boolean;
  chanceCardPendingSync?: boolean;
  onUseChanceCard?: () => void;

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
  isLastAttackPhase,
  question,
  showOptions,
  selectedAnswer,
  answerStates,
  eliminatedIndices = [],
  opponentAnswer,
  opponentAvatarUrl,
  chanceCardCount = 0,
  chanceCardPending = false,
  chanceCardPendingSync = false,
  onUseChanceCard,
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

  const categoryLabel = isPenaltyPhase
    ? 'Penalty'
    : isShotPhase
      ? 'Shot on Goal'
      : isLastAttackPhase
        ? 'Last Attack'
        : 'Football';

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
  const canUseChanceCard =
    !isPenaltyPhase &&
    !isShotPhase &&
    isPlaying &&
    chanceCardCount > 0 &&
    !chanceCardPending &&
    typeof onUseChanceCard === 'function';

  return (
    <>
      {/* Question card — popLayout pops exiting question out of flow to prevent height doubling */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={`question-${question.id}`}
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
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
        className={`grid grid-cols-2 gap-3 px-4 mt-4 min-h-[15rem] ${
          showOptions ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        initial={false}
        animate={{ opacity: showOptions ? 1 : 0, y: showOptions ? 0 : 8 }}
        transition={{ duration: 0.25 }}
        aria-hidden={!showOptions}
      >
        {question.options.map((opt, i) => {
          const isEliminated = eliminatedIndices.includes(i) && selectedAnswer !== i;
          const cardState = isEliminated && answerStates[i] === 'default'
            ? 'disabled'
            : answerStates[i];
          return (
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
              state={cardState}
              fadeOut={false}
              opponentPicked={!isPenaltyPhase && opponentAnswer === i}
              opponentPickCorrect={!isPenaltyPhase && opponentAnswer !== null ? opponentAnswer === question.correctIndex : undefined}
              opponentAvatarUrl={opponentAvatarUrl}
              onClick={() => {
                if (!showOptions || !isPlaying) return;
                if (isEliminated) return;
                onAnswer(i);
              }}
              disabled={!showOptions || !isPlaying || isEliminated}
            />
          </motion.div>
          );
        })}
      </motion.div>

      {/* Power-ups bar — below answers */}
      {!isPenaltyPhase && !isShotPhase && (
        <motion.div
          initial={false}
          animate={{ opacity: showOptions ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="px-4 mt-3 pb-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold font-fun uppercase tracking-[0.18em] text-[#56707A]">
              Power Ups
            </span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onUseChanceCard}
              disabled={!canUseChanceCard}
              className={`flex items-center gap-2.5 rounded-xl border-2 border-b-4 px-4 py-2.5 transition-colors ${
                canUseChanceCard
                  ? 'bg-[#1B2F36] border-[#FF9600] border-b-[#CC7800] text-white hover:bg-[#1B2F36]/80 active:border-b-2 active:translate-y-[2px]'
                  : 'bg-[#1B2F36]/50 border-white/10 border-b-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              <span className="text-lg font-black font-fun tracking-tight">50/50</span>
              <span className={`text-xs font-bold font-fun tabular-nums ${canUseChanceCard ? 'text-[#FF9600]' : 'text-white/30'}`}>
                {chanceCardPending
                  ? 'Applying...'
                  : chanceCardPendingSync
                    ? 'Syncing...'
                    : `×${chanceCardCount}`}
              </span>
            </button>
          </div>
        </motion.div>
      )}
    </>
  );
}
