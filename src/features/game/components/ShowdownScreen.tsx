"use client";

import { useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Trophy, Swords, Shield, Star } from 'lucide-react';
import { AvatarDisplay } from '@/components/AvatarDisplay';

interface ShowdownPlayerInfo {
  username: string;
  avatar: string;
  rankPoints?: number;
  level?: number;
  tier?: string;
  country?: string;
  countryCode?: string;
  favoriteClub?: string;
  badge?: string;
  /** Direct flag emoji from backend */
  flag?: string;
}

interface ShowdownScreenProps {
  playerUsername: string;
  playerAvatar: string;
  opponentUsername: string;
  opponentAvatar: string;
  matchType: 'ranked' | 'friendly';
  onComplete: () => void;
  /** Extended player info for richer display */
  playerInfo?: ShowdownPlayerInfo;
  /** Extended opponent info for richer display */
  opponentInfo?: ShowdownPlayerInfo;
}

function PlayerCard({
  info,
  side,
  accentColor,
  accentBorder,
  accentGlow,
  label,
}: {
  info: ShowdownPlayerInfo;
  side: 'left' | 'right';
  accentColor: string;
  accentBorder: string;
  accentGlow: string;
  label: string;
}) {
  const countryCode = info.countryCode ?? (info.country?.length === 2 ? info.country : null);

  return (
    <motion.div
      initial={{ x: side === 'left' ? -200 : 200, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 100, damping: 18 }}
      className="flex flex-col items-center w-full md:w-auto"
    >
      {/* Avatar */}
      <div className="relative mb-5">
        <div className={cn("absolute inset-0 rounded-full blur-2xl opacity-40 scale-110", accentGlow)} />

        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        >
          <AvatarDisplay
            customization={{ base: info.avatar || 'avatar-1' }}
            size="xxl"
            countryCode={countryCode}
            className={cn("border-[5px] border-b-[7px] shadow-2xl bg-[#131F24]", accentBorder)}
          />
        </motion.div>

        {/* Label badge */}
        <motion.div
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.7, type: 'spring', stiffness: 300 }}
          className={cn(
            "absolute -bottom-3 left-1/2 -translate-x-1/2 text-[11px] font-black uppercase tracking-widest px-4 py-1 rounded-full border-b-[3px] shadow-lg text-white z-30",
            accentColor, accentBorder
          )}
        >
          {label}
        </motion.div>
      </div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center space-y-2 mt-2"
      >
        {/* Username */}
        <div className="flex items-center justify-center gap-2">
          <div className="text-xl sm:text-2xl md:text-3xl font-black font-fun text-white leading-none drop-shadow-lg">
            {info.username}
          </div>
        </div>

        {/* Country name */}
        {info.country && !countryCode && (
          <div className="text-[11px] font-bold text-[#56707A] uppercase tracking-wider">
            {info.country}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {info.rankPoints !== undefined && (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-b-4 text-sm font-black",
              accentBorder, "bg-white/5"
            )}>
              <Trophy className="size-3.5" />
              <span>{info.rankPoints} RP</span>
            </div>
          )}

          {info.level !== undefined && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-b-4 border-[#FFC800]/40 border-b-[#FFC800]/60 bg-[#FFC800]/10 text-[#FFC800] text-sm font-black">
              <Star className="size-3.5 fill-current" />
              <span>Lv. {info.level}</span>
            </div>
          )}
        </div>

        {info.tier && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="flex items-center justify-center gap-1.5"
          >
            <Shield className="size-3.5 text-[#CE82FF]" />
            <span className="text-xs font-bold text-[#CE82FF] uppercase tracking-wider">{info.tier}</span>
          </motion.div>
        )}

        {info.favoriteClub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="text-xs font-bold text-[#56707A]"
          >
            ⚽ {info.favoriteClub}
          </motion.div>
        )}

        {info.badge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.1, type: 'spring', stiffness: 300 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF9600]/15 border border-[#FF9600]/30 text-[#FF9600] text-[10px] font-black uppercase tracking-wider"
          >
            <span>🏅</span>
            <span>{info.badge}</span>
          </motion.div>
        )}

      </motion.div>
    </motion.div>
  );
}

export function ShowdownScreen({
  playerUsername,
  playerAvatar,
  opponentUsername,
  opponentAvatar,
  matchType,
  onComplete,
  playerInfo,
  opponentInfo,
}: ShowdownScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 4500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const playerData: ShowdownPlayerInfo = { ...playerInfo, username: playerUsername, avatar: playerAvatar };
  const opponentData: ShowdownPlayerInfo = { ...opponentInfo, username: opponentUsername, avatar: opponentAvatar };

  const isRanked = matchType === 'ranked';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A1014] font-fun relative overflow-hidden px-3 sm:px-4">
      {/* Stadium atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-0 w-[700px] h-[500px] -translate-x-1/2 bg-gradient-radial from-white/[0.07] to-transparent rounded-full blur-3xl" />
        <motion.div
          animate={{ opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute left-0 top-1/4 w-[400px] h-[400px] bg-gradient-radial from-[#1CB0F6]/30 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{ opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
          className="absolute right-0 top-1/4 w-[400px] h-[400px] bg-gradient-radial from-[#FF4B4B]/30 to-transparent rounded-full blur-3xl"
        />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#58CC02]/30 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 150, damping: 20 }}
        className="relative z-10 w-full max-w-[960px] mx-auto"
      >
        {/* Match type banner */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring' }}
          className="flex justify-center mb-6"
        >
          <div className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-full border-2 border-b-4",
            isRanked
              ? "border-[#FFC800]/40 border-b-[#FFC800]/60 bg-[#FFC800]/10"
              : "border-[#1CB0F6]/40 border-b-[#1CB0F6]/60 bg-[#1CB0F6]/10"
          )}>
            <Trophy className={cn("size-4", isRanked ? "text-[#FFC800]" : "text-[#1CB0F6]")} />
            <span className={cn("text-sm font-black uppercase tracking-widest", isRanked ? "text-[#FFC800]" : "text-[#1CB0F6]")}>
              {isRanked ? 'Ranked Match' : 'Friendly Match'}
            </span>
          </div>
        </motion.div>

        {/* Arena card */}
        <div className="relative bg-[#131F24]/80 backdrop-blur-sm rounded-3xl border-2 border-b-4 border-[#243B44] border-b-[#1B2F36] p-6 sm:p-8 md:p-10 shadow-2xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-6">
            <div className="flex-1 flex justify-center">
              <PlayerCard
                info={playerData}
                side="left"
                accentColor="bg-[#1CB0F6]"
                accentBorder="border-[#1CB0F6]/60 border-b-[#1890CC]"
                accentGlow="bg-[#1CB0F6]"
                label="YOU"
              />
            </div>

            {/* VS */}
            <div className="flex flex-col items-center mx-2 md:mx-4 shrink-0">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 15 }}
                className="relative"
              >
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-[#FFC800]/20"
                />
                <div className="size-20 md:size-24 rounded-full bg-gradient-to-br from-[#FFC800] to-[#FF9600] border-4 border-b-[6px] border-[#CC7800] flex items-center justify-center shadow-xl shadow-[#FF9600]/30">
                  <Swords className="size-10 md:size-12 text-white drop-shadow-lg" />
                </div>
              </motion.div>

              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="text-3xl md:text-4xl font-black text-[#FFC800] tracking-[0.2em] mt-3 drop-shadow-lg"
              >
                VS
              </motion.span>
            </div>

            <div className="flex-1 flex justify-center">
              <PlayerCard
                info={opponentData}
                side="right"
                accentColor="bg-[#FF4B4B]"
                accentBorder="border-[#FF4B4B]/60 border-b-[#E04242]"
                accentGlow="bg-[#FF4B4B]"
                label="FOE"
              />
            </div>
          </div>

          <div className="mt-8 mb-4 h-px bg-gradient-to-r from-transparent via-[#243B44] to-transparent" />

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="text-center"
          >
            <div className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-wide text-[#FFC800] drop-shadow-lg">
              Ranked 1v1
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="mt-8 z-10"
      >
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-lg sm:text-xl font-bold text-white/50 tracking-wider"
        >
          Get ready for kickoff...
        </motion.span>
      </motion.div>
    </div>
  );
}
