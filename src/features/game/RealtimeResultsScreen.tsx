"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';

import { useLocale } from '@/contexts/LocaleContext';
import {
  trackRankedLossRecoveryPlayAgainClicked,
  trackRankedLossRecoveryPromptShown,
} from '@/lib/analytics/game-events';
import {
  getRankedLossRecoveryCue,
  loadRankedLossRecoveryExperimentVariant,
  type RankedLossRecoveryExperimentVariant,
} from '@/lib/experiments/rankedLossRecoveryExperiment';
import {
  getWlQpToastCue,
  loadWlQpToastExperimentVariant,
  type WlQpToastExperimentVariant,
} from '@/lib/experiments/wlQpToastExperiment';
import { WlQpToast } from '@/features/weekend-league/components/WlQpToast';
import { trackWlQpToastClicked, trackWlQpToastShown } from '@/lib/analytics/game-events';
import { useAuthStore } from '@/stores/auth.store';

import { RankedProgressionPanel } from './results/RankedProgressionPanel';
import { ResultsActions } from './results/ResultsActions';
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
    opponentId,
    playerScore,
    opponentScore,
    playerCorrect,
    opponentCorrect,
    totalQuestions,
    playerQuestionResults,
    opponentQuestionResults,
    preMatchRankedProfile,
    unlockedAchievements = [],
    playAgainDisabled = false,
    playAgainHint = null,
    winStreakCount = null,
    qpToastSlot,
    onPlayAgain,
    onMainMenu,
  } = props;
  const { t } = useLocale();
  const {
    playerWon,
    isDraw,
    isCancelledNoContest,
    resultHeading,
    refundedTickets,
    totalGamesLabel,
    showRankedRpCard,
    rpChange,
    coinsAwarded,
    qpAwarded,
    myOutcome,
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
    playerDisplayRp,
    opponentTier,
    opponentDisplayRp,
    showRankReveal,
    tierTransitionPhase,
  } = useMatchResultViewModel(props);
  const createdAt = useAuthStore((state) => state.user?.created_at);
  const [lossRecoveryVariant, setLossRecoveryVariant] =
    useState<RankedLossRecoveryExperimentVariant>('not_enrolled');
  const lossRecoveryAssignmentRef =
    useRef<Promise<RankedLossRecoveryExperimentVariant> | null>(null);
  const trackedLossRecoveryRef = useRef(false);
  const lossRecoveryCue = useMemo(() => getRankedLossRecoveryCue({
    matchType,
    playerWon,
    isDraw,
    isCancelledNoContest,
    isPlacementMatch,
    oldRp: oldRP,
    newRp: newRP,
  }), [
    isCancelledNoContest,
    isDraw,
    isPlacementMatch,
    matchType,
    newRP,
    oldRP,
    playerWon,
  ]);

  useEffect(() => {
    if (!lossRecoveryCue) return;
    if (!lossRecoveryAssignmentRef.current) {
      lossRecoveryAssignmentRef.current = loadRankedLossRecoveryExperimentVariant(createdAt);
    }
    let active = true;
    void lossRecoveryAssignmentRef.current.then((variant) => {
      if (active) setLossRecoveryVariant(variant);
    });
    return () => {
      active = false;
    };
  }, [createdAt, lossRecoveryCue]);

  useEffect(() => {
    if (
      lossRecoveryVariant !== 'test'
      || !lossRecoveryCue
      || trackedLossRecoveryRef.current
    ) return;
    trackedLossRecoveryRef.current = true;
    trackRankedLossRecoveryPromptShown(lossRecoveryCue);
  }, [lossRecoveryCue, lossRecoveryVariant]);

  const visibleLossRecoveryCue = lossRecoveryVariant === 'test'
    ? lossRecoveryCue
    : null;

  // WL acquisition Test A: QP-earned toast between the RP panel and actions.
  // Only loads its flag once a ranked match actually banked QP (no accidental
  // exposures on friendlies/cancellations), same shape as loss-recovery above.
  const country = useAuthStore((state) => state.user?.country);
  const [qpToastVariant, setQpToastVariant] =
    useState<WlQpToastExperimentVariant>('not_enrolled');
  const qpToastAssignmentRef =
    useRef<Promise<WlQpToastExperimentVariant> | null>(null);
  const trackedQpToastRef = useRef(false);
  const qpToastCue = useMemo(() => getWlQpToastCue({
    matchType,
    isCancelledNoContest,
    qpAwarded,
    qpWeekTotal: myOutcome?.qpWeekTotal ?? null,
  }), [isCancelledNoContest, matchType, myOutcome?.qpWeekTotal, qpAwarded]);

  useEffect(() => {
    // A supplied slot (dev playground) replaces the experiment entirely —
    // loading the flag for it would record a phantom PostHog exposure.
    if (qpToastSlot !== undefined || !qpToastCue) return;
    if (!qpToastAssignmentRef.current) {
      qpToastAssignmentRef.current = loadWlQpToastExperimentVariant({ country, createdAt });
    }
    let active = true;
    void qpToastAssignmentRef.current.then((variant) => {
      if (active) setQpToastVariant(variant);
    });
    return () => {
      active = false;
    };
  }, [country, createdAt, qpToastCue, qpToastSlot]);

  const qpToast = qpToastSlot
    ?? (qpToastVariant === 'test' && qpToastCue
      ? (
        <WlQpToast
          gainedQp={qpToastCue.gainedQp}
          previousQp={qpToastCue.previousQp}
          onShown={() => {
            // Counted only once the entrance animation lands — a player who
            // bailed during the 450ms delay was never actually shown it.
            if (trackedQpToastRef.current) return;
            trackedQpToastRef.current = true;
            trackWlQpToastShown(qpToastCue.gainedQp, qpToastCue.previousQp + qpToastCue.gainedQp);
          }}
          onOpen={() => trackWlQpToastClicked(qpToastCue.previousQp + qpToastCue.gainedQp)}
        />
      )
      : null);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-page-alt p-3 md:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
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
          isCancelledNoContest={isCancelledNoContest}
          resultHeading={resultHeading}
          playerUsername={playerUsername}
          playerAvatar={playerAvatar}
          playerAvatarCustomization={playerAvatarCustomization}
          opponentUsername={opponentUsername}
          opponentAvatar={opponentAvatar}
          opponentAvatarCustomization={opponentAvatarCustomization}
          opponentId={opponentId}
          showAddFriendButton={matchType === 'ranked' && !isCancelledNoContest}
          playerScore={playerScore}
          opponentScore={opponentScore}
          totalGamesLabel={totalGamesLabel}
          preMatchRankedProfile={preMatchRankedProfile}
          playerTier={playerTier}
          playerDisplayRp={playerDisplayRp}
          opponentTier={opponentTier}
          opponentDisplayRp={opponentDisplayRp}
        />

        <RankedProgressionPanel
          matchType={matchType}
          t={t}
          avatarCustomization={playerAvatarCustomization ?? { base: playerAvatar }}
          showRankedRpCard={showRankedRpCard}
          isCancelledNoContest={isCancelledNoContest}
          rpChange={rpChange}
          coinsAwarded={coinsAwarded}
          qpAwarded={qpAwarded}
          refundedTickets={refundedTickets}
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

        {qpToast}

        <ResultsActions
          t={t}
          unlockedAchievements={unlockedAchievements}
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
          playAgainDisabled={playAgainDisabled}
          playAgainHint={playAgainHint}
          winStreakCount={playerWon ? winStreakCount : null}
          lossRecoveryCue={visibleLossRecoveryCue}
          onPlayAgain={() => {
            if (visibleLossRecoveryCue) {
              trackRankedLossRecoveryPlayAgainClicked({
                rpToRecover: visibleLossRecoveryCue.rpToRecover,
              });
            }
            return onPlayAgain();
          }}
          onMainMenu={onMainMenu}
        />
      </motion.div>
    </div>
  );
}
