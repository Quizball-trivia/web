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
  glow: string;
}

// Colors/glows reference the brand-* tokens defined in src/styles/globals.css.
// Some Tailwind palette steps don't have a direct brand match — we map to the
// closest semantic token (e.g. amber → brand-yellow-soft, fuchsia → brand-gold).
export const tierConfig: Record<TierName, TierVisual> = {
  'Academy':        { emoji: '🎓', Icon: GraduationCap,   color: 'text-brand-slate-light',  glow: 'shadow-brand-slate-light/40' },
  'Youth Prospect': { emoji: '🌟', Icon: Rocket,          color: 'text-brand-green-light',  glow: 'shadow-brand-green-light/40' },
  'Reserve':        { emoji: '🛡️', Icon: ShieldChevron,   color: 'text-brand-slate-light',  glow: 'shadow-brand-slate-light/40' },
  'Bench':          { emoji: '🔰', Icon: Armchair,        color: 'text-brand-yellow-soft',  glow: 'shadow-brand-yellow-soft/40' },
  'Rotation':       { emoji: '⚡', Icon: ArrowsClockwise, color: 'text-brand-cyan',         glow: 'shadow-brand-cyan/40' },
  'Starting11':     { emoji: '⚽', Icon: SoccerBall,      color: 'text-brand-green-light',  glow: 'shadow-brand-green-light/40' },
  'Key Player':     { emoji: '🔥', Icon: Medal,           color: 'text-brand-yellow',       glow: 'shadow-brand-yellow/40' },
  'Captain':        { emoji: '💪', Icon: ShieldStar,      color: 'text-brand-orange-light', glow: 'shadow-brand-orange-light/40' },
  'World-Class':    { emoji: '💎', Icon: Globe,           color: 'text-brand-cyan',         glow: 'shadow-brand-cyan/40' },
  'Legend':         { emoji: '👑', Icon: Crown,           color: 'text-brand-purple',       glow: 'shadow-brand-purple/40' },
  'GOAT':           { emoji: '🏆', Icon: Trophy,          color: 'text-brand-gold',         glow: 'shadow-brand-gold/40' },
};

export function isKnownTier(value: string): value is TierName {
  return value in tierConfig;
}

/** Return tier visual (emoji, icon, color, glow) for the given tier string. Falls back to Academy. */
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
