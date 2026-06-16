'use client';

/* eslint-disable @next/next/no-img-element -- Category artwork URLs come from realtime/backend payloads. */

import { optimizedRemoteImageProps } from "@/lib/images/remoteImage";
import { memo, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { getI18nText } from '@/lib/utils/i18n';
import type { I18nField } from '@/lib/realtime/socket.types';

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
  lineHeight: 1.08,
} as const;

const CARD_ENTRANCE_INITIAL = { opacity: 0, y: 20 } as const;
const CARD_ENTRANCE_ANIMATE = { opacity: 1, y: 0 } as const;
const CARD_SPRING = { type: 'spring', stiffness: 200, damping: 20 } as const;

export interface BanCategoryCardCategory {
  id: string;
  /** Full i18n object ({ en, ka }); localized for display via the active locale. */
  name: I18nField;
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
  /** Animation stagger index (ignored when 0). */
  animationIndex?: number;
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
  animationIndex = 0,
  onClick,
}: BanCategoryCardProps) {
  const { t, locale } = useLocale();
  const categoryName = getI18nText(category.name, locale);
  const color = BAN_CARD_COLORS[colorIndex % BAN_CARD_COLORS.length];
  const imageUrl = category.imageUrl ?? null;
  const hasImage = Boolean(imageUrl);
  const interactive = !disabled && !isBanned && !!onClick;
  // Staggered entrance so cards cascade in rather than popping all at once.
  const entranceTransition = useMemo(
    () => ({ ...CARD_SPRING, delay: 0.2 + animationIndex * 0.08 }),
    [animationIndex],
  );

  return (
    <motion.div
      initial={CARD_ENTRANCE_INITIAL}
      animate={CARD_ENTRANCE_ANIMATE}
      transition={entranceTransition}
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
        // @container: the title sizes to THIS card's width (cqw), not the
        // viewport. With 3 cards across on a narrow draft screen each card is
        // ~1/3 the width, so vw-based sizing rendered the font too big and long
        // KA names wrapped/clipped mid-word. cqw shrinks per-card so they fit.
        '@container group relative aspect-[3/4] sm:aspect-[4/5] w-full overflow-hidden rounded-xl md:rounded-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
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
            {...optimizedRemoteImageProps(imageUrl!, 400)}
            alt=""
            width={400}
            height={500}
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
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

      {/* Title — centered in the card */}
      <div className="relative z-10 flex h-full flex-col justify-center items-center p-3 sm:p-4">
        <h3
          className={cn(
            // Font sizes to the CARD width (cqw), so long Georgian names shrink
            // to fit on narrow draft cards instead of clipping. Word-only
            // wrapping: overflow-wrap/word-break stay `normal` and hyphens are
            // off, so a name like "გერმანია" is never cut mid-word as
            // "გერმანი-ა". If a single KA word still overflows, lower the cqw
            // floor rather than allowing a mid-word break.
            'text-[clamp(0.48rem,7.5cqw,1.25rem)] uppercase leading-tight text-balance text-center w-full [overflow-wrap:normal] [word-break:normal] [hyphens:none]',
            isBanned && 'grayscale opacity-70'
          )}
          style={{
            ...BAN_CARD_TITLE_STYLE,
            // With imageUrl we render a dark gradient overlay → always white.
            // Without imageUrl the bg is the palette color → use its paired text color.
            color: isBanned ? '#E3E9EC' : (hasImage ? '#ffffff' : color.text),
            textShadow: hasImage ? '0 2px 8px rgba(0,0,0,0.75), 0 0 4px rgba(0,0,0,0.6)' : 'none',
            display: '-webkit-box',
            // 7 lines: long KA names wrap to ~5-6 lines at the shrunk cqw font,
            // so this is a safety net for extreme names, not the thing clipping
            // normal ones.
            WebkitLineClamp: 7,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          title={categoryName}
        >
          {categoryName}
        </h3>
      </div>

      {/* Remaining-winner checkmark (halftime second-half category) */}
      {isRemaining && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="absolute top-2 right-2 z-20 flex size-7 items-center justify-center rounded-full bg-brand-green-light text-white shadow-lg"
        >
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </motion.div>
      )}

      {/* Banned stamp overlay — slams in when the card is banned. */}
      <AnimatePresence>
        {isBanned && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: -8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 14 }}
              className="max-w-[94%] rounded-lg bg-brand-red-soft px-2.5 py-1.5 sm:rounded-xl sm:px-6 sm:py-2.5 md:px-7 md:py-3"
            >
              <span
                className="block whitespace-nowrap text-center uppercase tracking-[0.02em] text-white sm:tracking-[0.08em]"
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  fontSize: 'clamp(0.5rem, 2.6vw, 1.125rem)',
                }}
              >
                {t('banCategory.banned')}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export const BanCategoryCard = memo(BanCategoryCardComponent);
