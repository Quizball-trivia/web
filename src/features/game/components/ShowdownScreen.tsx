"use client";

import Image from 'next/image';
import { useEffect } from 'react';
import { motion } from 'motion/react';
import { AvatarPreview } from '@/components/AvatarPreview';
import { CountryFlag } from '@/components/CountryFlag';
import type { AvatarCustomization } from '@/types/game';
import { getTierAccent } from '@/utils/tierVisuals';
import { getClub } from '@/lib/clubs';

type MatchResultLetter = 'W' | 'L' | 'D';

interface ShowdownPlayerInfo {
  username: string;
  avatar: string;
  avatarCustomization?: AvatarCustomization | null;
  rankPoints?: number;
  level?: number;
  tier?: string;
  country?: string;
  countryCode?: string;
  /** Direct flag emoji from backend (legacy). Prefer `countryCode`. */
  flag?: string;
  /** Persisted favorite club value (the display name stored on the profile). */
  favoriteClub?: string | null;
  /** Last 3 match results, most recent first — used to render a WWL-style form chip strip. */
  recentForm?: MatchResultLetter[];
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
  /** Override outer container classes — used by the dev preview to leave
   *  room for its control panel. Defaults to full-screen centering. */
  wrapperClassName?: string;
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
}: {
  info: ShowdownPlayerInfo;
  side: 'left' | 'right';
}) {
  const countryCode = info.countryCode ?? (info.country?.length === 2 ? info.country : null);
  const club = getClub(info.favoriteClub ?? null);
  const tierAccent = info.tier ? getTierAccent(info.tier) : '#FFE500';

  // Opponent (right side) faces the player — flip horizontally per Figma.
  const isOpponent = side === 'right';
  const avatarCustomization = info.avatarCustomization ?? { base: info.avatar || 'avatar-1' };

  return (
    <motion.div
      initial={{ x: side === 'left' ? -180 : 180, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 18 }}
      className="flex flex-col items-center"
    >
      {/* Avatar card — 5:6 aspect, character bottom-anchored per Figma */}
      <motion.div
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        className="relative flex aspect-[5/6] w-[200px] items-end justify-center overflow-hidden rounded-[20px] bg-brand-blue md:w-[240px]"
      >
        {/* Country flag chip — top-left, rounded-br/tl. Chip is 3:2 to match
            the flag-icons SVG aspect exactly so no background bleeds through. */}
        {countryCode && (
          <div className="absolute left-0 top-0 z-10 flex h-[44px] w-[66px] items-center justify-center overflow-hidden rounded-br-[20px] rounded-tl-[20px] md:h-[56px] md:w-[84px]">
            <CountryFlag
              code={countryCode}
              className="!h-full !w-full"
              style={{ backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
          </div>
        )}

        {/* Club logo chip — top-right, rounded-bl/tr, club's primary color */}
        {club && (
          <div
            className="absolute right-0 top-0 z-10 flex size-[52px] items-center justify-center overflow-hidden rounded-bl-[20px] rounded-tr-[20px] md:size-[64px]"
            style={{ backgroundColor: club.primaryColor }}
          >
            <Image
              src={club.logo}
              alt={club.label}
              width={64}
              height={64}
              unoptimized
              className="size-[95%] object-contain"
            />
          </div>
        )}

        {/* Avatar character — pushed down so the body is partially clipped by
            the bottom of the card (matches the profile-page look).
            Opponent gets -scale-x so they face the player on the left. */}
        <AvatarPreview
          customization={avatarCustomization}
          width={170}
          className={`md:hidden translate-y-5 ${isOpponent ? '-scale-x-100' : ''}`}
        />
        <AvatarPreview
          customization={avatarCustomization}
          width={210}
          className={`hidden md:block translate-y-7 ${isOpponent ? '-scale-x-100' : ''}`}
        />
      </motion.div>

      {/* RP pill */}
      {info.rankPoints !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-4 flex h-10 w-[180px] items-center justify-center rounded-[14px] bg-brand-yellow text-[18px] uppercase text-surface-page sm:h-12 sm:w-[220px] sm:text-[22px] md:w-[260px] md:text-[24px]"
          style={poppins}
        >
          {info.rankPoints} RP
        </motion.div>
      )}

      {/* Username */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-4 max-w-[260px] truncate text-center text-2xl uppercase text-white sm:text-3xl"
        style={poppins}
      >
        {info.username}
      </motion.div>

      {/* Tier name (replaces the fan-text from the figma) */}
      {info.tier && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.95 }}
          className="mt-1.5 text-sm uppercase sm:text-base"
          style={{ ...poppins, color: tierAccent }}
        >
          {info.tier}
        </motion.div>
      )}

      {/* Recent form — last 3 matches, most recent first */}
      {info.recentForm && info.recentForm.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05 }}
          className="mt-2 flex items-center gap-1"
        >
          {info.recentForm.slice(0, 3).map((result, idx) => (
            <span
              key={idx}
              className={`flex size-6 items-center justify-center rounded-md text-[11px] uppercase text-white sm:size-7 sm:text-[12px] ${
                result === 'W'
                  ? 'bg-brand-green'
                  : result === 'L'
                    ? 'bg-brand-red'
                    : 'bg-brand-slate'
              }`}
              style={poppins}
              title={result === 'W' ? 'Win' : result === 'L' ? 'Loss' : 'Draw'}
            >
              {result}
            </span>
          ))}
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
  wrapperClassName = 'min-h-screen',
}: ShowdownScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 4500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const playerData: ShowdownPlayerInfo = { ...playerInfo, username: playerUsername, avatar: playerAvatar };
  const opponentData: ShowdownPlayerInfo = { ...opponentInfo, username: opponentUsername, avatar: opponentAvatar };
  const isRanked = matchType === 'ranked';
  const accentMatch = '#1645FF';

  return (
    <div className={`relative flex flex-col items-center justify-center overflow-hidden bg-surface-page px-4 ${wrapperClassName}`}>
      <div className="relative z-10 grid w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-start gap-4 sm:gap-8 md:gap-12">
        <div className="flex justify-center">
          <PlayerSide info={playerData} side="left" />
        </div>

        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 15 }}
          className="flex flex-col items-center self-center text-center"
        >
          <span
            className="text-6xl uppercase text-white sm:text-7xl md:text-8xl"
            style={poppins}
          >
            VS
          </span>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="mt-5 text-lg uppercase text-white sm:text-xl md:text-2xl"
            style={poppins}
          >
            {isRanked ? 'Ranked Match' : 'Friendly Match'}{' '}
            <span style={{ color: accentMatch }}>1v1</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ delay: 1.2, duration: 2, repeat: Infinity }}
            className="mt-2 text-[11px] uppercase tracking-[0.16em] text-white/55 sm:text-xs"
            style={poppins}
          >
            Get ready for kickoff
          </motion.div>
        </motion.div>

        <div className="flex justify-center">
          <PlayerSide info={opponentData} side="right" />
        </div>
      </div>
    </div>
  );
}
