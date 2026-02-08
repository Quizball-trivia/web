'use client';

import { motion, AnimatePresence } from 'motion/react';
import { QuestionArena } from '@/features/game/components/QuestionArena';
import { AnswerCard } from '@/features/game/components/AnswerCard';
import type { GameQuestion } from '@/lib/domain/gameQuestion';

type ShotResult = 'pending' | 'goal' | 'saved';

interface ShotOverlayProps {
  visible: boolean;
  question: GameQuestion | null;
  selectedAnswer: number | null;
  answerStates: Array<'default' | 'correct' | 'wrong' | 'disabled'>;
  result: ShotResult;
  onAnswer: (index: number) => void;
  disabled: boolean;
}

const LABELS = ['A', 'B', 'C', 'D'];

export function ShotOverlay({
  visible,
  question,
  selectedAnswer,
  answerStates,
  result,
  onAnswer,
  disabled,
}: ShotOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 px-4"
        >
          {result === 'pending' && question && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-full max-w-lg flex flex-col items-center gap-6"
            >
              {/* Shot banner */}
              <div className="text-center">
                <div className="text-4xl font-black text-white font-fun uppercase tracking-wider">
                  Shot on Goal!
                </div>
                <div className="text-white/50 text-sm font-fun mt-1">
                  Answer correctly to score!
                </div>
              </div>

              {/* Question */}
              <QuestionArena
                question={question.prompt}
                category={question.categoryName ?? 'Football'}
                categoryIcon="⚽"
                difficulty="Hard"
              />

              {/* Answers */}
              <div className="grid grid-cols-2 gap-3 w-full">
                {question.options.map((opt, i) => (
                  <AnswerCard
                    key={i}
                    label={LABELS[i]}
                    text={opt}
                    index={i}
                    isSelected={selectedAnswer === i}
                    state={answerStates[i]}
                    onClick={() => onAnswer(i)}
                    disabled={disabled}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {result === 'goal' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-center"
            >
              <div className="text-6xl mb-4">⚽</div>
              <div className="text-5xl font-black text-emerald-400 font-fun uppercase tracking-widest">
                GOAAAL!
              </div>
              <div className="text-white/60 font-fun mt-2 text-lg">
                The ball hits the back of the net!
              </div>
            </motion.div>
          )}

          {result === 'saved' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-center"
            >
              <div className="text-6xl mb-4">🧤</div>
              <div className="text-4xl font-black text-red-400 font-fun uppercase tracking-widest">
                SAVED!
              </div>
              <div className="text-white/60 font-fun mt-2 text-lg">
                Great save! Pushed back to midfield.
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
