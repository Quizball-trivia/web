"use client";

import { motion } from 'motion/react';

import { AchievementUnlockStrip } from '@/components/match/AchievementUnlockStrip';
import { useLocale } from '@/contexts/LocaleContext';

import { MatchStatsDropdown } from './results/ResultsStatsPanel';
import { RankedProgressionPanel } from './results/RankedProgressionPanel';
import { ResultsHero } from './results/ResultsHero';
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
        <ResultsHero
          playerWon={playerWon}
          isDraw={isDraw}
          resultHeading={resultHeading}
          playerUsername={playerUsername}
          playerAvatar={playerAvatar}
          playerAvatarCustomization={playerAvatarCustomization}
          opponentUsername={opponentUsername}
          opponentAvatar={opponentAvatar}
          opponentAvatarCustomization={opponentAvatarCustomization}
          playerScore={playerScore}
          opponentScore={opponentScore}
          totalGamesLabel={totalGamesLabel}
          preMatchRankedProfile={preMatchRankedProfile}
          playerTier={playerTier}
          opponentTier={opponentTier}
          opponentDisplayRp={opponentDisplayRp}
        />

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


