'use client';

/**
 * The zone match's categories: both sides' five random categories revealed like a pack opening (cards flip one by one,
 * you on one side, them on the other, the same size), the kick-off board after it, and the category tile the attacker
 * picks from at the start of each round (ZoneMatchStage).
 */

/* eslint-disable @next/next/no-img-element -- Category art is a remote image of unknown size. */

import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TierFrameAvatar } from '@/components/TierFrameAvatar';
import { tierFromRp } from '@/utils/rankedTier';
import type { DuelSide } from '@/features/numeric-question/numericDuel';
import type { Category } from './zoneMatch.machine';
import type { RevealSeat } from './ZoneMatchCards';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;
// Raw colours live in style objects (the brand-colour audit forbids hex Tailwind classes).
const SIDE_GRADIENT: Record<DuelSide, string> = {
  player: 'linear-gradient(160deg, #1CB0F6 0%, #1645FF 100%)',
  opponent: 'linear-gradient(160deg, #FF4B4B 0%, #B8401D 100%)',
};
const CARD_BACK = 'repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0 6px, transparent 6px 12px)';

/** A category as a playing-card tile: art (or icon) and name; `used` stamps it, `muted` greys it. */
export function CategoryTile({
  category,
  side,
  used = false,
  muted = false,
  selected = false,
  layoutId,
  className,
}: {
  category: Category;
  side: DuelSide;
  used?: boolean;
  muted?: boolean;
  selected?: boolean;
  /** Shared-element id: the tile flies into the duel banner when picked. */
  layoutId?: string;
  className?: string;
}) {
  return (
    <motion.div
      layoutId={layoutId}
      className={cn(
        'relative flex aspect-[3/4] flex-col items-center justify-between overflow-hidden rounded-2xl p-1 text-white sm:p-1.5 shadow-[0_6px_16px_rgba(0,0,0,0.35)] ring-2',
        selected ? 'ring-brand-yellow' : 'ring-white/15',
        (used || muted) && 'opacity-45 grayscale',
        className,
      )}
      style={{ background: SIDE_GRADIENT[side] }}
    >
      <div className="grid w-full flex-1 place-items-center overflow-hidden rounded-xl bg-black/15">
        {category.imageUrl ? (
          <img src={category.imageUrl} alt="" className="size-full object-cover" draggable={false} />
        ) : (
          <span className="text-[min(9vw,40px)] leading-none">{category.icon ?? '❓'}</span>
        )}
      </div>
      <div className="mt-1 line-clamp-2 min-h-[2.2em] w-full text-center text-[7.5px] uppercase leading-tight tracking-[-0.02em] min-[400px]:text-[8.5px] sm:text-[11px] sm:tracking-normal" style={poppins}>
        {category.name}
      </div>
      {used && (
        <span className="absolute inset-x-0 top-[38%] flex justify-center">
          <span className="-rotate-12 rounded-md bg-surface-page/90 px-2 py-0.5 text-[10px] font-black uppercase text-white ring-1 ring-white/40">
            <Check className="mr-0.5 inline size-3" strokeWidth={4} />
            Used
          </span>
        </span>
      )}
    </motion.div>
  );
}

/** One card of the pack: its back first, then it flips over to the category. */
function FlipCard({ category, side, delay }: { category: Category; side: DuelSide; delay: number }) {
  return (
    <div className="relative" style={{ perspective: 700 }}>
      <motion.div
        className="relative"
        style={{ transformStyle: 'preserve-3d' }}
        initial={{ rotateY: 180, y: 40, opacity: 0, scale: 0.8 }}
        animate={{ rotateY: 0, y: 0, opacity: 1, scale: [0.8, 1.08, 1] }}
        transition={{ delay, duration: 0.7, ease: 'easeOut' }}
      >
        <div style={{ backfaceVisibility: 'hidden' }}>
          <CategoryTile category={category} side={side} />
        </div>
        {/* The back, seen until the flip passes 90°. */}
        <div
          className="absolute inset-0 grid place-items-center rounded-2xl ring-2 ring-white/20"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: `${CARD_BACK}, ${SIDE_GRADIENT[side]}` }}
        >
          <img src="/assets/brand/ball.webp" alt="" className="size-8 opacity-80" draggable={false} />
        </div>
      </motion.div>
      {/* A flash as the card lands face up. */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.85), transparent 65%)' }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.25, 1.4] }}
        transition={{ delay: delay + 0.45, duration: 0.55 }}
      />
    </div>
  );
}

function SeatHead({ seat, side }: { seat: RevealSeat; side: DuelSide }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <TierFrameAvatar tier={tierFromRp(seat.rankPoints ?? 0)} avatarCustomization={seat.avatarCustomization ?? undefined} size="sm" mirrorAvatar={side === 'opponent'} />
      <span className={cn('truncate text-lg uppercase', side === 'player' ? 'text-brand-blue' : 'text-brand-red-soft')} style={poppins}>
        {side === 'player' ? 'You' : seat.name}
      </span>
    </div>
  );
}

/** Both sides' five categories, opened like packs: yours first, then theirs; then a 5-second countdown to kick-off. */
export function CategoriesReveal({
  categories,
  seats,
  timeLeft,
}: {
  categories: Record<DuelSide, Category[]>;
  seats: Record<DuelSide, RevealSeat>;
  timeLeft: number | null;
}) {
  // The packs open once the phase curtain has lifted.
  const start = 2.8;
  return (
    <div className="flex flex-col gap-4 pb-6" data-zm-categories>
      <div className="text-center">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-brand-yellow">Your categories</div>
        <div className="text-3xl uppercase text-white" style={poppins}>5 each · one per attack</div>
        <div className="mt-1 text-xs font-black uppercase tracking-wide text-white/50">
          Before each of your attacks you pick one of yours · every question of that attack comes from it
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-start">
        {(['player', 'opponent'] as const).map((side, s) => (
          <section key={side} className={cn('rounded-[28px] bg-surface-page/90 p-3 ring-1 sm:p-4', side === 'player' ? 'ring-brand-blue/40 md:order-1' : 'ring-brand-red-soft/40 md:order-3')}>
            <div className="mb-3">
              <SeatHead seat={seats[side]} side={side} />
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {categories[side].map((category, i) => (
                <FlipCard key={category.id} category={category} side={side} delay={start + s * 1.6 + i * 0.22} />
              ))}
            </div>
          </section>
        ))}
        <div className="hidden self-center text-3xl font-black italic text-white/25 md:order-2 md:block" style={poppins}>VS</div>
      </div>
      <div className="flex justify-center">
        <div className="rounded-full bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-wide text-white/75" style={poppins}>
          {timeLeft !== null && timeLeft <= 5 ? `Kick-off in ${timeLeft}` : 'Dealing categories…'}
        </div>
      </div>
    </div>
  );
}
