"use client";

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';
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

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

function PlayerSide({
  info,
  side,
  accentColor,
  glowColor,
  label,
}: {
  info: ShowdownPlayerInfo;
  side: 'left' | 'right';
  accentColor: string;
  glowColor: string;
  label: string;
}) {
  const countryCode = info.countryCode ?? (info.country?.length === 2 ? info.country : null);

  const metaParts: string[] = [];
  if (info.level !== undefined) metaParts.push(`Lv ${info.level}`);
  if (info.rankPoints !== undefined) metaParts.push(`${info.rankPoints} RP`);
  if (info.tier) metaParts.push(info.tier);

  return (
    <motion.div
      initial={{ x: side === 'left' ? -180 : 180, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 18 }}
      className="flex flex-col items-center"
    >
      <div className="relative">
        <div
          className="absolute inset-0 scale-125 rounded-full opacity-40 blur-2xl"
          style={{ backgroundColor: glowColor }}
        />
        <motion.div
          initial={{ scale: 0.7 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          className="relative"
        >
          <AvatarDisplay
            customization={{ base: info.avatar || 'avatar-1' }}
            size="xxl"
            countryCode={countryCode}
          />
        </motion.div>
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white"
          style={{ backgroundColor: accentColor }}
        >
          {label}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-7 max-w-[200px] truncate text-center text-2xl uppercase text-white sm:max-w-[260px] sm:text-3xl"
        style={poppins}
      >
        {info.username}
      </motion.div>

      {metaParts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="mt-3 flex items-center gap-2 text-[11px] font-fun font-black uppercase tracking-[0.18em] text-white/55"
        >
          {metaParts.map((part, i) => (
            <span key={i} className={cn(i > 0 && 'before:mr-2 before:content-["·"]')}>
              {part}
            </span>
          ))}
        </motion.div>
      )}

      {info.favoriteClub && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="mt-1.5 text-[11px] font-fun font-black uppercase tracking-[0.18em] text-white/35"
        >
          {info.favoriteClub}
        </motion.div>
      )}
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
  const accentMatch = isRanked ? '#FFC800' : '#1CB0F6';

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0A1014] bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat px-4 font-fun">
      {/* Atmospheric glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-radial from-white/[0.06] to-transparent blur-3xl" />
        <motion.div
          animate={{ opacity: [0.18, 0.32, 0.18] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute left-0 top-1/4 h-[420px] w-[420px] rounded-full bg-gradient-radial from-[#1CB0F6]/30 to-transparent blur-3xl"
        />
        <motion.div
          animate={{ opacity: [0.18, 0.32, 0.18] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
          className="absolute right-0 top-1/4 h-[420px] w-[420px] rounded-full bg-gradient-radial from-[#FF4B4B]/30 to-transparent blur-3xl"
        />
      </div>

      {/* Match-type banner — small inline label */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="relative z-10 mb-8 flex items-center gap-2"
        style={{ color: accentMatch }}
      >
        <Trophy className="size-4" />
        <span className="text-xs font-fun font-black uppercase tracking-[0.28em]">
          {isRanked ? 'Ranked Match' : 'Friendly Match'}
        </span>
      </motion.div>

      {/* Player vs Opponent */}
      <div className="relative z-10 grid w-full max-w-4xl grid-cols-[1fr_auto_1fr] items-start gap-4 sm:gap-6 md:gap-10">
        <div className="flex justify-center">
          <PlayerSide
            info={playerData}
            side="left"
            accentColor="#1CB0F6"
            glowColor="#1CB0F6"
            label="YOU"
          />
        </div>

        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 15 }}
          className="self-center text-5xl uppercase sm:text-6xl md:text-7xl"
          style={{ ...poppins, color: accentMatch }}
        >
          VS
        </motion.div>

        <div className="flex justify-center">
          <PlayerSide
            info={opponentData}
            side="right"
            accentColor="#FF4B4B"
            glowColor="#FF4B4B"
            label="FOE"
          />
        </div>
      </div>

      {/* Bottom tagline */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
        className="relative z-10 mt-12 text-center"
      >
        <div
          className="text-2xl uppercase sm:text-3xl md:text-4xl"
          style={{ ...poppins, color: accentMatch }}
        >
          {isRanked ? 'Ranked 1v1' : 'Friendly 1v1'}
        </div>
        <motion.div
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mt-4 text-xs font-fun font-black uppercase tracking-[0.28em] text-white/45 sm:text-sm"
        >
          Get ready for kickoff…
        </motion.div>
      </motion.div>
    </div>
  );
}
