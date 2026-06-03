'use client';

/* eslint-disable @next/next/no-img-element -- Category artwork URLs come from realtime/backend payloads. */

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';

/**
 * Vibrant card palette — mirrors the /play mode-selection cards. Each ban card
 * rotates through this palette for visual variety. Text is white by default
 * for consistency (matching ranked/friendly cards); yellow uses dark text
 * because white has insufficient contrast against a yellow surface.
 */
export const BAN_CARD_COLORS: Array<{ bg: string; shadow: string; text: string }> = [
  { bg: '#38B60E', shadow: '#2D950B', text: '#ffffff' },  // green (ranked)
  { bg: '#1645FF', shadow: '#0F2FB3', text: '#ffffff' },  // brand blue
  { bg: '#CE82FF', shadow: '#A058D8', text: '#ffffff' },  // purple
  { bg: '#FF9600', shadow: '#CC7800', text: '#ffffff' },  // orange
  { bg: '#FF4B4B', shadow: '#CC3C3C', text: '#ffffff' },  // red
  { bg: '#FFE500', shadow: '#CCB800', text: '#1a1800' },  // yellow (dark text for contrast)
];

export const BAN_CARD_TITLE_STYLE = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

export interface BanCategoryCardCategory {
  id: string;
  name: string;
  icon?: string | null;
  imageUrl?: string | null;
}

export interface BanCategoryCardProps {
  category: BanCategoryCardCategory;
  /** Palette index — typically the card's position in the grid. */
  colorIndex: number;
  /** Card has been banned (by either player). Renders the BANNED stamp + grayscale. */
  isBanned: boolean;
  /** Highlight this card as the surviving (remaining) category after all bans. */
  isRemaining?: boolean;
  /** Fully disables interaction (opponent's turn, already banned by self, etc.). */
  disabled: boolean;
  /** Render the card faded out (e.g. player already banned, waiting for opponent). */
  fadedOut?: boolean;
  onClick?: (categoryId: string) => void;
}

/**
 * Shared category card used in both the pre-match draft ban screen and the
 * halftime ban screen. Design mirrors the /play mode-selection cards:
 *  - Solid vibrant bg colors from {@link BAN_CARD_COLORS}
 *  - Large rounded corners
 *  - Big centered watermark icon (or imageUrl cover)
 *  - Poppins uppercase title centered at the bottom
 *  - Chunky active-press feedback (no border-bottom shadow — flat)
 */
function BanCategoryCardComponent({
  category,
  colorIndex,
  isBanned,
  isRemaining = false,
  disabled,
  fadedOut = false,
  onClick,
}: BanCategoryCardProps) {
  const { t } = useLocale();
  const color = BAN_CARD_COLORS[colorIndex % BAN_CARD_COLORS.length];
  const imageUrl = category.imageUrl ?? null;
  const hasImage = Boolean(imageUrl);
  const interactive = !disabled && !isBanned && !!onClick;

  return (
    <div
      onClick={() => {
        if (!interactive) return;
        onClick?.(category.id);
      }}
      role="button"
      tabIndex={interactive ? 0 : -1}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && interactive) {
          e.preventDefault();
          onClick?.(category.id);
        }
      }}
      className={cn(
        'group relative aspect-[3/4] sm:aspect-[4/5] w-full overflow-hidden rounded-xl md:rounded-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
        interactive && 'cursor-pointer active:translate-y-[2px]',
        !interactive && 'cursor-default',
        fadedOut && 'opacity-30 pointer-events-none',
      )}
      style={{ backgroundColor: isBanned ? '#243B44' : color.bg }}
    >
      {/* Artwork — either imageUrl as cover, or emoji as centered watermark */}
      {hasImage ? (
        <>
          <div className="absolute inset-0" style={{ backgroundColor: color.bg }} />
          <img
            src={imageUrl ?? ''}
            alt=""
            width={400}
            height={500}
            decoding="async"
            loading="eager"
            fetchPriority="high"
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-[transform,filter] duration-300 ease-out sm:duration-500',
              interactive && 'group-hover:scale-105',
              isBanned && 'grayscale'
            )}
          />
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-b',
              isBanned ? 'from-black/55 via-black/55 to-black/75' : 'from-black/10 via-black/20 to-black/65'
            )}
          />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className={cn(
              'text-[7rem] sm:text-[9rem] md:text-[10rem] leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)] transition-all duration-300',
              interactive && 'group-hover:scale-105',
              isBanned && 'grayscale opacity-40 scale-90'
            )}
          >
            {category.icon || '⚽'}
          </span>
        </div>
      )}

      {/* Title — centered at the bottom */}
      <div className="relative z-10 flex h-full flex-col justify-end items-center p-3 sm:p-4">
        <h3
          className={cn(
            'text-[clamp(0.7rem,3.4vw,1.25rem)] uppercase leading-tight text-balance text-center w-full [overflow-wrap:normal] [word-break:keep-all]',
            isBanned && 'grayscale opacity-70'
          )}
          style={{
            ...BAN_CARD_TITLE_STYLE,
            // With imageUrl we render a dark gradient overlay → always white.
            // Without imageUrl the bg is the palette color → use its paired text color.
            color: isBanned ? '#E3E9EC' : (hasImage ? '#ffffff' : color.text),
            textShadow: hasImage ? '0 2px 8px rgba(0,0,0,0.75), 0 0 4px rgba(0,0,0,0.6)' : 'none',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          title={category.name}
        >
          {category.name}
        </h3>
      </div>

      {/* Remaining-winner checkmark (halftime second-half category) */}
      {isRemaining && (
        <div
          className="absolute top-2 right-2 z-20 flex size-7 items-center justify-center rounded-full bg-brand-green-light text-white shadow-lg"
        >
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
      )}

      {/* Banned stamp overlay — flat style to match the /play cards */}
      {isBanned && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="rounded-lg bg-brand-red-soft px-3 py-1.5 sm:rounded-xl sm:px-5 sm:py-2 -rotate-[8deg]">
            <span
              className="text-xs uppercase tracking-[0.15em] text-white sm:text-base"
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
            >
              {t('banCategory.banned')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export const BanCategoryCard = memo(BanCategoryCardComponent);
