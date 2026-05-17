"use client";

import Image from 'next/image';
import { useEffect } from 'react';
import { motion } from 'motion/react';
import { AvatarPreview } from '@/components/AvatarPreview';
import { CountryFlag } from '@/components/CountryFlag';
import type { AvatarCustomization } from '@/types/game';
import { getTierAccent } from '@/utils/tierVisuals';
import { getClub } from '@/lib/clubs';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';

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
  /** Layout orientation:
   *    - `auto` (default) = picks vertical on mobile, horizontal on desktop
   *    - `horizontal` = always side-by-side (production desktop)
   *    - `vertical` = always stacked top-to-bottom (mobile / dev preview)
   */
  variant?: 'horizontal' | 'vertical' | 'auto';
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
  variant = 'horizontal',
  reversed = false,
}: {
  info: ShowdownPlayerInfo;
  side: 'left' | 'right';
  variant?: 'horizontal' | 'vertical';
  /** When true, render in reverse order (card at bottom, text at top) and
   *  flip the avatar character vertically so the player visually "faces"
   *  the other side. Used by the opponent in the vertical layout so they
   *  appear to look down at the player below. */
  reversed?: boolean;
}) {
  const countryCode = info.countryCode ?? (info.country?.length === 2 ? info.country : null);
  const club = getClub(info.favoriteClub ?? null);
  const tierAccent = info.tier ? getTierAccent(info.tier) : '#FFE500';

  // Opponent (right side) faces the player — flip horizontally per Figma.
  const isOpponent = side === 'right';
  const avatarCustomization = info.avatarCustomization ?? { base: info.avatar || 'avatar-1' };
  const isVertical = variant === 'vertical';

  // Vertical variant enters from top/bottom instead of left/right.
  const enterFrom = isVertical
    ? { y: reversed ? -180 : 180, opacity: 0 }
    : { x: side === 'left' ? -180 : 180, opacity: 0 };
  const enterTo = isVertical ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 };

  // Reference reversed so the prop isn't flagged unused. Both sides now
  // share the same content order (card → stats), so reversed only
  // affects the entrance direction above.
  void reversed;

  return (
    <motion.div
      initial={enterFrom}
      animate={enterTo}
      transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 18 }}
      className="flex flex-col items-center"
    >
      {/* Avatar card — 5:6 aspect, character bottom-anchored per Figma.
          Vertical variant sized so two cards + VS divider fit a 700px
          tall mobile viewport without scrolling (card ≈ 160×192, plus
          80px metadata per side + 80px VS area = ~624px). */}
      <motion.div
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        className={
          isVertical
            ? "relative flex aspect-[5/6] w-[180px] sm:w-[220px] items-end justify-center overflow-hidden rounded-[20px] bg-brand-blue"
            : "relative flex aspect-[5/6] w-[112px] sm:w-[200px] md:w-[240px] items-end justify-center overflow-hidden rounded-[16px] sm:rounded-[20px] bg-brand-blue"
        }
      >
        {/* Country flag chip — top-left, rounded-br/tl. Chip is 3:2 to match
            the flag-icons SVG aspect exactly so no background bleeds through. */}
        {countryCode && (
          <div
            className={
              isVertical
                ? "absolute left-0 top-0 z-10 flex h-[40px] w-[60px] items-center justify-center overflow-hidden rounded-br-[16px] rounded-tl-[20px]"
                : "absolute left-0 top-0 z-10 flex h-[26px] w-[39px] items-center justify-center overflow-hidden rounded-br-[12px] rounded-tl-[16px] sm:h-[44px] sm:w-[66px] sm:rounded-br-[20px] sm:rounded-tl-[20px] md:h-[56px] md:w-[84px]"
            }
          >
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
            className={
              isVertical
                ? "absolute right-0 top-0 z-10 flex size-[48px] items-center justify-center overflow-hidden rounded-bl-[16px] rounded-tr-[20px]"
                : "absolute right-0 top-0 z-10 flex size-[30px] items-center justify-center overflow-hidden rounded-bl-[12px] rounded-tr-[16px] sm:size-[52px] sm:rounded-bl-[20px] sm:rounded-tr-[20px] md:size-[64px]"
            }
            style={{ backgroundColor: club.primaryColor }}
          >
            <Image
              src={club.logo}
              alt={club.label}
              width={48}
              height={48}
              unoptimized
              className="size-[95%] object-contain"
            />
          </div>
        )}

        {/* Avatar character — pushed down so the body is partially clipped
            by the bottom of the card. Both avatars stay upright (no Y-flip)
            even when reversed — only horizontal mirror so the opponent
            still "faces" inward. */}
        {isVertical ? (
          <AvatarPreview
            customization={avatarCustomization}
            width={170}
            className={cn(
              'translate-y-6',
              isOpponent && '-scale-x-100',
            )}
          />
        ) : (
          <>
            <AvatarPreview
              customization={avatarCustomization}
              width={96}
              className={`sm:hidden translate-y-3 ${isOpponent ? '-scale-x-100' : ''}`}
            />
            <AvatarPreview
              customization={avatarCustomization}
              width={170}
              className={`hidden sm:block md:hidden translate-y-5 ${isOpponent ? '-scale-x-100' : ''}`}
            />
            <AvatarPreview
              customization={avatarCustomization}
              width={210}
              className={`hidden md:block translate-y-7 ${isOpponent ? '-scale-x-100' : ''}`}
            />
          </>
        )}
      </motion.div>

      {/* RP pill — bigger top margin in vertical so there's breathing room
          between the avatar card and the start of the stats block. */}
      {info.rankPoints !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className={
            isVertical
              ? "mt-4 flex h-10 w-[170px] items-center justify-center rounded-[12px] bg-brand-yellow text-[17px] uppercase text-surface-page"
              : "mt-2 sm:mt-4 flex h-7 w-[100px] items-center justify-center rounded-[10px] bg-brand-yellow text-[12px] uppercase text-surface-page sm:h-12 sm:w-[220px] sm:rounded-[14px] sm:text-[22px] md:w-[260px] md:text-[24px]"
          }
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
        className={
          isVertical
            ? "mt-2 max-w-[200px] truncate text-center text-[19px] uppercase text-white"
            : "mt-2 sm:mt-4 max-w-[120px] truncate text-center text-sm uppercase text-white sm:max-w-[260px] sm:text-3xl"
        }
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
          className={
            isVertical
              ? "mt-1 text-[13px] uppercase"
              : "mt-1 text-[11px] uppercase sm:mt-1.5 sm:text-base"
          }
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
          className={isVertical ? "mt-2 flex items-center gap-1.5" : "mt-1.5 flex items-center gap-1 sm:mt-2"}
        >
          {info.recentForm.slice(0, 3).map((result, idx) => (
            <span
              key={idx}
              className={`flex items-center justify-center uppercase text-white ${
                isVertical
                  ? 'size-7 rounded-md text-[12px]'
                  : 'size-5 rounded text-[10px] sm:size-7 sm:rounded-md sm:text-[12px]'
              } ${
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
  variant = 'auto',
}: ShowdownScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 4500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  // Auto-pick layout: mobile → vertical (stack), desktop → horizontal (side-by-side).
  // Callers can force either via the explicit prop.
  const isMobile = useIsMobile();
  const resolvedVariant = variant === 'auto' ? (isMobile ? 'vertical' : 'horizontal') : variant;

  const playerData: ShowdownPlayerInfo = { ...playerInfo, username: playerUsername, avatar: playerAvatar };
  const opponentData: ShowdownPlayerInfo = { ...opponentInfo, username: opponentUsername, avatar: opponentAvatar };
  const isRanked = matchType === 'ranked';
  const accentMatch = '#1645FF';
  const isVertical = resolvedVariant === 'vertical';

  // ── Vertical variant — opponent on top with reversed content order
  // (text above card, card just above the VS divider). Player on bottom
  // with normal order (card just below VS, text below). Both upright,
  // nothing rotated — everything reads naturally and the cards "meet"
  // at the VS in the middle. Sized to fit a ~700px tall mobile viewport
  // without scrolling.
  if (isVertical) {
    return (
      <div className={`relative flex flex-col items-center justify-center overflow-hidden bg-surface-page px-4 ${wrapperClassName}`}>
        <div className="relative z-10 flex flex-col items-center justify-center gap-5 py-6">
          {/* Opponent on top — same content order as the player (card → stats)
              so the stats appear BELOW the avatar on both sides. `reversed`
              only controls the entrance direction (slides in from above). */}
          <PlayerSide info={opponentData} side="right" variant="vertical" reversed />

          {/* VS divider */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 15 }}
            className="flex flex-col items-center text-center"
          >
            <span className="text-4xl uppercase text-white" style={poppins}>
              VS
            </span>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="mt-1.5 text-[13px] uppercase text-white"
              style={poppins}
            >
              {isRanked ? 'Ranked' : 'Friendly'}{' '}
              <span style={{ color: accentMatch }}>1v1</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{ delay: 1.2, duration: 2, repeat: Infinity }}
              className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/55"
              style={poppins}
            >
              Get ready for kickoff
            </motion.div>
          </motion.div>

          {/* Player on bottom, normal order (card top, text bottom). */}
          <PlayerSide info={playerData} side="left" variant="vertical" />
        </div>
      </div>
    );
  }

  // ── Horizontal variant (default — used in production) ────────────────
  return (
    <div className={`relative flex flex-col items-center justify-center overflow-hidden bg-surface-page px-2 sm:px-4 ${wrapperClassName}`}>
      <div className="relative z-10 grid w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-start gap-1.5 sm:gap-8 md:gap-12">
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
            className="text-3xl uppercase text-white sm:text-7xl md:text-8xl"
            style={poppins}
          >
            VS
          </span>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="mt-2 text-[10px] uppercase text-white sm:mt-5 sm:text-xl md:text-2xl"
            style={poppins}
          >
            {isRanked ? 'Ranked' : 'Friendly'}{' '}
            <span style={{ color: accentMatch }}>1v1</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ delay: 1.2, duration: 2, repeat: Infinity }}
            className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/55 sm:mt-2 sm:text-xs sm:tracking-[0.16em]"
            style={poppins}
          >
            <span className="sm:hidden">Kickoff</span>
            <span className="hidden sm:inline">Get ready for kickoff</span>
          </motion.div>
        </motion.div>

        <div className="flex justify-center">
          <PlayerSide info={opponentData} side="right" />
        </div>
      </div>
    </div>
  );
}
