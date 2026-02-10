'use client';

import { motion } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X } from 'lucide-react';
import type { Phase } from '../types/possession.types';

interface ShotHUDProps {
  playerGoals: number;
  opponentGoals: number;
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
  timeRemaining: number;
  phase: Phase;
  isPlayerAttacker?: boolean;
  playerName?: string;
  opponentName?: string;
  onQuit?: () => void;
}

export function ShotHUD({
  playerGoals,
  opponentGoals,
  playerAvatarUrl,
  opponentAvatarUrl,
  timeRemaining,
  phase,
  isPlayerAttacker = true,
  playerName = 'You',
  opponentName = 'CPU',
  onQuit,
}: ShotHUDProps) {
  return (
    <div className="w-full font-fun space-y-2 mb-3">
      {onQuit && (
        <div className="px-3">
          <button
            onClick={onQuit}
            className="shrink-0 p-1.5 rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
            title="Leave match"
          >
            <X className="size-5" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 px-3">
        <div className="flex items-center gap-3 flex-1 min-w-0 rounded-2xl bg-[#172333]/85 border border-white/10 px-3 py-2.5">
            <Avatar className="size-11 border-2 border-[#1CB0F6] shrink-0">
              <AvatarImage src={playerAvatarUrl} />
              <AvatarFallback className="text-xs font-bold bg-[#1CB0F6]/20 text-[#1CB0F6]">YO</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white/85 truncate">{playerName}</div>
              <div className="text-3xl leading-7 font-black text-white tabular-nums">{playerGoals}</div>
            </div>
          </div>
        <div className="shrink-0 flex flex-col items-center justify-center min-w-[100px]">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-2.5 py-0.5 rounded-full bg-[#FF9600]/20 border border-[#FF9600]/40 text-[10px] font-black uppercase tracking-[0.12em] text-[#FF9600] mb-1"
          >
            Shot on Goal
          </motion.div>
          <motion.div
            animate={timeRemaining <= 3 && phase === 'shot' ? { scale: [1, 1.1, 1] } : {}}
            transition={timeRemaining <= 3 ? { repeat: Infinity, duration: 0.6 } : {}}
            className={`text-3xl font-black tabular-nums transition-colors duration-200 ${
              phase === 'shot'
                ? timeRemaining <= 3 ? 'text-red-500 animate-pulse' : 'text-white'
                : 'text-white/40'
            }`}
          >
            {phase === 'shot' ? timeRemaining : '\u2014'}
          </motion.div>
          <div className="text-[10px] font-black tracking-[0.18em] text-[#FF9600]/70 -mt-0.5">
            {isPlayerAttacker ? 'YOU SHOOT' : 'YOU SAVE'}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end rounded-2xl bg-[#172333]/85 border border-white/10 px-3 py-2.5">
          <div className="min-w-0 text-right">
            <div className="text-xs font-bold text-white/85 truncate ml-auto">{opponentName}</div>
            <div className="text-3xl leading-7 font-black text-white tabular-nums">{opponentGoals}</div>
          </div>
          <Avatar className="size-11 border-2 border-[#FF4B4B] shrink-0">
            <AvatarImage src={opponentAvatarUrl} />
            <AvatarFallback className="text-xs font-bold bg-[#FF4B4B]/20 text-[#FF4B4B]">CP</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}
