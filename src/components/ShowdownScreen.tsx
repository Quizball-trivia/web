"use client";

import Image from 'next/image';
import { useEffect } from 'react';
import { motion } from 'motion/react';
import { AvatarPreview } from '@/components/AvatarPreview';
import { CountryFlag } from '@/components/CountryFlag';
import type { AvatarCustomization } from '@/types/game';
import { getTierAccent, getTierFrameSrc } from '@/utils/tierVisuals';
import { getClub } from '@/lib/clubs';
import { normalizeCountryCode } from '@/lib/geo/countryCode';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';

// Standing avatar character displayed inside its tier rank frame. The frame IS
// the card; the flag sits top-left and the club badge top-right, both inside
// the frame. The character stands in the frame's body.
function FramedAvatar({
  frameSrc,
  customization,
  countryCode,
  club,
  width,
  mirror,
  className,
}: {
  frameSrc: string;
  customization: AvatarCustomization;
  countryCode?: string | null;
  club?: ReturnType<typeof getClub>;
  width: number;
  mirror?: boolean;
  className?: string;
}) {
  const frameW = width;
  // Match the actual rank-frame PNG canvas aspect (~h/w 1.58) so the character
  // and badge overlays don't drift across screen sizes.
  const frameH = Math.round(frameW * 1.58);
  const chipW = Math.round(frameW * 0.22);
  return (
    <div className={cn('relative', className)} style={{ width: frameW, height: frameH }}>
      {/* Frame — the card backdrop (solid artwork, sits behind everything) */}
      <Image
        src={frameSrc}
        alt=""
        width={frameW}
        height={frameH}
        className="absolute inset-0 z-0 h-full w-full object-contain pointer-events-none"
      />
      {/* Character — ON TOP of the frame, centered in the frame body */}
      <div className="absolute inset-x-0 bottom-[8%] top-[22%] z-10 flex items-end justify-center overflow-hidden">
        <AvatarPreview
          customization={customization}
          width={Math.round(frameW * 0.64)}
          className={cn(mirror && '-scale-x-100')}
        />
      </div>
      {/* Flag — top-left, circular, slightly inset so the design fits the circle */}
      {countryCode && (
        <div
          className="absolute left-[11%] top-[11%] z-20 flex items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
          style={{ width: chipW, height: chipW }}
        >
          <CountryFlag
            code={countryCode}
            className="!h-[78%] !w-[78%] rounded-sm"
            style={{ backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}
          />
        </div>
      )}
      {/* Club badge — top-right, circular, no background (just the logo) */}
      {club && (
        <div
          className="absolute right-[11%] top-[11%] z-20 flex items-center justify-center"
          style={{ width: chipW, height: chipW }}
        >
          <Image
            src={club.logo}
            alt={club.label}
            width={64}
            height={64}
            unoptimized
            className="size-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
          />
        </div>
      )}
    </div>
  );
}

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
  const countryCode = normalizeCountryCode(info.countryCode ?? info.country);
  const club = getClub(info.favoriteClub ?? null);
  const tierAccent = info.tier ? getTierAccent(info.tier) : '#FFE500';

  // Opponent (right side) faces the player — flip horizontally per Figma.
  const isOpponent = side === 'right';
  const avatarCustomization = info.avatarCustomization ?? { base: info.avatar || 'avatar-1' };
  const frameSrc = getTierFrameSrc(info.tier ?? 'Academy');
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
            ? "relative flex w-[210px] sm:w-[250px] items-center justify-center"
            : "relative flex w-[150px] sm:w-[250px] md:w-[300px] items-center justify-center"
        }
      >
        {/* Rank-frame avatar — frame is the card; flag + club sit inside it. */}
        {isVertical ? (
          <FramedAvatar
            frameSrc={frameSrc}
            customization={avatarCustomization}
            countryCode={countryCode}
            club={club}
            width={210}
            mirror={isOpponent}
          />
        ) : (
          <>
            <FramedAvatar
              frameSrc={frameSrc}
              customization={avatarCustomization}
              countryCode={countryCode}
              club={club}
              width={150}
              mirror={isOpponent}
              className="sm:hidden"
            />
            <FramedAvatar
              frameSrc={frameSrc}
              customization={avatarCustomization}
              countryCode={countryCode}
              club={club}
              width={250}
              mirror={isOpponent}
              className="hidden sm:block md:hidden"
            />
            <FramedAvatar
              frameSrc={frameSrc}
              customization={avatarCustomization}
              countryCode={countryCode}
              club={club}
              width={300}
              mirror={isOpponent}
              className="hidden md:block"
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
