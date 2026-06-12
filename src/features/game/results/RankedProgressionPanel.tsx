'use client';

/**
 * Ranked progression UI for the post-match results screen.
 *
 * Stacks two distinct ranked-only blocks under the avatar/score row:
 *
 *  1. **Placement track** — only while the player is mid-placements. Shows
 *     a green progress bar and a copy line. On the final placement match
 *     it flips to a "rank reveal" with the emoji + tier label + RP.
 *  2. **Tier progress bar** — shown once the player is placed and the
 *     server returned an RP delta. The big NEW RANK counter animates
 *     from oldRP → newRP, the Δ chip pops in, and the bar fills /
 *     resets across tier transitions.
 *
 * The private `TierEndMarker` helper renders the yellow polygon + cap on
 * each end of the bar (Figma "Polygon 1" rotated -180°).
 */

import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { useTierLabel } from '@/hooks/useTierLabel';
import { RankFrameCard } from '@/features/profile/components/RankFrameCard';
import { CoinIcon } from '@/features/store/components/CoinIcon';
import type { AvatarCustomization } from '@/types/game';
import { AnimatedCounter } from './AnimatedCounter';
import type { MatchResultViewModel } from './useMatchResultViewModel';

type LocaleT = ReturnType<typeof useLocale>['t'];

type RankedFields = Pick<
  MatchResultViewModel,
  | 'showRankedRpCard'
  | 'rpChange'
  | 'coinsAwarded'
  | 'oldRP'
  | 'newRP'
  | 'rpTierInfo'
  | 'oldRpTierInfo'
  | 'tierChanged'
  | 'tierPromoted'
  | 'nextTierBand'
  | 'isPlacementMatch'
  | 'placementPlayed'
  | 'placementRequired'
  | 'placementMatchesLeft'
  | 'justPlaced'
  | 'hasServerReveal'
  | 'revealTier'
  | 'revealTierVisual'
  | 'showRankReveal'
  | 'tierTransitionPhase'
>;

export function RankedProgressionPanel({
  matchType,
  t,
  avatarCustomization,
  ...vm
}: RankedFields & {
  matchType: 'ranked' | 'friendly';
  t: LocaleT;
  /** Player avatar composited inside the tier frame for unlock/reveal animations. */
  avatarCustomization?: AvatarCustomization;
}) {
  const tierLabelOf = useTierLabel();
  const {
    showRankedRpCard,
    rpChange,
    coinsAwarded,
    oldRP,
    newRP,
    rpTierInfo,
    oldRpTierInfo,
    tierChanged,
    tierPromoted,
    nextTierBand,
    isPlacementMatch,
    placementPlayed,
    placementRequired,
    placementMatchesLeft,
    justPlaced,
    hasServerReveal,
    revealTier,
    revealTierVisual,
    showRankReveal,
    tierTransitionPhase,
  } = vm;

  return (
    <>
      {matchType === 'ranked' && (
        <>
          {isPlacementMatch && (
            <AnimatePresence mode="wait">
              {!showRankReveal ? (
                <motion.div
                  key="placement-progress"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: 0.3 }}
                  className="border-t border-white/10 pt-3 md:pt-4"
                >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs font-black uppercase tracking-wide text-brand-green-light md:text-sm">{t('results.placementProgress')}</div>
                      <div className="text-xs font-black text-brand-green-bright md:text-sm">{placementPlayed}/{placementRequired}</div>
                    </div>
                    <div className="relative mb-2 h-3 md:h-4 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: `${(Math.max(0, placementPlayed - 1) / placementRequired) * 100}%` }}
                      animate={{ width: `${(placementPlayed / placementRequired) * 100}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-green-light to-brand-green-bright"
                    >
                      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent h-1/2" />
                    </motion.div>
                  </div>
                    <div className="text-[11px] font-semibold text-white/60 md:text-xs">
                    {justPlaced
                      ? t('results.placementsComplete')
                      : t('results.placementsRemaining', { n: placementMatchesLeft })
                    }
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="rank-reveal"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 150 }}
                  className={cn(
                    'border-t border-white/10 pt-4 md:pt-6 text-center relative overflow-hidden',
                    hasServerReveal && revealTierVisual.glow
                  )}
                >
                  {hasServerReveal ? (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.3, 0.15] }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none"
                      />
                      {/* New rank frame unlock — avatar inside the freshly
                          earned tier frame pops in (replaces the old emoji). */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.15, 1] }}
                        transition={{ duration: 0.6, delay: 0.15 }}
                        className="mb-3 flex justify-center"
                      >
                        <RankFrameCard
                          tier={revealTier}
                          tierLabel={tierLabelOf(revealTier)}
                          rpLabel={`${newRP}RP`}
                          customization={avatarCustomization ?? {}}
                          glow
                          sizes="(min-width: 640px) 200px, 150px"
                      className="w-[150px] sm:w-[200px]"
                        />
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-white/40 md:text-xs">{t('results.yourRank')}</div>
                      </motion.div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        className="size-10 rounded-full border-3 border-white/10 border-t-[#58CC02]"
                      />
                      <div className="text-xs font-bold text-white/50 md:text-sm">{t('results.calculatingRank')}</div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Placement matches also pay the participation reward */}
          {isPlacementMatch && coinsAwarded != null && coinsAwarded > 0 && (
            <div className="mt-3 flex justify-center">
              <CoinRewardChip amount={coinsAwarded} delay={0.8} />
            </div>
          )}
        </>
      )}

      {/* ── Tier progress (ranked only) ─────────────────────────────────
          Top: centred NEW RANK display with the big RP number + Δ chip.
          Bottom: a flat green progress bar flanked by YELLOW end-cap pegs.
          Above each peg sits an inverted yellow POLYGON (downward triangle,
          58×32 per Figma) with the matching tier label centred above the
          polygon. */}
      {showRankedRpCard && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mx-auto w-full max-w-[720px] pt-6 md:pt-8"
        >
          {/* ── Frame transition on tier change ────────────────────────
              While the bar fills/drains ('fill' phase) the OLD tier frame
              sits dimmed + blurred. When the transition settles, it
              crossfades to the NEW tier frame:
              · promotion — springs in with glow + yellow flash +
                "New rank unlocked!"
              · demotion  — slides down muted with a red "Rank lost"
                label, no glow/flash. */}
          {tierChanged && (
            <div className="mb-6 flex flex-col items-center md:mb-8">
              <AnimatePresence mode="wait">
                {tierTransitionPhase === 'fill' ? (
                  <motion.div
                    key="locked-frame"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 0.75, scale: 0.92 }}
                    exit={{ opacity: 0, scale: 0.8, filter: 'blur(8px)' }}
                    transition={{ duration: 0.35 }}
                  >
                    <RankFrameCard
                      tier={oldRpTierInfo.tier}
                      tierLabel={tierLabelOf(oldRpTierInfo.tier)}
                      rpLabel={`${oldRP}RP`}
                      customization={avatarCustomization ?? {}}
                      blurred
                      sizes="(min-width: 640px) 200px, 150px"
                      className="w-[150px] sm:w-[200px]"
                    />
                  </motion.div>
                ) : tierPromoted ? (
                  <motion.div
                    key="unlocked-frame"
                    initial={{ opacity: 0, scale: 0.55 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                    className="relative flex flex-col items-center"
                  >
                    {/* one-shot radial flash behind the new frame */}
                    <motion.div
                      initial={{ opacity: 0.9, scale: 0.4 }}
                      animate={{ opacity: 0, scale: 2.2 }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                      className="pointer-events-none absolute inset-0 m-auto aspect-square rounded-full bg-[radial-gradient(circle,rgba(255,229,0,0.45),transparent_70%)]"
                    />
                    <RankFrameCard
                      tier={rpTierInfo.tier}
                      tierLabel={tierLabelOf(rpTierInfo.tier)}
                      rpLabel={`${newRP}RP`}
                      customization={avatarCustomization ?? {}}
                      glow
                      sizes="(min-width: 640px) 200px, 150px"
                      className="w-[150px] sm:w-[200px]"
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.7 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 16 }}
                      className="mt-3 font-poppins text-[12px] font-semibold uppercase tracking-wide text-brand-yellow sm:text-[14px]"
                      style={{ textShadow: '0 2px 0 rgba(0,0,0,0.45)' }}
                    >
                      {t('results.rankUnlocked')}
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="demoted-frame"
                    initial={{ opacity: 0, y: -16, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="flex flex-col items-center"
                  >
                    <RankFrameCard
                      tier={rpTierInfo.tier}
                      tierLabel={tierLabelOf(rpTierInfo.tier)}
                      rpLabel={`${newRP}RP`}
                      customization={avatarCustomization ?? {}}
                      sizes="(min-width: 640px) 200px, 150px"
                      className="w-[150px] opacity-90 saturate-[0.8] sm:w-[200px]"
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="mt-3 font-poppins text-[12px] font-semibold uppercase tracking-wide text-brand-red sm:text-[14px]"
                      style={{ textShadow: '0 2px 0 rgba(0,0,0,0.45)' }}
                    >
                      {t('results.rankLost')}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="flex flex-col items-center text-center">
            <div
              className="font-poppins font-semibold uppercase text-white text-[11px] sm:text-[13px] md:text-[14px]"
              style={{ opacity: 0.6 }}
            >
              {t('results.newRank')}
            </div>
            <div className="mt-1 flex items-baseline gap-2 sm:gap-3">
              <span className="font-poppins font-semibold tabular-nums leading-none text-brand-green text-[28px] sm:text-[36px] md:text-[44px]">
                <AnimatedCounter from={oldRP} to={newRP} delay={0.5} />
                <span className="ml-1 text-[18px] sm:text-[24px] md:text-[28px]">RP</span>
              </span>
              {rpChange !== 0 && (
                <motion.span
                  initial={{ opacity: 0, y: -6, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 14 }}
                  className="font-poppins font-semibold leading-none text-[18px] sm:text-[22px] md:text-[26px]"
                  style={{
                    color: rpChange > 0 ? '#FFE500' : '#FF4B4B',
                    textShadow: '0 3px 0 rgba(0,0,0,0.55)',
                  }}
                >
                  {rpChange > 0 ? '+' : ''}{rpChange}
                </motion.span>
              )}
            </div>
            {/* Coin participation reward (win 300 / loss 100) from settlement */}
            {coinsAwarded != null && coinsAwarded > 0 && (
              <CoinRewardChip amount={coinsAwarded} delay={1.1} />
            )}
          </div>

          {/* Bar + markers row. Each marker column (label · polygon · cap)
              is the width of the cap; the polygon and label overflow it
              horizontally and are centred over the cap. The bar runs
              cap-to-cap between the two markers. `items-end` aligns the
              short bar with the bottom of each marker column. */}
          <div className="mt-6 flex items-end md:mt-8">
            <TierEndMarker label={tierLabelOf(rpTierInfo.tier)} align="left" />
            <div
              className="relative h-[18px] flex-1 overflow-hidden md:h-[24px]"
              style={{ backgroundColor: '#1F5D0E' }}
            >
              <motion.div
                initial={{ width: `${oldRpTierInfo.progress}%` }}
                animate={{
                  width: tierChanged && tierTransitionPhase === 'fill'
                    ? (tierPromoted ? '100%' : '0%')
                    : `${rpTierInfo.progress}%`,
                }}
                transition={tierTransitionPhase === 'settled' && tierChanged
                  ? { duration: 0.8, ease: 'easeOut' }
                  : { duration: 1.2, ease: 'easeInOut', delay: 0.5 }
                }
                className="absolute inset-y-0 left-0 bg-brand-green"
              />
            </div>
            <TierEndMarker label={nextTierBand ? tierLabelOf(nextTierBand.tier) : t('results.nextStage')} align="right" />
          </div>

          <div
            className="mt-3 text-center font-poppins font-semibold uppercase text-white text-[12px] sm:text-[14px] md:text-[16px]"
            style={{ opacity: 0.55 }}
          >
            {rpTierInfo.pointsToNext !== null
              ? t('results.rpToNextTier', { points: rpTierInfo.pointsToNext })
              : t('results.maxTierReached')}
          </div>
        </motion.div>
      )}
    </>
  );
}

/**
 * Yellow coin pill showing the match's coin participation reward
 * (ranked win/loss). Pops in after the RP delta chip.
 */
function CoinRewardChip({ amount, delay }: { amount: number; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0 }}
      animate={{ opacity: 1, y: 0, scale: [0, 1.25, 0.95, 1] }}
      transition={{
        delay,
        duration: 0.55,
        times: [0, 0.55, 0.8, 1],
        ease: 'easeOut',
      }}
      className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-poppins font-semibold tabular-nums leading-none text-[17px] sm:py-2 sm:text-[21px]"
      style={{ backgroundColor: '#FFE500', color: '#071013', boxShadow: '0 4px 0 rgba(0,0,0,0.35)' }}
    >
      <CoinIcon size={24} />
      +{amount}
    </motion.div>
  );
}

/**
 * Tier marker at one end of the rank-progress bar.
 *
 * Stacks (top → bottom): tier label · inverted yellow polygon (downward
 * triangle, Figma "Polygon 1" rotated -180°) · vertical yellow end-cap peg.
 *
 * Column width matches the cap width so the cap sits flush with the bar's
 * end. The polygon and label are wider — they overflow the column
 * horizontally but stay centred over the cap (so the polygon visually
 * "points down" at the cap). There's a small gap between polygon and cap
 * so the polygon hovers rather than touching the cap.
 */
function TierEndMarker({ label, align }: { label: string; align: 'left' | 'right' }) {
  return (
    <div
      className="relative flex flex-shrink-0 flex-col items-center"
      style={{ width: 'clamp(8px, 1.2vw, 10px)' }}
    >
      {/* Anchor the label to the marker's inner edge so it grows toward the
          bar (into the screen) instead of overflowing past the viewport edge.
          Without this, the centered label is clipped off-screen on mobile. */}
      <span
        className={cn(
          'absolute bottom-full mb-2 max-w-[42vw] truncate font-poppins font-semibold uppercase tracking-wide text-white text-[11px] sm:text-[13px] md:text-[14px]',
          align === 'left' ? 'left-0 text-left' : 'right-0 text-right',
        )}
        style={{ opacity: 0.78 }}
        title={label}
      >
        {label}
      </span>
      <div
        className="bg-brand-yellow"
        style={{
          width: 'clamp(26px, 4.2vw, 40px)',
          height: 'clamp(14px, 2.4vw, 22px)',
          clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
        }}
      />
      <div
        className="mt-2 bg-brand-yellow"
        style={{ width: '100%', height: 'clamp(26px, 4vw, 34px)' }}
      />
    </div>
  );
}
