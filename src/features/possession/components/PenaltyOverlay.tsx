'use client';

import { motion, AnimatePresence } from 'motion/react';
import { QuestionArena } from '@/components/game/QuestionArena';
import { AnswerCard } from '@/components/game/AnswerCard';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import { PenaltyCameraView } from './PenaltyCameraView';

const LABELS = ['A', 'B', 'C', 'D'];

interface PenaltyOverlayProps {
  visible: boolean;
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
  shooterAvatarUrl: string;
  defenderAvatarUrl: string;
  shooterName: string;
  defenderName: string;
  shooterScore: number;
  defenderScore: number;
  currentRound: number;
  maxRounds: number;
  isSuddenDeath: boolean;
  isShooterTurn: boolean;
  currentQuestion: GameQuestion | null;
  timeRemaining: number;
  selectedAnswer: number | null;
  answerStates: Array<'default' | 'correct' | 'wrong' | 'disabled'>;
  result: 'pending' | 'goal' | 'saved' | null;
  onAnswer: (index: number) => void;
  disabled: boolean;
  showOptions: boolean;
  phase: 'setup' | 'playing' | 'result';
  playerPosition: number;
}

export function PenaltyOverlay({
  visible,
  playerAvatarUrl,
  opponentAvatarUrl,
  shooterAvatarUrl,
  defenderAvatarUrl,
  shooterName,
  defenderName,
  shooterScore,
  defenderScore,
  currentRound,
  maxRounds,
  isSuddenDeath,
  isShooterTurn,
  currentQuestion,
  timeRemaining,
  selectedAnswer,
  answerStates,
  result,
  onAnswer,
  disabled,
  showOptions,
  phase,
  playerPosition,
}: PenaltyOverlayProps) {
  if (!visible || !currentQuestion) return null;

  // Render score pips (filled circles)
  const pipColors: Record<string, { filledBg: string; filledBorder: string }> = {
    green: { filledBg: 'bg-green-500', filledBorder: 'border-green-400' },
    red: { filledBg: 'bg-red-500', filledBorder: 'border-red-400' },
  };
  const fallbackPip = { filledBg: 'bg-gray-500', filledBorder: 'border-gray-400' };

  const renderScorePips = (score: number, maxScore: number, color: string) => {
    const colors = pipColors[color] ?? fallbackPip;
    return Array.from({ length: maxScore }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: i * 0.05 }}
        className={`w-3 h-3 rounded-full border-2 ${
          i < score ? `${colors.filledBg} ${colors.filledBorder}` : 'bg-gray-800 border-gray-600'
        }`}
      />
    ));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
      >
        {/* Background: Zoomed-in existing pitch */}
        <PenaltyCameraView
          playerAvatarUrl={playerAvatarUrl}
          opponentAvatarUrl={opponentAvatarUrl}
          shooterAvatarUrl={shooterAvatarUrl}
          defenderAvatarUrl={defenderAvatarUrl}
          shooterName={shooterName}
          defenderName={defenderName}
          isPlayerShooter={isShooterTurn}
          result={result === 'pending' ? null : result}
          phase={phase}
          playerPosition={playerPosition}
        />

        {/* UI Overlays */}
        <div className="absolute inset-0 pointer-events-none flex flex-col">
          {/* Top: Score panel + Title */}
          <div className="pt-6 px-6 flex flex-col items-center gap-4 pointer-events-auto">
            {/* Title */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 uppercase tracking-wider font-fun"
              >
                ⚽ Penalty Shootout
              </motion.div>
              {isSuddenDeath && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="mt-2 inline-block px-3 py-1 bg-red-600/20 border-2 border-red-500 rounded-full text-red-400 font-bold text-xs uppercase tracking-wider"
                >
                  🔥 Sudden Death
                </motion.div>
              )}
            </motion.div>

            {/* Score display */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-6 bg-black/60 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/10"
            >
              {/* Shooter pips */}
              <div className="flex flex-col items-center gap-2">
                <div className="text-xs font-bold text-white/70">{shooterName}</div>
                <div className="flex gap-1">{renderScorePips(shooterScore, maxRounds, 'green')}</div>
              </div>

              {/* Score */}
              <div className="text-4xl font-black text-white font-fun tabular-nums">
                {shooterScore} - {defenderScore}
              </div>

              {/* Defender pips */}
              <div className="flex flex-col items-center gap-2">
                <div className="text-xs font-bold text-white/70">{defenderName}</div>
                <div className="flex gap-1">{renderScorePips(defenderScore, maxRounds, 'red')}</div>
              </div>
            </motion.div>

            {/* Round indicator */}
            {!isSuddenDeath && (
              <div className="text-xs text-white/50 font-bold tracking-wider">
                Round {currentRound} / {maxRounds}
              </div>
            )}
          </div>

          {/* Middle: Role indicator + Timer */}
          <div className="flex-1 flex flex-col items-center justify-start pt-8 gap-4">
            {/* Role indicator */}
            <motion.div
              key={`role-${isShooterTurn}`}
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
            >
              <div
                className={`px-6 py-3 rounded-xl font-bold text-lg shadow-lg ${
                  isShooterTurn
                    ? 'bg-gradient-to-r from-green-600 to-green-500 text-white'
                    : 'bg-gradient-to-r from-red-600 to-red-500 text-white'
                }`}
              >
                {isShooterTurn ? '⚽ YOU SHOOT' : '🧤 YOU DEFEND'}
              </div>
            </motion.div>

            {/* Timer */}
            {phase === 'playing' && (
              <motion.div
                animate={{
                  scale: timeRemaining <= 2 ? [1, 1.15, 1] : 1,
                }}
                transition={{
                  duration: 0.3,
                  repeat: timeRemaining <= 2 ? Infinity : 0,
                }}
              >
                <div
                  className={`flex items-center justify-center w-16 h-16 rounded-full font-black text-3xl font-fun ${
                    timeRemaining <= 2
                      ? 'bg-red-500/20 border-4 border-red-500 text-red-400'
                      : 'bg-blue-500/20 border-4 border-blue-400 text-blue-400'
                  }`}
                >
                  {timeRemaining}
                </div>
              </motion.div>
            )}
          </div>

          {/* Bottom: Question + Answers */}
          <div className="pb-8 px-6 pointer-events-auto">
            <div className="max-w-2xl mx-auto space-y-4">
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
                  difficulty={currentQuestion.difficulty ?? 'Hard'}
                />
              </motion.div>

              {/* Answer options */}
              {showOptions && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-2 gap-3"
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
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
