'use client';

/** Player profile card, Quizball-showdown style in TD skin: character
 *  avatar with the favorite club's crest, points pill (qualification
 *  points — TD's rank points), and the username. */

import { motion } from 'motion/react';
import { AvatarPreview } from '@/components/AvatarPreview';
import { getClub, clubs } from '@/lib/clubs';
import type { AvatarColor } from '@/lib/avatars';
import { AVATAR_COLORS } from '@/lib/avatars';
import { TD } from '../lib/copy';
import { TD_DISPLAY } from './brand';
import { tdAvatarCustomization } from './Avatar';
import { ClubCrest } from './ClubCrest';

function hashName(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return h;
}

/** Deterministic mock identity bits for opponents (until the backend
 *  serves real profiles). */
export function opponentProfile(name: string) {
  const h = hashName(name);
  return {
    color: AVATAR_COLORS[h % AVATAR_COLORS.length],
    clubValue: clubs[h % clubs.length]?.value ?? null,
    points: 40 + (h % 210),
  };
}

export function TdProfileCard({
  name,
  color,
  clubValue,
  points,
  mirror = false,
  delay = 0,
}: {
  name: string;
  color: AvatarColor;
  clubValue?: string | null;
  points: number;
  /** Opponent side — character faces the other player. */
  mirror?: boolean;
  delay?: number;
}) {
  const club = clubValue ? getClub(clubValue) : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 26, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', damping: 15 }}
      className="relative flex w-[158px] flex-col items-center rounded-[16px] px-3 pb-3 pt-4 md:w-[180px]"
      style={{
        background: 'var(--td-charcoal)',
        boxShadow: '5px 6px 0 rgba(0,0,0,0.55)',
        transform: `rotate(${mirror ? 1.5 : -1.5}deg)`,
      }}
    >
      {/* favourite club crest — a chip on the card's corner, clear of the avatar */}
      {club && <ClubCrest src={club.logo} size={40} className="absolute -right-3 -top-3 z-10" />}
      <div className={mirror ? '-scale-x-100' : undefined}>
        <AvatarPreview customization={tdAvatarCustomization(color)} width={104} />
      </div>
      {/* points pill — TD's rank points (qualification points) */}
      <div
        className="mt-2 flex h-8 w-full items-center justify-center rounded-[9px] text-[14px] md:text-[15px]"
        style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d' }}
      >
        {points} {TD.qpShort}
      </div>
      {/* Mtavruli caps are taller than the display leading; truncate clips
          overflow, so this line gets room of its own */}
      <p className="mt-1.5 w-full truncate py-0.5 text-center text-[14px] text-white md:text-[15px]" style={{ ...TD_DISPLAY, lineHeight: 1.3 }}>
        {name}
      </p>
    </motion.div>
  );
}
