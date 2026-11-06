'use client';

/**
 * The compact way a playstyle is described in lists — the loadout tiles, the showdown's two loadouts and the in-match
 * "Them" sheet: name and cost, what it does in a few words (type colour), when / who chips, and the full rule text
 * only on demand.
 */

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Check, Info, X, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CARD_BY_ID, type CardDef, type CardId, type CardType } from './zoneMatch.cards';
import { CARD_TYPE_THEME, PHASE_INFO, PlaystyleBadge, ROLE_INFO } from './ZoneMatchCardFace';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

/** Each type's colour lifted for small text on the dark surfaces (the blue and red are too deep as they are). */
export const TYPE_INK: Record<CardType, string> = { boost: '#58CC02', sabotage: '#FF8A8A', defense: '#7FD6FF', tactical: '#FFC800' };
/** The phase chip's icon colour: blind picks stay muted, the in-question and reaction ones stand out. */
const phaseColor = (card: CardDef) => (card.phase === 'blind' ? '#9CB6C2' : '#FFE500');

export function Cost({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-0.5 rounded-full bg-brand-yellow px-1.5 py-0.5 text-[11px] font-black leading-none text-surface-page', className)}>
      <Zap className="size-2.5 fill-current" />
      {value}
    </span>
  );
}

export function TileChip({ Icon, label, color }: { Icon: LucideIcon; label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-white/75">
      <Icon className="size-3 shrink-0" style={{ color }} />
      {label}
    </span>
  );
}

/**
 * Name with its cost, the short effect, and the when / who chips (plus any `tags`). `dense` is for narrow side-by-side
 * columns: from sm the effect and chips share a line; below sm the cost chip and the when / who chips drop out (the
 * badge's gem carries the cost, the rules panel the rest).
 */
export function PlaystyleText({ card, tags, dense = false }: { card: CardDef; tags?: ReactNode; dense?: boolean }) {
  const phase = PHASE_INFO[card.phase];
  const role = ROLE_INFO[card.role];
  const split = card.name.lastIndexOf(' ') + 1;
  const short = (
    <span className={cn('font-black uppercase leading-tight tracking-wide', dense ? 'text-[10px] sm:text-xs' : 'text-xs')} style={{ color: TYPE_INK[card.type] }}>
      {card.short}
    </span>
  );
  const chips = (
    <span className={cn('contents', dense && 'max-sm:hidden')}>
      <TileChip Icon={phase.Icon} label={phase.label} color={phaseColor(card)} />
      <TileChip Icon={role.Icon} label={role.label} color={CARD_TYPE_THEME[card.type].color} />
    </span>
  );
  return (
    <span className={cn('flex min-w-0 flex-1 flex-col', dense ? 'gap-0.5 sm:gap-1' : 'gap-1')}>
      <span className={cn('uppercase leading-tight text-white', dense ? 'text-xs sm:text-[15px]' : 'text-[15px]')} style={poppins}>
        {card.name.slice(0, split)}
        {/* The cost stays with the last word, so a wrapped name never leaves it alone on a line (dense phones show no cost
            chip, and a long hyphenated word must be free to break there). */}
        <span className={dense ? 'sm:whitespace-nowrap' : 'whitespace-nowrap'}>
          {card.name.slice(split)}
          <Cost value={card.energy} className={cn('ml-1.5 align-[2px]', dense && 'max-sm:hidden')} />
        </span>
      </span>
      {dense ? (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {short}
          {chips}
          {tags}
        </span>
      ) : (
        <>
          {short}
          <span className="flex flex-wrap items-center gap-1">
            {chips}
            {tags}
          </span>
        </>
      )}
    </span>
  );
}

/** The full rule: the effect, and when / who spelled out. */
export function PlaystyleRules({ card, className }: { card: CardDef; className?: string }) {
  const phase = PHASE_INFO[card.phase];
  const role = ROLE_INFO[card.role];
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <p className="text-[13px] leading-snug text-white/90">{card.effect}</p>
      <div className="flex flex-col gap-1 text-[11px] leading-snug text-white/60">
        <span className="flex items-center gap-1.5">
          <phase.Icon className="size-3.5 shrink-0" style={{ color: phaseColor(card) }} /> {phase.long}
        </span>
        <span className="flex items-center gap-1.5">
          <role.Icon className="size-3.5 shrink-0" style={{ color: CARD_TYPE_THEME[card.type].color }} /> {role.long}
        </span>
      </div>
    </div>
  );
}

/** The ⓘ / ✕ mark of a row whose rules can open. */
export function InfoMark({ open, className }: { open: boolean; className?: string }) {
  return (
    <span className={cn('grid size-7 shrink-0 place-items-center rounded-full transition', open ? 'bg-white text-surface-page' : 'text-white/45', className)}>
      {open ? <X className="size-3.5" strokeWidth={3} /> : <Info className="size-4" />}
    </span>
  );
}

/**
 * A playstyle as a read-only row (showdown, the opponent's sheet): badge, the compact text, and a tap anywhere to open
 * its full rule. `used` greys it out with a stamp. `fill` stretches it to its grid cell, so paired rows match.
 */
export function PlaystyleRow({
  id,
  open,
  onToggle,
  used = false,
  dense = false,
  fill = false,
  badgeSize = 56,
  reveal,
  className,
}: {
  id: CardId;
  open: boolean;
  onToggle: () => void;
  used?: boolean;
  dense?: boolean;
  fill?: boolean;
  badgeSize?: number;
  /** Pops the row in after `delay` seconds. */
  reveal?: { delay: number; from: number };
  className?: string;
}) {
  const card = CARD_BY_ID[id];
  return (
    <motion.div
      className={cn('relative overflow-hidden rounded-2xl bg-white/[0.04]', fill && 'h-full', className)}
      style={{ backgroundImage: `linear-gradient(90deg, ${CARD_TYPE_THEME[card.type].color}22, transparent 45%)` }}
      initial={reveal ? { opacity: 0, x: reveal.from, scale: 0.96 } : false}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: reveal?.delay ?? 0, type: 'spring', stiffness: 280, damping: 22 }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        title={card.effect}
        className={cn('flex w-full items-center text-left', dense ? 'gap-2 p-1.5 sm:gap-3 sm:p-2.5' : 'gap-3 p-2.5')}
      >
        <PlaystyleBadge id={id} size={badgeSize} showName={false} used={used} />
        <span className={cn('flex min-w-0 flex-1', used && 'opacity-50')}>
          <PlaystyleText
            card={card}
            dense={dense}
            tags={
              used ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-black uppercase leading-none text-white/70">
                  <Check className="size-2.5" strokeWidth={4} /> Used
                </span>
              ) : undefined
            }
          />
        </span>
        <InfoMark open={open} className={cn('self-start', dense && 'max-sm:hidden')} />
      </button>
      {open && <PlaystyleRules card={card} className={cn('border-t border-white/10 pb-3 pt-2.5', dense ? 'px-2 sm:px-3' : 'px-3')} />}
    </motion.div>
  );
}
