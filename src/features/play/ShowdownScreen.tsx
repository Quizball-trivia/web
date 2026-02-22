import { useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Trophy, Swords, Shield, Star } from 'lucide-react';

interface PlayerShowdownInfo {
  avatar: string;
  username: string;
  rankPoints?: number;
  level?: number;
  tier?: string;
  country?: string;
  countryCode?: string;
  favoriteClub?: string;
  badge?: string;
  flag?: string;
}

interface ShowdownScreenProps {
  player: PlayerShowdownInfo;
  opponent: PlayerShowdownInfo;
  onContinue: () => void;
}

function getFlagEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase();
  return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

function PlayerCard({
  info,
  side,
  accentColor,
  accentBorder,
  accentGlow,
  label,
}: {
  info: PlayerShowdownInfo;
  side: 'left' | 'right';
  accentColor: string;
  accentBorder: string;
  accentGlow: string;
  label: string;
}) {
  const hasFlag = info.countryCode || info.country || info.flag;
  const flagEmoji = info.countryCode ? getFlagEmoji(info.countryCode) : info.flag ?? null;

  return (
    <motion.div
      initial={{ x: side === 'left' ? -200 : 200, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 100, damping: 18 }}
      className="flex flex-col items-center w-full md:w-auto"
    >
      {/* Avatar ring */}
      <div className="relative mb-5">
        {/* Glow behind avatar */}
        <div className={cn("absolute inset-0 rounded-full blur-2xl opacity-40 scale-110", accentGlow)} />

        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          className={cn(
            "relative size-28 sm:size-32 md:size-36 rounded-full border-[5px] border-b-[7px] flex items-center justify-center overflow-hidden shadow-2xl",
            accentBorder, "bg-[#131F24]"
          )}
        >
          {info.avatar.startsWith('http') || info.avatar.startsWith('/') ? (
            <Image src={info.avatar} alt={info.username} width={144} height={144} unoptimized className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl sm:text-7xl">{info.avatar || '🧑'}</span>
          )}
        </motion.div>

        {/* Label badge (YOU / FOE) */}
        <motion.div
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.7, type: 'spring', stiffness: 300 }}
          className={cn(
            "absolute -bottom-3 left-1/2 -translate-x-1/2 text-[11px] font-black uppercase tracking-widest px-4 py-1 rounded-full border-b-[3px] shadow-lg text-white",
            accentColor, accentBorder
          )}
        >
          {label}
        </motion.div>

        {/* Country flag */}
        {hasFlag && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: 'spring', stiffness: 300 }}
            className="absolute -top-1 -right-1 text-2xl drop-shadow-lg"
          >
            {flagEmoji ?? '🌍'}
          </motion.div>
        )}
      </div>

      {/* Player info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center space-y-2 mt-2"
      >
        {/* Username + flag */}
        <div className="flex items-center justify-center gap-2">
          {flagEmoji && <span className="text-2xl sm:text-3xl">{flagEmoji}</span>}
          <div className="text-xl sm:text-2xl md:text-3xl font-black font-fun text-white leading-none drop-shadow-lg">
            {info.username}
          </div>
        </div>

        {/* Country name */}
        {info.country && (
          <div className="text-[11px] font-bold text-[#56707A] uppercase tracking-wider">
            {info.country}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {/* Rank points */}
          {info.rankPoints !== undefined && (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-b-4 text-sm font-black",
              accentBorder, "bg-white/5"
            )}>
              <Trophy className="size-3.5" />
              <span>{info.rankPoints} RP</span>
            </div>
          )}

          {/* Level */}
          {info.level !== undefined && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-b-4 border-[#FFC800]/40 border-b-[#FFC800]/60 bg-[#FFC800]/10 text-[#FFC800] text-sm font-black">
              <Star className="size-3.5 fill-current" />
              <span>Lv. {info.level}</span>
            </div>
          )}
        </div>

        {/* Tier */}
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

        {/* Favorite club */}
        {info.favoriteClub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="text-xs font-bold text-[#56707A]"
          >
            {info.favoriteClub}
          </motion.div>
        )}

        {/* Badge */}
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

export function ShowdownScreen({ player, opponent, onContinue }: ShowdownScreenProps) {
  // Ensure countryCode/country/flag are always present for both player and opponent
  const playerCountryCode = player.countryCode || player.flag || undefined;
  const opponentCountryCode = opponent.countryCode || opponent.flag || undefined;

  useEffect(() => {
    const timer = setTimeout(() => onContinue(), 4500);
    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A1014] font-fun relative overflow-hidden px-3 sm:px-4">
      {/* Stadium atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top spotlight */}
        <div className="absolute left-1/2 top-0 w-[700px] h-[500px] -translate-x-1/2 bg-gradient-radial from-white/[0.07] to-transparent rounded-full blur-3xl" />
        {/* Blue glow (player side) */}
        <motion.div
          animate={{ opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute left-0 top-1/4 w-[400px] h-[400px] bg-gradient-radial from-[#1CB0F6]/30 to-transparent rounded-full blur-3xl"
        />
        {/* Red glow (opponent side) */}
        <motion.div
          animate={{ opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
          className="absolute right-0 top-1/4 w-[400px] h-[400px] bg-gradient-radial from-[#FF4B4B]/30 to-transparent rounded-full blur-3xl"
        />
        {/* Pitch line glow at bottom */}
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#58CC02]/30 to-transparent" />
        <div className="absolute bottom-16 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>

      {/* Main card */}
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
          <div className="flex items-center gap-2 px-5 py-2 rounded-full border-2 border-b-4 border-[#FFC800]/40 border-b-[#FFC800]/60 bg-[#FFC800]/10">
            <Trophy className="size-4 text-[#FFC800]" />
            <span className="text-sm font-black text-[#FFC800] uppercase tracking-widest">Ranked Match</span>
          </div>
        </motion.div>

        {/* Arena container */}
        <div className="relative bg-[#131F24]/80 backdrop-blur-sm rounded-3xl border-2 border-b-4 border-[#243B44] border-b-[#1B2F36] p-6 sm:p-8 md:p-10 shadow-2xl">
          {/* Inner glow line at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-6">
            {/* Player */}
            <div className="flex-1 flex justify-center">
              <PlayerCard
                info={{ ...player, countryCode: playerCountryCode }}
                side="left"
                accentColor="bg-[#1CB0F6]"
                accentBorder="border-[#1CB0F6]/60 border-b-[#1890CC]"
                accentGlow="bg-[#1CB0F6]"
                label="YOU"
              />
            </div>

            {/* VS center piece */}
            <div className="flex flex-col items-center mx-2 md:mx-4 shrink-0">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 15 }}
                className="relative"
              >
                {/* Outer ring pulse */}
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

            {/* Opponent */}
            <div className="flex-1 flex justify-center">
              <PlayerCard
                info={{ ...opponent, countryCode: opponentCountryCode }}
                side="right"
                accentColor="bg-[#FF4B4B]"
                accentBorder="border-[#FF4B4B]/60 border-b-[#E04242]"
                accentGlow="bg-[#FF4B4B]"
                label="FOE"
              />
            </div>
          </div>

          {/* Divider line */}
          <div className="mt-8 mb-4 h-px bg-gradient-to-r from-transparent via-[#243B44] to-transparent" />

          {/* Bottom tagline */}
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

      {/* Kickoff text */}
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
