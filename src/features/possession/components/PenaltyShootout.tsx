'use client';

import { motion, AnimatePresence } from 'motion/react';
import { QuestionArena } from '@/features/game/components/QuestionArena';
import { AnswerCard } from '@/features/game/components/AnswerCard';
import type { GameQuestion } from '@/lib/domain/gameQuestion';

const LABELS = ['A', 'B', 'C', 'D'];

interface PenaltyShootoutProps {
  visible: boolean;
  currentQuestion: GameQuestion | null;
  shooterName: string;
  defenderName: string;
  shooterAvatarUrl: string;
  defenderAvatarUrl: string;
  shooterScore: number;
  defenderScore: number;
  currentRound: number;
  maxRounds: number;
  isSuddenDeath: boolean;
  isShooterTurn: boolean; // true = player is shooter, false = player is defender
  timeRemaining: number;
  selectedAnswer: number | null;
  answerStates: Array<'default' | 'correct' | 'wrong' | 'disabled'>;
  penaltyResult: 'pending' | 'goal' | 'saved' | null;
  onAnswer: (index: number) => void;
  disabled: boolean;
  showOptions: boolean;
}

export function PenaltyShootout({
  visible,
  currentQuestion,
  shooterName,
  defenderName,
  shooterAvatarUrl,
  defenderAvatarUrl,
  shooterScore,
  defenderScore,
  currentRound,
  maxRounds,
  isSuddenDeath,
  isShooterTurn,
  timeRemaining,
  selectedAnswer,
  answerStates,
  penaltyResult,
  onAnswer,
  disabled,
  showOptions,
}: PenaltyShootoutProps) {
  if (!visible || !currentQuestion) return null;

  // Penalty score indicators (circles)
  const renderScoreIndicators = (score: number, isShooter: boolean) => {
    const circles = [];
    for (let i = 0; i < maxRounds; i++) {
      const filled = i < score;
      circles.push(
        <motion.div
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className={`w-3 h-3 rounded-full border-2 ${
            filled
              ? isShooter
                ? 'bg-green-500 border-green-400'
                : 'bg-red-500 border-red-400'
              : 'bg-gray-800 border-gray-600'
          }`}
        />
      );
    }
    return circles;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gradient-to-b from-[#0a0e1a] via-[#0f1420] to-[#1a1f2e] flex flex-col items-center justify-center"
      >
        {/* Dramatic background effect */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              opacity: [0.3, 0.5, 0.3],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 bg-gradient-radial from-red-900/20 via-transparent to-transparent"
          />
          {/* Spotlight effect */}
          <motion.div
            animate={{
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-yellow-400/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 w-full max-w-lg px-4">
          {/* Header */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center mb-6"
          >
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 uppercase tracking-wider font-fun mb-2"
            >
              ⚽ Penalty Shootout
            </motion.div>
            {isSuddenDeath && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-block px-4 py-1 bg-red-600/20 border-2 border-red-500 rounded-full text-red-400 font-bold text-sm uppercase tracking-wider"
              >
                🔥 Sudden Death
              </motion.div>
            )}
          </motion.div>

          {/* Score Display */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-between mb-8 bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-white/10"
          >
            {/* Shooter */}
            <div className="flex flex-col items-center space-y-2">
              <motion.img
                animate={isShooterTurn ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5, repeat: isShooterTurn ? Infinity : 0 }}
                src={shooterAvatarUrl}
                alt={shooterName}
                className={`w-12 h-12 rounded-full border-4 ${
                  isShooterTurn ? 'border-yellow-400' : 'border-gray-600'
                }`}
              />
              <div className="text-white font-bold text-sm">{shooterName}</div>
              <div className="flex gap-1">{renderScoreIndicators(shooterScore, true)}</div>
            </div>

            {/* Round Counter */}
            <div className="text-center">
              <div className="text-5xl font-black text-white font-fun">
                {shooterScore} - {defenderScore}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {isSuddenDeath ? 'Sudden Death' : `Round ${currentRound}/${maxRounds}`}
              </div>
            </div>

            {/* Defender */}
            <div className="flex flex-col items-center space-y-2">
              <motion.img
                animate={!isShooterTurn ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5, repeat: !isShooterTurn ? Infinity : 0 }}
                src={defenderAvatarUrl}
                alt={defenderName}
                className={`w-12 h-12 rounded-full border-4 ${
                  !isShooterTurn ? 'border-yellow-400' : 'border-gray-600'
                }`}
              />
              <div className="text-white font-bold text-sm">{defenderName}</div>
              <div className="flex gap-1">{renderScoreIndicators(defenderScore, false)}</div>
            </div>
          </motion.div>

          {/* Role Indicator */}
          <motion.div
            key={`role-${isShooterTurn}`}
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            className="text-center mb-4"
          >
            <div
              className={`inline-block px-6 py-3 rounded-xl font-bold text-lg ${
                isShooterTurn
                  ? 'bg-gradient-to-r from-green-600 to-green-500 text-white'
                  : 'bg-gradient-to-r from-red-600 to-red-500 text-white'
              } shadow-lg`}
            >
              {isShooterTurn ? '⚽ YOU SHOOT' : '🧤 YOU DEFEND'}
            </div>
          </motion.div>

          {/* Timer */}
          <motion.div
            animate={{
              scale: timeRemaining <= 2 ? [1, 1.15, 1] : 1,
            }}
            transition={{ duration: 0.3, repeat: timeRemaining <= 2 ? Infinity : 0 }}
            className="text-center mb-4"
          >
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-full font-black text-3xl font-fun ${
                timeRemaining <= 2
                  ? 'bg-red-500/20 border-4 border-red-500 text-red-400'
                  : 'bg-blue-500/20 border-4 border-blue-400 text-blue-400'
              }`}
            >
              {timeRemaining}
            </div>
          </motion.div>

          {/* Question */}
          <motion.div
            key={`penalty-q-${currentQuestion.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <QuestionArena
              question={currentQuestion.prompt}
              category={currentQuestion.categoryName ?? 'Penalty'}
              categoryIcon="⚽"
              difficulty="Hard"
            />
          </motion.div>

          {/* Options */}
          {showOptions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 gap-3 mt-4"
            >
              {currentQuestion.options.map((opt, i) => (
                <motion.div
                  key={`penalty-opt-${i}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <AnswerCard
                    label={LABELS[i]}
                    text={opt}
                    index={i}
                    isSelected={selectedAnswer === i}
                    state={answerStates[i]}
                    fadeOut={answerStates[i] === 'wrong' || answerStates[i] === 'disabled'}
                    onClick={() => !disabled && onAnswer(i)}
                    disabled={disabled}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Penalty Result Animation */}
          <AnimatePresence>
            {penaltyResult === 'goal' && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: 2,
                  }}
                  className="text-center"
                >
                  <div className="text-8xl mb-4">⚽</div>
                  <div className="text-6xl font-black text-green-400 font-fun uppercase tracking-wider drop-shadow-lg">
                    GOAL!
                  </div>
                  <motion.div
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0.8, 1.5, 2],
                    }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 bg-green-500/20 rounded-full blur-3xl"
                  />
                </motion.div>
              </motion.div>
            )}

            {penaltyResult === 'saved' && (
              <motion.div
                initial={{ scale: 0, x: 100 }}
                animate={{ scale: 1, x: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
              >
                <motion.div
                  animate={{
                    rotate: [-5, 5, -5, 5, 0],
                  }}
                  transition={{
                    duration: 0.5,
                  }}
                  className="text-center"
                >
                  <div className="text-8xl mb-4">🧤</div>
                  <div className="text-6xl font-black text-red-400 font-fun uppercase tracking-wider drop-shadow-lg">
                    SAVED!
                  </div>
                  <motion.div
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0.8, 1.5, 2],
                    }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 bg-red-500/20 rounded-full blur-3xl"
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
