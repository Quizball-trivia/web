"use client";

import { motion } from 'motion/react';

import { AchievementUnlockStrip } from '@/components/match/AchievementUnlockStrip';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { useLocale } from '@/contexts/LocaleContext';

import { AnimatedCounter } from './results/AnimatedCounter';
import { MatchStatsDropdown } from './results/ResultsStatsPanel';
import { RankedProgressionPanel } from './results/RankedProgressionPanel';
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

        <RankedProgressionPanel
          matchType={matchType}
          t={t}
          showRankedRpCard={showRankedRpCard}
          rpChange={rpChange}
          oldRP={oldRP}
          newRP={newRP}
          rpTierInfo={rpTierInfo}
          oldRpTierInfo={oldRpTierInfo}
          tierChanged={tierChanged}
          tierPromoted={tierPromoted}
          nextTierBand={nextTierBand}
          isPlacementMatch={isPlacementMatch}
          placementPlayed={placementPlayed}
          placementRequired={placementRequired}
          placementMatchesLeft={placementMatchesLeft}
          justPlaced={justPlaced}
          hasServerReveal={hasServerReveal}
          revealTier={revealTier}
          revealTierVisual={revealTierVisual}
          showRankReveal={showRankReveal}
          tierTransitionPhase={tierTransitionPhase}
        />

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


