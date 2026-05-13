import {
  GraduationCap,
  Rocket,
  ShieldChevron,
  Armchair,
  ArrowsClockwise,
  SoccerBall,
  Medal,
  ShieldStar,
  Globe,
  Crown,
  Trophy,
  type Icon as PhosphorIconType,
} from '@phosphor-icons/react';

export type TierName =
  | 'Academy'
  | 'Youth Prospect'
  | 'Reserve'
  | 'Bench'
  | 'Rotation'
  | 'Starting11'
  | 'Key Player'
  | 'Captain'
  | 'World-Class'
  | 'Legend'
  | 'GOAT';

export interface TierVisual {
  emoji: string;
  /**
   * Phosphor icon component. Default weight is "light" for the minimal look —
   * render sites can override via the `weight` prop if a heavier silhouette
   * (e.g. on small/dim ladder ticks) is needed.
   */
  Icon: PhosphorIconType;
  color: string;
  gradient: string;
  glow: string;
}

export const tierConfig: Record<TierName, TierVisual> = {
  'Academy':        { emoji: '🎓', Icon: GraduationCap,   color: 'text-slate-300',   gradient: 'from-slate-500 to-slate-400',   glow: 'shadow-slate-400/40' },
  'Youth Prospect': { emoji: '🌟', Icon: Rocket,          color: 'text-lime-300',    gradient: 'from-lime-600 to-lime-400',     glow: 'shadow-lime-400/40' },
  'Reserve':        { emoji: '🛡️', Icon: ShieldChevron,   color: 'text-zinc-300',    gradient: 'from-zinc-500 to-zinc-400',     glow: 'shadow-zinc-400/40' },
  'Bench':          { emoji: '🔰', Icon: Armchair,        color: 'text-amber-300',   gradient: 'from-amber-600 to-amber-400',   glow: 'shadow-amber-400/40' },
  'Rotation':       { emoji: '⚡', Icon: ArrowsClockwise, color: 'text-blue-300',    gradient: 'from-blue-500 to-blue-400',     glow: 'shadow-blue-400/40' },
  'Starting11':     { emoji: '⚽', Icon: SoccerBall,      color: 'text-green-300',   gradient: 'from-green-500 to-green-400',   glow: 'shadow-green-400/40' },
  'Key Player':     { emoji: '🔥', Icon: Medal,           color: 'text-yellow-300',  gradient: 'from-yellow-500 to-yellow-400', glow: 'shadow-yellow-400/40' },
  'Captain':        { emoji: '💪', Icon: ShieldStar,      color: 'text-orange-300',  gradient: 'from-orange-500 to-orange-400', glow: 'shadow-orange-400/40' },
  'World-Class':    { emoji: '💎', Icon: Globe,           color: 'text-cyan-300',    gradient: 'from-cyan-500 to-cyan-400',     glow: 'shadow-cyan-400/40' },
  'Legend':         { emoji: '👑', Icon: Crown,           color: 'text-purple-300',  gradient: 'from-purple-500 to-purple-400', glow: 'shadow-purple-400/40' },
  'GOAT':           { emoji: '🏆', Icon: Trophy,          color: 'text-fuchsia-300', gradient: 'from-fuchsia-500 to-fuchsia-400', glow: 'shadow-fuchsia-400/40' },
};

export function isKnownTier(value: string): value is TierName {
  return value in tierConfig;
}

/** Return tier visual (emoji, color, gradient, glow) for the given tier string. Falls back to Academy. */
export function getTierVisual(tier: string): TierVisual {
  return isKnownTier(tier) ? tierConfig[tier] : tierConfig['Academy'];
}

/**
 * Brand-aligned accent hex for ranking surfaces (leaderboard table, rank strip).
 * Grouped: Elite (GOAT/Legend = distinct), High (World-Class/Captain = distinct),
 * Mid (Key Player/Starting11/Rotation = same green), Low (Bench and below = same slate).
 */
const tierAccent: Record<TierName, string> = {
  'GOAT':           '#FFD700',
  'Legend':         '#E2E8F0',
  'World-Class':    '#00E5FF',
  'Captain':        '#FF7A00',
  'Key Player':     '#38B60E',
  'Starting11':     '#38B60E',
  'Rotation':       '#38B60E',
  'Bench':          '#94A3B8',
  'Reserve':        '#94A3B8',
  'Youth Prospect': '#94A3B8',
  'Academy':        '#94A3B8',
};

export function getTierAccent(tier: string): string {
  return isKnownTier(tier) ? tierAccent[tier] : tierAccent['Academy'];
}
