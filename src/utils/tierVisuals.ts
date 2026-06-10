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

// Colors reference the brand-* tokens defined in src/styles/globals.css.
// Glows use full arbitrary-shadow utilities (geometry + rgba) so they render
// without needing a separate base shadow class — matches the convention in
// features/party/PartyQuizResultsScreen.tsx.
export const tierConfig: Record<TierName, TierVisual> = {
  'Academy':        { emoji: '🎓', Icon: GraduationCap,   color: 'text-brand-slate-light',  glow: 'shadow-[0_0_60px_-10px_rgba(156,182,194,0.4)]' },
  'Youth Prospect': { emoji: '🌟', Icon: Rocket,          color: 'text-brand-green-light',  glow: 'shadow-[0_0_60px_-10px_rgba(88,204,2,0.4)]' },
  'Reserve':        { emoji: '🛡️', Icon: ShieldChevron,   color: 'text-brand-slate-light',  glow: 'shadow-[0_0_60px_-10px_rgba(156,182,194,0.4)]' },
  'Bench':          { emoji: '🔰', Icon: Armchair,        color: 'text-brand-yellow-soft',  glow: 'shadow-[0_0_60px_-10px_rgba(248,211,74,0.4)]' },
  'Rotation':       { emoji: '⚡', Icon: ArrowsClockwise, color: 'text-brand-cyan',         glow: 'shadow-[0_0_60px_-10px_rgba(28,176,246,0.4)]' },
  'Starting11':     { emoji: '⚽', Icon: SoccerBall,      color: 'text-brand-green-light',  glow: 'shadow-[0_0_60px_-10px_rgba(88,204,2,0.4)]' },
  'Key Player':     { emoji: '🔥', Icon: Medal,           color: 'text-brand-yellow',       glow: 'shadow-[0_0_60px_-10px_rgba(255,229,0,0.4)]' },
  'Captain':        { emoji: '💪', Icon: ShieldStar,      color: 'text-brand-orange-light', glow: 'shadow-[0_0_60px_-10px_rgba(255,138,61,0.4)]' },
  'World-Class':    { emoji: '💎', Icon: Globe,           color: 'text-brand-cyan',         glow: 'shadow-[0_0_60px_-10px_rgba(28,176,246,0.4)]' },
  'Legend':         { emoji: '👑', Icon: Crown,           color: 'text-brand-purple',       glow: 'shadow-[0_0_60px_-10px_rgba(206,130,255,0.4)]' },
  'GOAT':           { emoji: '🏆', Icon: Trophy,          color: 'text-brand-gold',         glow: 'shadow-[0_0_60px_-10px_rgba(255,215,0,0.4)]' },
};

export function isKnownTier(value: string): value is TierName {
  return value in tierConfig;
}

/** Return tier visual (emoji, icon, color, glow) for the given tier string. Falls back to Academy. */
export function getTierVisual(tier: string): TierVisual {
  return isKnownTier(tier) ? tierConfig[tier] : tierConfig['Academy'];
}

/**
 * Brand-aligned accent hex for ranking surfaces (leaderboard table, rank strip,
 * showdown tier label). Each tier gets a distinct color so low tiers don't all
 * blend into the same grey.
 */
const tierAccent: Record<TierName, string> = {
  'GOAT':           '#FFD700',
  'Legend':         '#CE82FF',
  'World-Class':    '#1CB0F6',
  'Captain':        '#FF8A3D',
  'Key Player':     '#FFE500',
  'Starting11':     '#58CC02',
  'Rotation':       '#1CB0F6',
  'Bench':          '#F8D34A',
  'Reserve':        '#9CB6C2',
  'Youth Prospect': '#58CC02',
  'Academy':        '#9CB6C2',
};

export function getTierAccent(tier: string): string {
  return isKnownTier(tier) ? tierAccent[tier] : tierAccent['Academy'];
}

/**
 * FUT-style shield frame art per tier (public/assets/ranks/*, 208×329 px).
 * Used as the backdrop the player's avatar is composited into on the
 * profile rank-progression cards.
 */
const tierFrameSrc: Record<TierName, string> = {
  'Academy':        '/assets/ranks/academy_frame.png',
  'Youth Prospect': '/assets/ranks/youth_prospect_frame.png',
  'Reserve':        '/assets/ranks/reserve_frame.png',
  'Bench':          '/assets/ranks/bench_frame.png',
  'Rotation':       '/assets/ranks/rotation_frame.png',
  'Starting11':     '/assets/ranks/starting11_frame.png',
  'Key Player':     '/assets/ranks/key_player_frame.png',
  'Captain':        '/assets/ranks/captain_frame.png',
  'World-Class':    '/assets/ranks/world_class_frame.png',
  'Legend':         '/assets/ranks/legend_frame.png',
  'GOAT':           '/assets/ranks/goat_frame.png',
};

export function getTierFrameSrc(tier: string): string {
  return isKnownTier(tier) ? tierFrameSrc[tier] : tierFrameSrc['Academy'];
}
