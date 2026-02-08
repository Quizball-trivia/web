
import React, { useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';

interface ShowdownScreenProps {
  player: {
    avatar: string;
    username: string;
    rankPoints: number;
    level?: number;
  };
  opponent: {
    avatar: string;
    username: string;
    rankPoints: number;
    level?: number;
  };
  onContinue: () => void;
}


export function ShowdownScreen({ player, opponent, onContinue }: ShowdownScreenProps) {


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0a101a] to-[#1B2F36] font-fun relative overflow-hidden">
      {/* Stadium lights effect */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute left-1/2 top-0 w-[600px] h-[600px] -translate-x-1/2 bg-gradient-radial from-white/10 to-transparent rounded-full blur-2xl" />
        <div className="absolute left-1/4 top-0 w-[300px] h-[300px] bg-gradient-radial from-[#1CB0F6]/30 to-transparent rounded-full blur-2xl" />
        <div className="absolute right-1/4 top-0 w-[300px] h-[300px] bg-gradient-radial from-[#FF4B4B]/30 to-transparent rounded-full blur-2xl" />
      </div>
      {/* Football stadium grass */}
      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-[#1B2F36] to-transparent z-0" />
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1.08 }}
        transition={{ duration: 0.7, type: 'spring', bounce: 0.3 }}
        className="flex items-center gap-32 bg-black/40 rounded-[3rem] px-24 py-20 border-8 border-[#243B44] shadow-[0_8px_64px_0_rgba(28,176,246,0.15)] z-10 relative max-w-6xl w-full"
      >
        {/* Player */}
        <motion.div initial={{ x: -120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 120 }} className="flex flex-col items-center">
          <div className="relative mb-4">
            <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1.15 }} transition={{ delay: 0.3, type: 'spring', stiffness: 200 }} className="size-40 rounded-full bg-[#131F24] border-8 border-[#1CB0F6] flex items-center justify-center text-8xl overflow-hidden shadow-2xl">
              {player.avatar.startsWith('http') ? (
                <Image src={player.avatar} alt="You" width={96} height={96} unoptimized className="w-full h-full object-cover" />
              ) : (
                <span>{player.avatar || '🧑'}</span>
              )}
            </motion.div>
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-lg font-black bg-[#1CB0F6] text-white px-4 py-1 rounded-full border-b-4 border-[#1899D6] uppercase tracking-widest shadow">YOU</span>
          </div>
          <div className="text-3xl font-black text-white leading-none drop-shadow-2xl mt-2">{player.username}</div>
          <div className="text-xl font-extrabold text-[#1CB0F6] mt-1 drop-shadow">{player.rankPoints} RP</div>
          {player.level !== undefined && (
            <div className="text-lg font-bold text-[#FFC800] mt-1 drop-shadow">Level {player.level}</div>
          )}
        </motion.div>
        {/* VS Football Icon */}
        <motion.div initial={{ scale: 0.5, rotate: -30 }} animate={{ scale: 1.5, rotate: 0 }} transition={{ delay: 0.5, type: 'spring', stiffness: 200 }} className="flex flex-col items-center mx-12">
          <span className="text-[7rem] font-black text-white mb-4 drop-shadow-2xl animate-bounce">⚽</span>
          <span className="text-6xl font-black text-[#FFC800] tracking-widest drop-shadow-2xl animate-pulse">VS</span>
        </motion.div>
        {/* Opponent */}
        <motion.div initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 120 }} className="flex flex-col items-center">
          <div className="relative mb-4">
            <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1.15 }} transition={{ delay: 0.3, type: 'spring', stiffness: 200 }} className="size-40 rounded-full bg-[#131F24] border-8 border-[#FF4B4B] flex items-center justify-center text-8xl overflow-hidden shadow-2xl">
              {opponent.avatar.startsWith('http') ? (
                <Image src={opponent.avatar} alt="Opponent" width={96} height={96} unoptimized className="w-full h-full object-cover" />
              ) : (
                <span>{opponent.avatar || '😈'}</span>
              )}
            </motion.div>
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-lg font-black bg-[#FF4B4B] text-white px-4 py-1 rounded-full border-b-4 border-[#E04242] uppercase tracking-widest shadow">FOE</span>
          </div>
          <div className="text-3xl font-black text-white leading-none drop-shadow-2xl mt-2">{opponent.username}</div>
          <div className="text-xl font-extrabold text-[#FF4B4B] mt-1 drop-shadow">{opponent.rankPoints} RP</div>
          {opponent.level !== undefined && (
            <div className="text-lg font-bold text-[#FFC800] mt-1 drop-shadow">Level {opponent.level}</div>
          )}
        </motion.div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="mt-20 text-white text-5xl font-extrabold tracking-wider drop-shadow-2xl z-10 text-center uppercase">
        <span className="bg-gradient-to-r from-[#1CB0F6] to-[#FF4B4B] bg-clip-text text-transparent pr-4">FOOTBALL TRIVIA BATTLE</span>
        <span className="inline-block ml-4 animate-pulse">BEGINS!</span>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} transition={{ delay: 2.5 }} className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/70 text-2xl font-bold tracking-wider z-10">
        Get ready for kickoff...
      </motion.div>
    </div>
  );
}
