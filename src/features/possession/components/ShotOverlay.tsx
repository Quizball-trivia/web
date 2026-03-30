'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QuestionArena } from '@/components/game/QuestionArena';
import { AnswerCard } from '@/components/game/AnswerCard';
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
const CONFETTI_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#1CB0F6'] as const;

function seededUnit(seed: number): number {
  const x = Math.sin(seed * 9999.77) * 10000;
  return x - Math.floor(x);
}

export function ShotOverlay({
  visible,
  question,
  selectedAnswer,
  answerStates,
  result,
  onAnswer,
  disabled,
}: ShotOverlayProps) {
  // Precompute stable confetti properties to avoid jumps on re-render
  const confetti = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => ({
        angle: (i / 12) * 360,
        rad: ((i / 12) * 360 * Math.PI) / 180,
        dist: 80 + seededUnit(i + 11) * 60,
        rotate: seededUnit(i + 97) * 720,
        colorIndex: i % CONFETTI_COLORS.length,
      })),
    []
  );

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
            <div className="text-center relative">
              {/* Radiating rings */}
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.3, opacity: 0.8 }}
                  animate={{ scale: 3, opacity: 0 }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.3,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div className="size-20 rounded-full border-2 border-emerald-400/40" />
                </motion.div>
              ))}

              {/* Confetti particles */}
              {confetti.map((item, i) => (
                <motion.div
                  key={`confetti-${i}`}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos(item.rad) * item.dist,
                    y: Math.sin(item.rad) * item.dist - 30,
                    opacity: 0,
                    scale: 0.3,
                    rotate: item.rotate,
                  }}
                  transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
                  className="absolute left-1/2 top-1/2 -ml-1.5 -mt-1.5"
                >
                  <div
                    className="size-3 rounded-sm"
                    style={{
                      backgroundColor: CONFETTI_COLORS[item.colorIndex],
                    }}
                  />
                </motion.div>
              ))}

              {/* Main content */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.4, 1] }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="text-7xl mb-4"
                >
                  ⚽
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 12 }}
              >
                <div className="text-5xl font-black text-emerald-400 font-fun uppercase tracking-widest">
                  GOAAAL!
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-white/60 font-fun mt-2 text-lg"
                >
                  The ball hits the back of the net!
                </motion.div>
              </motion.div>
            </div>
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
