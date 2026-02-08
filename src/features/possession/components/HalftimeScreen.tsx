'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HalftimeScreenProps {
  visible: boolean;
  type: 'halftime' | 'fulltime';
  playerGoals: number;
  opponentGoals: number;
  playerName: string;
  opponentName: string;
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
  stats: {
    avgPosition: number;
    shotsOnGoal: number;
    correctAnswers: number;
    totalQuestions: number;
  };
  onPlayAgain?: () => void;
}

export function HalftimeScreen({
  visible,
  type,
  playerGoals,
  opponentGoals,
  playerName,
  opponentName,
  playerAvatarUrl,
  opponentAvatarUrl,
  stats,
  onPlayAgain,
}: HalftimeScreenProps) {
  const winner =
    playerGoals > opponentGoals
      ? playerName
      : opponentGoals > playerGoals
        ? opponentName
        : null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 px-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-full max-w-md text-center font-fun"
          >
            {/* Title */}
            <div className="mb-6">
              <div className="text-white/40 text-xs uppercase tracking-[0.3em] font-bold mb-1">
                {type === 'halftime' ? 'Half Time' : 'Full Time'}
              </div>
              <div className="text-2xl font-black text-white uppercase tracking-wide">
                {type === 'halftime' ? 'End of 1st Half' : 'Match Over'}
              </div>
            </div>

            {/* Score display with avatars */}
            <div className="flex items-center justify-center gap-5 mb-8">
              <div className="flex flex-col items-center gap-2">
                <Avatar className="size-16 border-3 border-[#1CB0F6]">
                  <AvatarImage src={playerAvatarUrl} />
                  <AvatarFallback className="text-sm font-bold bg-[#1CB0F6]/20 text-[#1CB0F6]">
                    {playerName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-white/50 uppercase tracking-widest font-bold">{playerName}</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-5xl font-black text-white">{playerGoals}</span>
                <span className="text-2xl text-white/30 font-black">-</span>
                <span className="text-5xl font-black text-white">{opponentGoals}</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <Avatar className="size-16 border-3 border-[#FF4B4B]">
                  <AvatarImage src={opponentAvatarUrl} />
                  <AvatarFallback className="text-sm font-bold bg-[#FF4B4B]/20 text-[#FF4B4B]">
                    {opponentName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-white/50 uppercase tracking-widest font-bold">{opponentName}</span>
              </div>
            </div>

            {/* Stats card */}
            <div className="bg-[#172333]/85 rounded-2xl border border-white/10 border-b-4 border-b-white/5 p-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <StatRow label="Avg Position" value={`${Math.round(stats.avgPosition)}%`} />
                <StatRow label="Shots on Goal" value={String(stats.shotsOnGoal)} />
                <StatRow label="Correct Answers" value={`${stats.correctAnswers}/${stats.totalQuestions}`} />
                <StatRow label="Accuracy" value={`${stats.totalQuestions > 0 ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0}%`} />
              </div>
            </div>

            {/* Winner / actions */}
            {type === 'fulltime' && (
              <>
                {winner ? (
                  <div className="text-emerald-400 text-lg font-black uppercase tracking-wide mb-4">
                    {winner} Wins!
                  </div>
                ) : (
                  <div className="text-yellow-400 text-lg font-black uppercase tracking-wide mb-4">
                    Draw!
                  </div>
                )}
                <button
                  onClick={onPlayAgain}
                  className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-wide rounded-2xl border-b-4 border-emerald-600 hover:border-emerald-700 active:border-b-2 active:translate-y-[2px] transition-all"
                >
                  Play Again
                </button>
              </>
            )}

            {type === 'halftime' && (
              <div className="text-white/40 text-sm font-bold">
                2nd Half starting soon...
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-2 py-1">
      <span className="text-[11px] text-white/40 uppercase tracking-wider font-bold">{label}</span>
      <span className="text-sm text-emerald-300 font-black">{value}</span>
    </div>
  );
}
