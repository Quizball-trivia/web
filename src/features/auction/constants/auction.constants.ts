import type { PositionGroup } from '../types';

/** Shared Poppins inline-style for auction UI text (font + tight metrics). */
export const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

/** Position group → brand colour. */
export const POS_COLORS: Record<PositionGroup, string> = {
  GK: '#FFE500',
  DEF: '#1CB0F6',
  MID: '#58CC02',
  FWD: '#FF4B4B',
};

/** Brand purple used by the auction card + mystery option. */
export const AUCTION_PURPLE = '#6B2FB3';

/** Podium / rank medal colours (gold, silver, bronze), neutral for 4th+. */
export const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;
export const medalColor = (rank0: number) => MEDAL_COLORS[rank0] ?? '#566570';

/** Append an 8-bit hex alpha to a `#RRGGBB` colour (e.g. withAlpha('#FFE500', 0.4)). */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}
