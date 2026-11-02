'use client';

/* eslint-disable @next/next/no-img-element -- Card art is a fixed local set; the shield mask needs a plain <img>. */

/**
 * A Card Clash card in the owner's QuizBall theme (the artifact's default look): the shield-shaped card and a
 * type-colour gradient with a faint ring pattern. Instead of the artifact's character art, each card shows a pictogram
 * of what it does (a bus, gloves, a flag…) and a big headline, so it reads at a glance; the dark panel adds the name and
 * when/who chips. Everything scales from `width` (font-size = width / 15), so one design serves the deck builder, the
 * reveals and the hand. Shape: public/assets/card-clash/card-shape.png (from the Card Clash artifact).
 */

import { useId, type CSSProperties, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowBigRightDash,
  ArrowLeftRight,
  ArrowUpDown,
  Bomb,
  Brain,
  Bus,
  Check,
  CloudFog,
  EyeOff,
  Flag,
  Goal,
  Hand,
  House,
  LightbulbOff,
  MonitorPlay,
  Rocket,
  RotateCcw,
  Shield,
  ShieldCheck,
  ShieldHalf,
  Shuffle,
  Swords,
  Timer,
  VenetianMask,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CARD_BY_ID, type CardDef, type CardId, type CardPhase, type CardRole, type CardType } from './zoneMatch.cards';

type Icon = typeof Zap;

/** The artifact's QuizBall palette per card type; `ink` is the readable text colour on `color`. */
export const CARD_TYPE_THEME: Record<CardType, { label: string; color: string; ink: string; deep: string; grad: [string, string]; Icon: Icon }> = {
  boost: { label: 'Boost', color: '#58CC02', ink: '#071013', deep: '#1F6B06', grad: ['#85E000', '#2D950B'], Icon: Rocket },
  sabotage: { label: 'Sabotage', color: '#FF4B4B', ink: '#FFFFFF', deep: '#8A1F1F', grad: ['#FF6B6B', '#B8401D'], Icon: Bomb },
  defense: { label: 'Defense', color: '#1CB0F6', ink: '#FFFFFF', deep: '#0B2FA8', grad: ['#1CB0F6', '#1645FF'], Icon: ShieldCheck },
  tactical: { label: 'Tactical', color: '#FFC800', ink: '#071013', deep: '#A35A00', grad: ['#FFE500', '#FF9600'], Icon: Brain },
};

/** When a card is played: the chip on the card, and the words for the deck builder and the inspect view. */
export const PHASE_INFO: Record<CardPhase, { label: string; long: string; Icon: Icon }> = {
  blind: { label: 'Before Q', long: 'Before the question — both pick at once', Icon: EyeOff },
  live: { label: 'During Q', long: 'During the question', Icon: Timer },
  reaction: { label: 'After reveal', long: 'Right after their card is revealed', Icon: RotateCcw },
};

/** Who can play it. */
export const ROLE_INFO: Record<CardRole, { label: string; long: string; Icon: Icon }> = {
  any: { label: 'Any ball', long: 'Attacking or defending', Icon: ArrowLeftRight },
  attack: { label: 'Your ball', long: 'Only when you attack', Icon: Swords },
  defend: { label: 'Their ball', long: 'Only when they attack', Icon: Shield },
  shot: { label: 'Your shot', long: 'Only on your shot (attacking from their side)', Icon: Goal },
};

const SHAPE: CSSProperties = {
  WebkitMaskImage: 'url(/assets/card-clash/card-shape.png)',
  maskImage: 'url(/assets/card-clash/card-shape.png)',
  WebkitMaskSize: '100% 100%',
  maskSize: '100% 100%',
};
const RINGS =
  'repeating-radial-gradient(circle at 0% 120%, transparent 0 1.1em, rgba(0,0,0,0.13) 1.1em 1.2em), repeating-radial-gradient(circle at 100% 120%, transparent 0 1.1em, rgba(0,0,0,0.13) 1.1em 1.2em)';
const RINGS_FADE = 'linear-gradient(180deg, transparent 35%, #000 85%)';
const SHEEN = 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.5) 50%, transparent 80%)';
const PANEL = 'rgba(7,16,19,0.84)';

/**
 * Each card's pictogram: a lucide icon, or a drawing of its own where no icon says it (the ball, the boot, the card,
 * the armband…). Drawings are on a 24-unit grid, stroked in currentColor like the icons.
 */
type Glyph = { Icon: Icon; fill?: boolean } | { draw: ReactNode };

const GLYPH: Record<CardId, Glyph> = {
  // A ball leaving the foot fast.
  'first-touch': {
    draw: (
      <>
        <circle cx="15" cy="12" r="6.5" />
        <path d="M15 9.3l2.6 1.9-1 3h-3.2l-1-3z" fill="currentColor" strokeWidth={1.2} />
        <path d="M2.5 8h4M1.5 12h5M2.5 16h4" />
      </>
    ),
  },
  // Half the options gone.
  'fifty-fifty': {
    draw: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor" />
      </>
    ),
  },
  // A gold boot, studs and all.
  'golden-boot': {
    draw: (
      <g stroke="#071013" strokeWidth={1.5}>
        <path d="M5 4.5h5l1.5 5.5c4.6.6 8.6 2.5 9.5 5.6v1.9H3V7.7C3 5.9 3.8 4.5 5 4.5z" fill="#FFE500" />
        <path d="M7.5 12.2c2.8.2 5.4 1.4 7 3.4" />
        <path d="M5.5 18v2.4M10.5 18v2.4M17 18v2.4" strokeWidth={2.2} />
      </g>
    ),
  },
  // The captain's band with its C.
  'captains-armband': {
    draw: (
      <>
        <rect x="2.5" y="5.5" width="19" height="13" rx="3" fill="currentColor" fillOpacity={0.22} />
        <path d="M14.7 9.5a3.4 3.4 0 1 0 0 5" strokeWidth={2.7} />
      </>
    ),
  },
  // The ball comes round again.
  'second-ball': {
    draw: (
      <>
        <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3l2.2 2.2" />
        <path d="M19.8 3.6v5.3h-5.3" />
        <circle cx="12" cy="12" r="2.6" fill="currentColor" />
      </>
    ),
  },
  'floodlight-failure': { Icon: LightbulbOff },
  'muddy-pitch': { Icon: Shuffle },
  fog: { Icon: CloudFog },
  'yellow-card': {
    draw: <rect x="6.5" y="3" width="11" height="17" rx="1.8" transform="rotate(12 12 11.5)" fill="#FFE500" stroke="#071013" strokeWidth={1.6} />,
  },
  'offside-trap': { Icon: Flag, fill: true },
  'var-review': { Icon: MonitorPlay },
  'goalkeeper-gloves': { Icon: Hand },
  'park-the-bus': { Icon: Bus },
  'shin-pads': { Icon: ShieldHalf },
  // A dotted arc over everyone, onto the ball.
  'long-ball': {
    draw: (
      <>
        <path d="M3 20Q6 5 15.5 6.2" strokeDasharray="0.1 3.4" strokeWidth={2.6} />
        <circle cx="18.5" cy="7" r="3" fill="currentColor" />
        <path d="M2 21h5" />
      </>
    ),
  },
  'counter-attack': { Icon: ArrowBigRightDash, fill: true },
  substitution: { Icon: ArrowUpDown },
  'home-advantage': { Icon: House },
  'dummy-run': { Icon: VenetianMask },
  // Three players passing in a triangle.
  'tiki-taka': {
    draw: (
      <>
        <circle cx="12" cy="4.6" r="2.6" fill="currentColor" />
        <circle cx="4.6" cy="18" r="2.6" fill="currentColor" />
        <circle cx="19.4" cy="18" r="2.6" fill="currentColor" />
        <path d="M10.6 7.4l-4.6 8M7.6 18h8.8M18 15.4l-4.6-8" />
      </>
    ),
  },
};

/** A card's pictogram on its own, sized by the parent's font-size (1em square), e.g. for deck thumbnails. */
export function CardGlyph({ id, className }: { id: CardId; className?: string }) {
  const glyph = GLYPH[id];
  if ('draw' in glyph) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={cn('size-[1em] shrink-0', className)}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {glyph.draw}
      </svg>
    );
  }
  return <glyph.Icon className={cn('size-[1em] shrink-0', className)} fill={glyph.fill ? 'currentColor' : 'none'} strokeWidth={2.5} aria-hidden />;
}

/**
 * full: everything · compact: name, headline and chips · hand: art and a big headline (sized for the docked hand) ·
 * mini: art and cost only.
 */
export type CardFaceSize = 'full' | 'compact' | 'hand' | 'mini';

const ART: Record<CardFaceSize, string> = {
  full: 'top-[9%] h-[44%]',
  compact: 'top-[9%] h-[48%]',
  hand: 'top-[7%] h-[52%]',
  mini: 'top-[14%] h-[64%]',
};
/** The cost gem and type emblem grow on smaller cards so they stay legible. */
const BADGE_SCALE: Record<CardFaceSize, number> = { full: 1, compact: 1.12, hand: 1.4, mini: 1.6 };

export function CardFace({
  id,
  width,
  size = 'full',
  selected = false,
  playable = false,
  used = false,
  unaffordable = false,
  showCost = true,
  dimmed = false,
  className,
}: {
  id: CardId;
  width: number;
  size?: CardFaceSize;
  selected?: boolean;
  /** Glows, with a sheen sweeping across: can be played right now. */
  playable?: boolean;
  /** Spent this match: greyed with a stamp. */
  used?: boolean;
  /** Costs more than is left of the loadout budget: the cost gem turns red. */
  unaffordable?: boolean;
  /** The cost gem; off in the match, where energy was already spent on the loadout. */
  showCost?: boolean;
  dimmed?: boolean;
  className?: string;
}) {
  const card: CardDef = CARD_BY_ID[id];
  const theme = CARD_TYPE_THEME[card.type];
  const phase = PHASE_INFO[card.phase];
  const role = ROLE_INFO[card.role];
  const badge = BADGE_SCALE[size];
  const glow = (selected || playable) && !used;

  return (
    <div
      className={cn('relative shrink-0 select-none font-poppins', className)}
      style={{
        width,
        aspectRatio: '63 / 88',
        fontSize: width / 15,
        filter: used
          ? 'grayscale(1) brightness(0.55)'
          : `drop-shadow(0 0.35em 0.6em rgba(0,0,0,0.45))${glow ? ` drop-shadow(0 0 0.8em ${selected ? '#FFE500' : theme.color})` : ''}`,
      }}
      title={`${card.name}${showCost ? ` · ${card.energy}⚡` : ''} — ${card.effect}`}
    >
      {/* Rim: white, or the brand yellow when selected. */}
      <div className="absolute inset-0" style={{ ...SHAPE, background: selected ? '#FFE500' : glow ? theme.color : 'rgba(255,255,255,0.55)' }} />
      <div
        className="absolute inset-[0.24em] overflow-hidden"
        style={{ ...SHAPE, background: `linear-gradient(180deg, ${theme.grad[0]} 0%, ${theme.grad[1]} 70%)` }}
      >
        <div className="absolute inset-0" style={{ background: RINGS, WebkitMaskImage: RINGS_FADE, maskImage: RINGS_FADE }} />
        <div
          className="absolute inset-x-0 top-0 h-[60%]"
          style={{ background: 'radial-gradient(60% 55% at 50% 52%, rgba(255,255,255,0.42), transparent 70%)' }}
        />
        <div className={cn('absolute inset-x-0 flex items-center justify-center', ART[size])}>
          <div
            className="grid aspect-square h-[80%] place-items-center rounded-full text-white"
            style={{
              background: 'radial-gradient(circle at 35% 28%, rgba(255,255,255,0.38), rgba(0,0,0,0.22) 72%)',
              boxShadow: 'inset 0 0 0 0.16em rgba(255,255,255,0.6), 0 0.3em 0.7em rgba(0,0,0,0.3)',
              fontSize: `${width * (size === 'full' ? 0.27 : size === 'compact' ? 0.3 : size === 'hand' ? 0.33 : 0.38)}px`,
            }}
          >
            <CardGlyph id={id} className="drop-shadow-[0_0.06em_0.08em_rgba(0,0,0,0.45)]" />
          </div>
        </div>

        {size === 'full' && (
          <div className="absolute inset-x-[0.5em] bottom-[1.3em] top-[52%] flex flex-col items-center rounded-[0.7em] px-[0.45em] pb-[0.4em] pt-[0.4em]" style={{ background: PANEL }}>
            <Name card={card} />
            <Headline card={card} fontSize="0.74em" />
            <div className="mt-[0.35em] flex flex-wrap justify-center gap-[0.25em]">
              <Chip Icon={phase.Icon} label={phase.label} color={card.phase === 'blind' ? '#9CB6C2' : '#FFE500'} />
              <Chip Icon={role.Icon} label={role.label} color={theme.color} />
            </div>
            <p className="mt-[0.35em] text-center text-[0.56em] font-medium leading-[1.28] text-white/85">{card.effect}</p>
          </div>
        )}
        {size === 'compact' && (
          <div className="absolute inset-x-[0.5em] bottom-[1.3em] top-[57%] flex flex-col items-center justify-center rounded-[0.7em] px-[0.4em] py-[0.35em]" style={{ background: PANEL }}>
            <Name card={card} />
            <Headline card={card} fontSize="0.8em" />
            <div className="mt-[0.3em] flex flex-wrap justify-center gap-[0.22em]">
              <Chip Icon={phase.Icon} label={phase.label} color={card.phase === 'blind' ? '#9CB6C2' : '#FFE500'} />
              <Chip Icon={role.Icon} label={role.label} color={theme.color} />
            </div>
          </div>
        )}
        {size === 'hand' && (
          <div className="absolute inset-x-[0.4em] bottom-[1.05em] top-[58%] flex items-center justify-center rounded-[0.65em] px-[0.25em]" style={{ background: PANEL }}>
            <span
              className="line-clamp-2 text-center font-black uppercase leading-[1.02] tracking-[0.01em]"
              style={{ color: theme.color === '#1CB0F6' ? '#7FD6FF' : theme.color === '#FF4B4B' ? '#FF8A8A' : theme.color, fontSize: card.short.length > 13 ? '1.42em' : '1.62em' }}
            >
              {card.short}
            </span>
          </div>
        )}

        {glow && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2"
            style={{ background: SHEEN }}
            animate={{ x: ['0%', '400%'] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut' }}
          />
        )}
      </div>

      {/* Energy cost, top left — the artifact's yellow gem. */}
      {showCost && (
        <div
          className="absolute left-[6%] top-[8%] flex items-center justify-center gap-[0.04em] rounded-full pl-[0.28em] pr-[0.42em] shadow-[0_0.1em_0.25em_rgba(0,0,0,0.45)]"
          style={{ height: `${2.1 * badge}em`, minWidth: `${2.1 * badge}em`, background: used ? '#9CB6C2' : unaffordable ? '#FF4B4B' : '#FFE500', color: unaffordable && !used ? '#FFFFFF' : '#071013', fontSize: `${badge}em` }}
        >
          <Zap className="h-[0.85em] w-[0.85em] fill-current" strokeWidth={0} />
          <span className="text-[1.2em] font-black leading-none">{card.energy}</span>
        </div>
      )}

      {/* Type: an emblem on every size, with the word on the bigger cards. */}
      <div
        className="absolute right-[6%] top-[8.5%] flex items-center gap-[0.3em] rounded-full shadow-[0_0.1em_0.25em_rgba(0,0,0,0.45)]"
        style={{ background: theme.deep, boxShadow: 'inset 0 0 0 0.1em rgba(255,255,255,0.55)', fontSize: size === 'full' ? '1em' : `${badge}em` }}
      >
        <span className="grid size-[1.9em] place-items-center">
          <theme.Icon className="size-[1.05em] text-white" strokeWidth={2.6} />
        </span>
        {size === 'full' && <span className="-ml-[0.2em] pr-[0.55em] text-[0.55em] font-extrabold uppercase tracking-[0.06em] text-white">{theme.label}</span>}
      </div>

      {selected && (
        <div className="absolute -right-[0.3em] -top-[0.3em] grid h-[2em] w-[2em] place-items-center rounded-full bg-brand-yellow text-surface-page shadow-lg" style={{ fontSize: `${badge}em` }}>
          <Check className="h-[1.1em] w-[1.1em]" strokeWidth={3.5} />
        </div>
      )}
      {used && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="-rotate-12 rounded-[0.4em] bg-surface-page/90 px-[0.6em] py-[0.2em] text-[0.9em] font-black uppercase text-white/80" style={{ fontSize: `${badge}em` }}>
            Used
          </span>
        </div>
      )}
      {dimmed && !used && <div className="absolute inset-0 bg-surface-page/50" style={SHAPE} />}
    </div>
  );
}

/** A face-down card: what the other side sees of a blind pick until the flip. */
export function CardBack({ width, waiting = false, className }: { width: number; /** Breathes while that side is still choosing. */ waiting?: boolean; className?: string }) {
  return (
    <motion.div
      className={cn('relative shrink-0 select-none', className)}
      style={{ width, aspectRatio: '63 / 88', fontSize: width / 15, filter: 'drop-shadow(0 0.35em 0.6em rgba(0,0,0,0.45))' }}
      animate={waiting ? { opacity: [0.55, 0.9, 0.55], scale: [0.98, 1, 0.98] } : { opacity: 1, scale: 1 }}
      transition={waiting ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
    >
      <div className="absolute inset-0" style={{ ...SHAPE, background: 'rgba(255,255,255,0.55)' }} />
      <div className="absolute inset-[0.24em] overflow-hidden" style={{ ...SHAPE, background: 'linear-gradient(160deg, #1645FF 0%, #0B1F4D 55%, #071013 100%)' }}>
        <div className="absolute inset-0 opacity-70" style={{ background: RINGS }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(45% 35% at 50% 45%, rgba(255,229,0,0.28), transparent 70%)' }} />
        <img src="/assets/brand/ball.webp" alt="" draggable={false} className="absolute left-1/2 top-[45%] w-[46%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0.3em_0.5em_rgba(0,0,0,0.5)]" />
      </div>
    </motion.div>
  );
}

function Name({ card }: { card: CardDef }) {
  return (
    <div className="text-center font-extrabold leading-[1.02] text-white" style={{ fontSize: card.name.length > 14 ? '0.95em' : '1.1em' }}>
      {card.name}
    </div>
  );
}

/** What the card does, in a few words on a type-coloured pill. */
function Headline({ card, fontSize }: { card: CardDef; fontSize: string }) {
  const theme = CARD_TYPE_THEME[card.type];
  return (
    <div
      className="mt-[0.3em] rounded-full px-[0.6em] py-[0.12em] text-center font-black uppercase leading-[1.15] tracking-[0.03em]"
      style={{ background: theme.color, color: theme.ink, fontSize }}
    >
      {card.short}
    </div>
  );
}

function Chip({ Icon, label, color }: { Icon: Icon; label: string; color: string }) {
  return (
    <span
      className="flex items-center gap-[0.25em] rounded-full px-[0.5em] py-[0.18em] text-[0.5em] font-semibold leading-tight text-white/90"
      style={{ background: `${color}22`, boxShadow: `inset 0 0 0 0.11em ${color}cc` }}
    >
      <Icon className="h-[1.15em] w-[1.15em] shrink-0" style={{ color }} />
      {label}
    </span>
  );
}

const HEXAGON = 'polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0% 50%)';

/** The badge hexagon (a 100 × 90 box, points left and right), inset by `inset` units on every side. */
function hexPoints(inset: number): string {
  const k = inset * 0.5;
  return `${25 + k},${inset} ${75 - k},${inset} ${100 - inset},45 ${75 - k},${90 - inset} ${25 + k},${90 - inset} ${inset},45`;
}

/** Light rays behind the pictogram, from the badge's centre. */
const RAYS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  const b = a + Math.PI / 24;
  return `50,46 ${50 + Math.cos(a) * 70},${46 + Math.sin(a) * 70} ${50 + Math.cos(b) * 70},${46 + Math.sin(b) * 70}`;
}).join(' M');

/** Rim colours, top to bottom: silver, gold when picked, the type colour when it can be used, grey once used. */
function rimStops(state: 'plain' | 'selected' | 'glow' | 'used', color: string, deep: string): [string, string, string] {
  if (state === 'selected') return ['#FFF8B8', '#FFE500', '#C98A00'];
  if (state === 'glow') return ['#FFFFFF', color, deep];
  if (state === 'used') return ['#9AA5AC', '#6B767D', '#434C52'];
  return ['#FFFFFF', '#C3CED6', '#6E7F8B'];
}

/**
 * A playstyle: how a card is shown before it is used — a collectible hexagon badge (bevelled metal rim, the type's
 * gradient with light rays and a gloss, the pictogram on a medallion), its cost gem, and optionally its name and
 * headline under it. A playstyle only turns into a card when it is played. Drawn in SVG so it stays crisp from the
 * ~40 px player-card slots up to the inspector.
 */
export function PlaystyleBadge({
  id,
  size,
  showName = true,
  selected = false,
  playable = false,
  used = false,
  unaffordable = false,
  showCost = true,
  dimmed = false,
  className,
}: {
  id: CardId;
  /** The hexagon's width in px; the name and headline sit under it. */
  size: number;
  showName?: boolean;
  selected?: boolean;
  /** Can be used right now: glows. */
  playable?: boolean;
  used?: boolean;
  /** Costs more than is left of the loadout budget: the cost turns red. */
  unaffordable?: boolean;
  /** The cost gem; off in the match, where energy was already spent on the loadout. */
  showCost?: boolean;
  dimmed?: boolean;
  className?: string;
}) {
  const card = CARD_BY_ID[id];
  const theme = CARD_TYPE_THEME[card.type];
  const glow = (playable || selected) && !used;
  const reduceMotion = useReducedMotion();
  // SVG ids must be unique per badge (many share a page) and plain enough for url(#…).
  const uid = `pb${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [rimTop, rimMid, rimBottom] = rimStops(used ? 'used' : selected ? 'selected' : glow ? 'glow' : 'plain', theme.color, theme.deep);
  const face: [string, string] = used ? ['#4A545B', '#22292E'] : theme.grad;
  const gem = Math.max(10, size * 0.17);
  // The type emblem only where there is room for it.
  const emblem = size >= 72 && !used;
  return (
    <div
      className={cn('relative flex shrink-0 select-none flex-col items-center font-poppins', (dimmed || used) && 'opacity-45', className)}
      style={{ width: Math.max(size, showName ? size + 16 : size) }}
      title={`${card.name}${showCost ? ` · ${card.energy}⚡` : ''} — ${card.effect}`}
    >
      <div className="relative" style={{ width: size, height: size * 0.9 }}>
        {glow && (
          <motion.div
            aria-hidden
            className="absolute inset-[-14%]"
            style={{ clipPath: HEXAGON, background: `radial-gradient(circle, ${selected ? '#FFE500' : theme.color}aa, transparent 70%)` }}
            animate={reduceMotion ? { opacity: 0.8 } : { opacity: [0.5, 1, 0.5] }}
            transition={reduceMotion ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <svg
          viewBox="0 0 100 90"
          className="absolute inset-0 size-full overflow-visible"
          style={{ filter: `drop-shadow(0 ${Math.max(1, size * 0.035)}px ${Math.max(1.5, size * 0.05)}px rgba(0,0,0,0.5))` }}
          aria-hidden
        >
          <defs>
            <linearGradient id={`${uid}rim`} x1="0" y1="0" x2="0.25" y2="1">
              <stop offset="0" stopColor={rimTop} />
              <stop offset="0.5" stopColor={rimMid} />
              <stop offset="1" stopColor={rimBottom} />
            </linearGradient>
            <linearGradient id={`${uid}face`} x1="0.2" y1="0" x2="0.8" y2="1">
              <stop offset="0" stopColor={face[0]} />
              <stop offset="0.9" stopColor={face[1]} />
            </linearGradient>
            {/* Bevel: lit along the top edges, shaded along the bottom ones. */}
            <linearGradient id={`${uid}bevel`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.85} />
              <stop offset="0.42" stopColor="#FFFFFF" stopOpacity={0} />
              <stop offset="0.6" stopColor="#000000" stopOpacity={0} />
              <stop offset="1" stopColor="#000000" stopOpacity={0.5} />
            </linearGradient>
            <radialGradient id={`${uid}medal`} cx="0.4" cy="0.3" r="0.75">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.28} />
              <stop offset="1" stopColor="#000000" stopOpacity={0.28} />
            </radialGradient>
            <clipPath id={`${uid}clip`}>
              <polygon points={hexPoints(11)} />
            </clipPath>
          </defs>

          {/* Metal rim (the round stroke rounds its corners), then a dark inner ring. */}
          <polygon points={hexPoints(3)} fill={`url(#${uid}rim)`} stroke={`url(#${uid}rim)`} strokeWidth={6} strokeLinejoin="round" />
          <polygon points={hexPoints(9)} fill={used ? '#1A1F23' : theme.deep} stroke={used ? '#1A1F23' : theme.deep} strokeWidth={3} strokeLinejoin="round" />

          <g clipPath={`url(#${uid}clip)`}>
            <polygon points={hexPoints(11)} fill={`url(#${uid}face)`} />
            <path d={`M${RAYS}`} fill="#FFFFFF" opacity={used ? 0.04 : 0.12} />
            <circle cx="50" cy="46" r="25" fill={`url(#${uid}medal)`} stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={1.6} />
            {/* Gloss over the top half. */}
            <path d="M0 0H100V30C76 41 24 41 0 30Z" fill="#FFFFFF" opacity={used ? 0.06 : 0.2} />
          </g>
          <polygon points={hexPoints(11)} fill="none" stroke={`url(#${uid}bevel)`} strokeWidth={2.6} strokeLinejoin="round" />
        </svg>

        <div className="absolute inset-0 grid place-items-center pb-[2%]" style={{ fontSize: size * 0.4, color: used ? 'rgba(255,255,255,0.6)' : '#FFFFFF' }}>
          <CardGlyph id={id} className="drop-shadow-[0_0.05em_0.06em_rgba(0,0,0,0.55)]" />
        </div>

        {emblem && (
          <span
            className="absolute bottom-[-3%] left-1/2 grid -translate-x-1/2 place-items-center rounded-full"
            style={{ width: size * 0.22, height: size * 0.22, background: theme.deep, boxShadow: `inset 0 0 0 ${Math.max(1, size * 0.018)}px rgba(255,255,255,0.7), 0 1px 3px rgba(0,0,0,0.5)` }}
          >
            <theme.Icon className="size-[58%] text-white" strokeWidth={2.6} />
          </span>
        )}

        {/* The cost gem. */}
        {showCost && (
          <span
            className="absolute -right-[6%] -top-[4%] flex items-center gap-[1px] rounded-full px-[0.38em] py-[0.08em] font-black leading-[1.15]"
            style={{
              fontSize: gem,
              background: used ? '#9CB6C2' : unaffordable ? 'linear-gradient(180deg, #FF8A8A, #FF4B4B 50%, #C42B2B)' : 'linear-gradient(180deg, #FFF59A, #FFE500 50%, #F2AE00)',
              color: unaffordable && !used ? '#FFFFFF' : '#071013',
              boxShadow: `inset 0 0 0 1px rgba(7,16,19,0.55), inset 0 ${gem * 0.1}px 0 rgba(255,255,255,0.65), 0 ${gem * 0.1}px ${gem * 0.3}px rgba(0,0,0,0.5)`,
            }}
          >
            <Zap className="size-[0.8em] fill-current" strokeWidth={0} />
            {card.energy}
          </span>
        )}
        {used && (
          <span className="absolute inset-x-0 bottom-[8%] flex justify-center">
            <span className="flex items-center gap-0.5 rounded-full bg-surface-page/90 px-1.5 py-px text-[9px] font-black uppercase text-white/80">
              <Check className="size-2.5" strokeWidth={4} /> Used
            </span>
          </span>
        )}
      </div>
      {showName && (
        <>
          <div className="mt-1 max-w-full text-center font-extrabold uppercase leading-tight text-white" style={{ fontSize: Math.max(10, size * 0.14), marginTop: emblem ? size * 0.06 : undefined }}>
            {card.name}
          </div>
          <div className="mt-0.5 max-w-full text-center font-black uppercase leading-tight" style={{ color: theme.color, fontSize: Math.max(9, size * 0.115) }}>
            {card.short}
          </div>
        </>
      )}
    </div>
  );
}
