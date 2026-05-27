"use client";

import { AnimatePresence, motion } from 'motion/react';

import { cn } from '@/lib/utils';
import { AchievementUnlockStrip } from '@/components/match/AchievementUnlockStrip';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { useLocale } from '@/contexts/LocaleContext';

import { AnimatedCounter } from './results/AnimatedCounter';
import { MatchStatsDropdown } from './results/ResultsStatsPanel';
import type { RealtimeResultsScreenProps } from './results/results.types';
import { useMatchResultViewModel } from './results/useMatchResultViewModel';

export function RealtimeResultsScreen(props: RealtimeResultsScreenProps) {
  const {
    matchType,
    playerUsername,
    playerAvatar,
    playerAvatarCustomization = null,
    opponentUsername,
    opponentAvatar,
    opponentAvatarCustomization = null,
    playerScore,
    opponentScore,
    playerCorrect,
    opponentCorrect,
    totalQuestions,
    playerQuestionResults,
    opponentQuestionResults,
    preMatchRankedProfile,
    unlockedAchievements = [],
    onPlayAgain,
    onMainMenu,
  } = props;
  const { t } = useLocale();
  const {
    playerWon,
    isDraw,
    resultHeading,
    totalGamesLabel,
    showRankedRpCard,
    rpChange,
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
    xpEarned,
    projectedProgression,
    xpToNextLevelAfterMatch,
    accuracy,
    playerTier,
    opponentTier,
    opponentDisplayRp,
    showRankReveal,
    tierTransitionPhase,
  } = useMatchResultViewModel(props);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-page-alt p-3 md:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top center, rgba(28,176,246,0.08), transparent 32%), radial-gradient(circle at bottom left, rgba(88,204,2,0.06), transparent 28%)",
        }}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 w-full max-w-[1280px] space-y-4 font-poppins md:space-y-6"
      >
        <div className="pb-2 text-center">
          <h1
            className="font-poppins text-[3rem] font-black uppercase tracking-[0] md:text-[3.75rem]"
            style={{
              lineHeight: '1.3',
              color: playerWon ? '#22C55E' : isDraw ? '#FACC15' : '#FB3101',
            }}
          >
            {resultHeading}
          </h1>
        </div>

        <div className="mx-auto w-full max-w-[1100px]">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            {/* Player (Left) */}
            <div className="flex items-center gap-3 justify-self-start sm:gap-4">
              <div className="flex size-24 shrink-0 items-center justify-center">
                <AvatarDisplay
                  customization={playerAvatarCustomization ?? { base: playerAvatar }}
                  size="lg"
                  shape="square"
                />
              </div>
              <div className="hidden min-w-0 sm:block">
                <div
                  className="truncate font-poppins font-semibold uppercase text-white text-base sm:text-lg md:text-xl"
                >
                  {playerUsername}
                </div>
                {(preMatchRankedProfile?.rp != null || playerTier) && (
                  <div className="mt-2 flex items-center gap-2">
                    {preMatchRankedProfile?.rp != null && (
                      <span
                        className="inline-flex h-[22px] items-center rounded-[20px] px-3 font-poppins font-semibold uppercase tabular-nums text-[12px] sm:text-[13px] md:text-[15px]"
                        style={{ backgroundColor: '#FFE500', color: '#071013' }}
                      >
                        {preMatchRankedProfile.rp} RP
                      </span>
                    )}
                    {playerTier && (
                      <span
                        className="font-poppins font-semibold uppercase text-[12px] sm:text-[13px] md:text-[15px]"
                        style={{ color: '#FFE500' }}
                      >
                        {playerTier}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Center score pill */}
            <div className="flex flex-col items-center">
              <div
                className="flex h-[44px] min-w-[110px] items-center justify-center rounded-[20px] bg-brand-blue px-5 font-poppins font-semibold tabular-nums text-white text-2xl sm:h-[51px] sm:min-w-[133px] sm:px-6 sm:text-[36px]"
              >
                <AnimatedCounter from={0} to={playerScore} delay={0.25} />
                <span className="mx-1 sm:mx-1.5">:</span>
                <AnimatedCounter from={0} to={opponentScore} delay={0.25} />
              </div>
              <div
                className="mt-2 whitespace-nowrap font-poppins font-semibold uppercase text-white text-xs sm:text-sm md:text-[20px]"
                style={{ opacity: 0.5 }}
              >
                {totalGamesLabel}
              </div>
            </div>

            {/* Opponent (Right) */}
            <div className="flex flex-row-reverse items-center gap-3 justify-self-end sm:gap-4">
              <div className="flex size-24 shrink-0 items-center justify-center">
                <AvatarDisplay
                  customization={opponentAvatarCustomization ?? { base: opponentAvatar }}
                  size="lg"
                  className="-scale-x-100"
                  shape="square"
                />
              </div>
              <div className="hidden min-w-0 text-right sm:block">
                <div
                  className="truncate font-poppins font-semibold uppercase text-white text-base sm:text-lg md:text-xl"
                >
                  {opponentUsername}
                </div>
                {(opponentDisplayRp != null || opponentTier) && (
                  <div className="mt-2 flex flex-row-reverse items-center gap-2">
                    {opponentDisplayRp != null && (
                      <span
                        className="inline-flex h-[22px] items-center rounded-[20px] px-3 font-poppins font-semibold uppercase tabular-nums text-[12px] sm:text-[13px] md:text-[15px]"
                        style={{ backgroundColor: '#FFE500', color: '#071013' }}
                      >
                        {opponentDisplayRp} RP
                      </span>
                    )}
                    {opponentTier && (
                      <span
                        className="font-poppins font-semibold uppercase text-[12px] sm:text-[13px] md:text-[15px]"
                        style={{ color: '#FFE500' }}
                      >
                        {opponentTier}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {matchType === 'ranked' && (
          <>
            {/* Placement progress card */}
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
                        <div className="text-xs font-black uppercase tracking-wide text-brand-green-light md:text-sm">Placement Progress</div>
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
                        ? 'Placements complete! Revealing your rank...'
                        : `Complete placements to unlock your rank. ${placementMatchesLeft} match${placementMatchesLeft === 1 ? '' : 'es'} left.`
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
                        {/* Glow background */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 0.3, 0.15] }}
                          transition={{ duration: 1.5 }}
                          className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none"
                        />
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: [0, 1.3, 1] }}
                          transition={{ duration: 0.6, delay: 0.15 }}
                          className="mb-2 text-4xl md:text-5xl"
                        >
                          {revealTierVisual.emoji}
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-white/40 md:text-xs">Your Rank</div>
                          <div className={cn('text-xl font-black md:text-2xl', revealTierVisual.color)}>{revealTier}</div>
                          <div className="text-sm font-bold text-white/60 mt-1">{newRP} RP</div>
                        </motion.div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3 py-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                          className="size-10 rounded-full border-3 border-white/10 border-t-[#58CC02]"
                        />
                        <div className="text-xs font-bold text-white/50 md:text-sm">Calculating your rank...</div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
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
            </div>

            {/* Bar + markers row. Each marker column (label · polygon · cap)
                is the width of the cap; the polygon and label overflow it
                horizontally and are centred over the cap. The bar runs
                cap-to-cap between the two markers. `items-end` aligns the
                short bar with the bottom of each marker column. */}
            <div className="mt-6 flex items-end md:mt-8">
              <TierEndMarker label={rpTierInfo.tier} />
              <div
                className="relative h-[18px] flex-1 overflow-hidden md:h-[24px]"
                // Track shade for the rank-progress bar — darker than the
                // brand-green fill so the green progress reads clearly
                // against an unfilled background. Inline-style avoids
                // adding a one-off token for a single visual.
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
              <TierEndMarker label={nextTierBand?.tier ?? t('results.nextStage')} />
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

        <AchievementUnlockStrip achievements={unlockedAchievements} />

        {/* ── Action buttons (stacked vertically) + match stats dropdown ─── */}
        <div className="mx-auto flex w-full max-w-[498px] flex-col items-stretch gap-3 pt-2 md:gap-4">
          <MatchStatsDropdown
            accuracy={accuracy}
            playerCorrect={playerCorrect}
            opponentCorrect={opponentCorrect}
            totalQuestions={totalQuestions}
            playerScore={playerScore}
            opponentScore={opponentScore}
            xpEarned={xpEarned}
            level={projectedProgression?.level ?? null}
            xpToNextLevel={projectedProgression ? xpToNextLevelAfterMatch : null}
            playerQuestionResults={playerQuestionResults}
            opponentQuestionResults={opponentQuestionResults}
            t={t}
          />

          <button
            onClick={onPlayAgain}
            className="flex h-[64px] w-full items-center justify-center rounded-[20px] bg-brand-green font-poppins font-semibold uppercase text-white text-[1.5rem] transition-colors hover:bg-brand-green md:h-[80px] md:text-[28px]"
          >
            {t('results.playAgain')}
          </button>
          <button
            onClick={onMainMenu}
            className="flex h-[64px] w-full items-center justify-center rounded-[20px] border-[3px] border-brand-green bg-transparent font-poppins font-semibold uppercase text-white text-[1.5rem] transition-colors hover:bg-brand-green/10 md:h-[80px] md:text-[28px]"
          >
            {t('results.mainMenu')}
          </button>
        </div>
      </motion.div>
    </div>
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
function TierEndMarker({ label }: { label: string }) {
  return (
    <div
      className="relative flex flex-shrink-0 flex-col items-center"
      // Column width = cap width. The polygon and label overflow this on
      // both sides via `whitespace-nowrap` + no overflow:hidden.
      style={{ width: 'clamp(8px, 1.2vw, 10px)' }}
    >
      <span
        className="whitespace-nowrap font-poppins font-semibold uppercase tracking-wide text-white text-[12px] sm:text-[13px] md:text-[14px]"
        style={{ opacity: 0.78 }}
      >
        {label}
      </span>
      {/* Inverted polygon — flat top, point down. Wider than the column
          so it visibly overhangs the cap on both sides. */}
      <div
        className="mt-2 bg-brand-yellow"
        style={{
          width: 'clamp(26px, 4.2vw, 40px)',
          height: 'clamp(14px, 2.4vw, 22px)',
          clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
        }}
      />
      {/* Yellow end-cap peg flush with the bar. `mt-2` gives the gap so
          the polygon doesn't touch the cap. */}
      <div
        className="mt-2 bg-brand-yellow"
        style={{ width: '100%', height: 'clamp(26px, 4vw, 34px)' }}
      />
    </div>
  );
}

