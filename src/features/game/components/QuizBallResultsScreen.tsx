"use client";

import { useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getRankInfo, getDivisionEmoji, getDivisionColor } from '@/utils/rankSystem';
import type { GameQuestion } from '@/lib/domain';

interface QuizBallResultsScreenProps {
  categoryName: string;
  categoryIcon: string;
  playerScore: number;
  opponentScore: number;
  playerUsername: string;
  opponentUsername: string;
  playerAvatar: string;
  opponentAvatar: string;
  oldRank: number;
  newRank: number;
  correctAnswers: number;
  totalQuestions: number;
  coinsEarned: number;
  questions: GameQuestion[];
  playerAnswers: (number | null)[];
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function QuizBallResultsScreen({
  categoryName,
  categoryIcon,
  playerScore,
  opponentScore,
  playerUsername,
  opponentUsername,
  playerAvatar,
  opponentAvatar,
  oldRank,
  newRank,
  correctAnswers,
  totalQuestions,
  coinsEarned,
  questions,
  playerAnswers,
  onPlayAgain,
  onMainMenu,
}: QuizBallResultsScreenProps) {
  const playerWon = playerScore > opponentScore;
  const isDraw = playerScore === opponentScore;
  const rankPointsChange = playerWon ? 5 : isDraw ? 0 : -5;
  const accuracy = totalQuestions === 0 ? 0 : Math.round((correctAnswers / totalQuestions) * 100);
  const [showHistory, setShowHistory] = useState(false);
  const [animatedRankPoints, setAnimatedRankPoints] = useState(0);

  const rankInfo = getRankInfo(newRank);
  const oldRankInfo = getRankInfo(oldRank);
  const divisionEmoji = getDivisionEmoji(rankInfo.division);
  const divisionColor = getDivisionColor(rankInfo.division);

  useEffect(() => {
    if (rankPointsChange === 0) return;

    const duration = 1200;
    const steps = 30;
    const increment = rankPointsChange / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setAnimatedRankPoints(rankPointsChange);
        clearInterval(timer);
      } else {
        setAnimatedRankPoints(Math.round(increment * currentStep));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [rankPointsChange]);

  return (
    <div className="min-h-screen bg-[#0f1420] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-sm w-full space-y-4 font-fun"
      >
        {/* Result header */}
        <div className="text-center py-6">
          <div className="flex justify-center mb-4">
            {playerWon ? (
              <WinIllustration />
            ) : isDraw ? (
              <DrawIllustration />
            ) : (
              <LossIllustration />
            )}
          </div>
          <h1 className={cn(
            'text-3xl font-black',
            playerWon ? 'text-emerald-400' : isDraw ? 'text-yellow-400' : 'text-red-400'
          )}>
            {isDraw ? "It's a Draw!" : playerWon ? 'Victory!' : 'Defeat'}
          </h1>
          <div className="flex items-center justify-center gap-1.5 mt-2 text-white/40">
            <span className="text-base">{categoryIcon}</span>
            <span className="text-xs font-bold uppercase tracking-wider">{categoryName}</span>
          </div>
        </div>

        {/* Player comparison strip */}
        <div className="bg-[#1a1f2e] rounded-3xl border-b-4 border-b-white/10 p-4 space-y-3">
          <div className={cn(
            'flex items-center gap-3 p-3 rounded-2xl',
            playerWon ? 'bg-emerald-500/10' : 'bg-white/[0.03]'
          )}>
            <Avatar className={cn(
              'size-11 border-2 shrink-0',
              playerWon ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-white/20'
            )}>
              <AvatarImage src={playerAvatar} />
              <AvatarFallback className="text-xs font-bold bg-white/10">
                {playerUsername.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{playerUsername}</div>
              <div className="text-xs text-white/40 font-semibold">You</div>
            </div>
            <div className="text-2xl font-black text-white tabular-nums">{playerScore.toLocaleString()}</div>
          </div>

          <div className={cn(
            'flex items-center gap-3 p-3 rounded-2xl',
            !playerWon && !isDraw ? 'bg-red-500/10' : 'bg-white/[0.03]'
          )}>
            <Avatar className={cn(
              'size-11 border-2 shrink-0',
              !playerWon && !isDraw ? 'border-red-400 ring-2 ring-red-400/30' : 'border-white/20'
            )}>
              <AvatarImage src={opponentAvatar} />
              <AvatarFallback className="text-xs font-bold bg-white/10">
                {opponentUsername.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{opponentUsername}</div>
              <div className="text-xs text-white/40 font-semibold">Opponent</div>
            </div>
            <div className="text-2xl font-black text-white tabular-nums">{opponentScore.toLocaleString()}</div>
          </div>
        </div>

        {/* RP Progression */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#1a1f2e] rounded-3xl border-b-4 border-b-white/10 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{divisionEmoji}</span>
              <span className={cn('text-sm font-bold', divisionColor.text)}>{rankInfo.division}</span>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
              className={cn(
                'text-sm font-black',
                rankPointsChange > 0 ? 'text-emerald-400' : rankPointsChange < 0 ? 'text-red-400' : 'text-white/40'
              )}
            >
              {rankPointsChange > 0 ? '+' : ''}{animatedRankPoints} RP
            </motion.div>
          </div>

          <div className="relative h-4 bg-white/10 rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: `${oldRankInfo.progress}%` }}
              animate={{ width: `${rankInfo.progress}%` }}
              transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.5 }}
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))',
              }}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent h-1/2" />
            </motion.div>
          </div>

          <div className="flex items-center justify-between text-xs text-white/40 font-semibold">
            <span>{newRank} RP</span>
            {rankInfo.pointsToNext !== null && (
              <span>{rankInfo.pointsToNext} pts to next division</span>
            )}
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Accuracy" value={`${accuracy}%`} color="text-blue-400" />
          <StatCard label="Correct" value={`${correctAnswers}/${totalQuestions}`} color="text-yellow-400" />
          <StatCard label="Coins" value={`+${coinsEarned}`} color="text-emerald-400" />
        </div>

        {/* Question History Toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full bg-[#1a1f2e] rounded-2xl border-b-4 border-b-white/10 p-3 flex items-center justify-between hover:bg-[#1e2436] transition-colors"
        >
          <span className="text-sm font-bold text-white/70">Question History</span>
          {showHistory ? (
            <ChevronUp className="size-4 text-white/40" />
          ) : (
            <ChevronDown className="size-4 text-white/40" />
          )}
        </button>

        {/* Question History */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              {questions.map((question, index) => {
                const userAnswer = playerAnswers[index];
                const isCorrect = userAnswer === question.correctIndex;
                const wasAnswered = userAnswer !== null;

                return (
                  <motion.div
                    key={index}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'bg-[#1a1f2e] rounded-2xl border-b-4 p-3',
                      wasAnswered
                        ? isCorrect
                          ? 'border-b-emerald-500/30'
                          : 'border-b-red-500/30'
                        : 'border-b-white/10'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-xl text-xs font-black',
                        wasAnswered
                          ? isCorrect
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                          : 'bg-white/10 text-white/40'
                      )}>
                        {wasAnswered ? (
                          isCorrect ? <Check className="size-3.5" /> : <X className="size-3.5" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-xs font-bold text-white/80">{question.prompt}</p>
                        <div className="space-y-1">
                          {question.options.map((option, ansIndex) => {
                            const isUserAnswer = userAnswer === ansIndex;
                            const isCorrectAnswer = question.correctIndex === ansIndex;

                            return (
                              <div
                                key={ansIndex}
                                className={cn(
                                  'text-[11px] font-semibold px-2.5 py-1 rounded-lg',
                                  isCorrectAnswer
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : isUserAnswer
                                      ? 'bg-red-500/15 text-red-400'
                                      : 'bg-white/[0.03] text-white/30'
                                )}
                              >
                                {option}
                                {isCorrectAnswer && ' \u2713'}
                                {isUserAnswer && !isCorrectAnswer && ' \u2717'}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 border-b-4 border-b-emerald-600 text-white font-extrabold text-sm hover:bg-emerald-400 active:border-b-2 active:translate-y-[2px] transition-all"
          >
            Play Again
          </button>
          <button
            onClick={onMainMenu}
            className="w-full py-3.5 rounded-2xl bg-white/[0.04] border-2 border-white/10 border-b-4 border-b-white/15 text-white/70 font-extrabold text-sm hover:bg-white/[0.07] active:border-b-2 active:translate-y-[2px] transition-all"
          >
            Main Menu
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#1a1f2e] rounded-2xl border-b-4 border-b-white/10 p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1">{label}</div>
      <div className={cn('text-lg font-black', color)}>{value}</div>
    </div>
  );
}

function WinIllustration() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      <path d="M30 25 H60 L55 55 H35 Z" stroke="#22c55e" strokeWidth="2.5" fill="rgba(34,197,94,0.1)" />
      <path d="M30 30 Q18 30 18 42 Q18 50 28 50" stroke="#22c55e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M60 30 Q72 30 72 42 Q72 50 62 50" stroke="#22c55e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="37" y="55" width="16" height="4" rx="2" fill="#22c55e" />
      <rect x="33" y="59" width="24" height="4" rx="2" fill="#22c55e" opacity="0.6" />
      <path d="M45 34 L47.5 39 L53 39.8 L49 43.5 L50 49 L45 46.3 L40 49 L41 43.5 L37 39.8 L42.5 39 Z" fill="#22c55e" />
      <circle cx="22" cy="22" r="1.5" fill="#22c55e" opacity="0.6" />
      <circle cx="68" cy="20" r="1" fill="#22c55e" opacity="0.4" />
      <circle cx="75" cy="35" r="1.5" fill="#22c55e" opacity="0.5" />
    </svg>
  );
}

function DrawIllustration() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      <path d="M20 45 Q25 35 35 40 L45 45" stroke="#eab308" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M70 45 Q65 35 55 40 L45 45" stroke="#eab308" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="37" y="54" width="16" height="3" rx="1.5" fill="#eab308" opacity="0.6" />
      <rect x="37" y="60" width="16" height="3" rx="1.5" fill="#eab308" opacity="0.6" />
      <circle cx="45" cy="28" r="2" fill="#eab308" opacity="0.5" />
    </svg>
  );
}

function LossIllustration() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      <circle cx="45" cy="40" r="14" stroke="#ef4444" strokeWidth="2.5" fill="rgba(239,68,68,0.08)" />
      <path d="M45 30 L50 36 L48 43 L42 43 L40 36 Z" stroke="#ef4444" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M62 38 Q68 32 74 36" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M71 32 L74 36 L70 38" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none" />
      <line x1="28" y1="35" x2="22" y2="32" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="27" y1="42" x2="20" y2="42" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="28" y1="48" x2="22" y2="52" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M38 62 Q45 57 52 62" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  );
}
