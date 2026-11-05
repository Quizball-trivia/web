'use client';

/**
 * Shared bits of the searching-screen directions (dev: /dev/zone-match/search): the props every direction takes, the
 * search clock, generated rival seats (for reels and silhouettes), and the "match found" versus moment.
 */

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { AvatarCustomization } from '@/types/game';
import { HAIR_PARTS, RANDOM_JERSEY_IDS, SKIN_PARTS } from '@/lib/avatars/parts';
import { FutCard, type FutSeat } from '../ZoneMatchFutCard';
import type { CardId } from '../zoneMatch.cards';

export interface SearchScreenProps {
  self: FutSeat;
  /** The playstyles picked in the loadout. */
  deck: CardId[];
  /** When the search started (ms, Date.now clock). */
  startedAt: number;
  /** Set once someone is found. */
  opponent: FutSeat | null;
  opponentDeck?: CardId[];
  onCancel: () => void;
}

/** Seconds searched so far, ticking. */
export function useSearchSeconds(startedAt: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

export const clockText = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const NAMES = ['Kvara77', 'ElTitan', 'BlueMoon', 'NetBuster', 'Tbilisi9', 'Rabona', 'SambaKid', 'Volley_X', 'CaptainZ', 'NumberTen', 'Panenka', 'TikiTaka8'];

/** A rival seat from a seed: random skin, jersey, hair, name and RP (bots, reels, silhouettes). */
export function randomSeat(seed: number): FutSeat {
  const pick = <T,>(list: readonly T[], k: number) => list[Math.abs(Math.imul(seed + k, 2654435761)) % list.length];
  const avatar: AvatarCustomization = {
    skin: pick(SKIN_PARTS, 1).id,
    jersey: pick(RANDOM_JERSEY_IDS, 2),
    hair: pick(HAIR_PARTS, 3).id,
  } as AvatarCustomization;
  return { name: pick(NAMES, 4), avatarCustomization: avatar, rankPoints: 200 + (Math.abs(Math.imul(seed, 7919)) % 1400) };
}

export function CancelButton({ onCancel, className = '' }: { onCancel: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onCancel}
      className={`inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white backdrop-blur hover:bg-white/20 ${className}`}
    >
      <X className="size-4" /> Cancel
    </button>
  );
}

/** Match found: the two FUT cards slam in from the sides with a VS between them. */
export function VersusReveal({ self, deck, opponent, opponentDeck = [], width = 200 }: { self: FutSeat; deck: CardId[]; opponent: FutSeat; opponentDeck?: CardId[]; width?: number }) {
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-10">
      <motion.div initial={{ x: -260, opacity: 0, rotate: -8 }} animate={{ x: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
        <FutCard seat={self} width={width} slots={[deck[0] ?? null, deck[1] ?? null, deck[2] ?? null]} />
      </motion.div>
      <motion.div
        initial={{ scale: 3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 14 }}
        className="font-black italic text-brand-yellow drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]"
        style={{ fontSize: width * 0.32 }}
      >
        VS
      </motion.div>
      <motion.div initial={{ x: 260, opacity: 0, rotate: 8 }} animate={{ x: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
        {/* The rival's playstyles stay hidden until the reveal. */}
        <FutCard seat={opponent} width={width} slots={[opponentDeck[0] ?? null, opponentDeck[1] ?? null, opponentDeck[2] ?? null]} mirror />
      </motion.div>
    </div>
  );
}
