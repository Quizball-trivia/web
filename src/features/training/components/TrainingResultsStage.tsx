"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ResultsHero } from "@/features/game/results/ResultsHero";
import { MatchStatsDropdown } from "@/features/game/results/ResultsStatsPanel";
import { usePlayer } from "@/contexts/PlayerContext";
import { usePlayerAvatar } from "@/hooks/usePlayerAvatar";
import { useLocale } from "@/contexts/LocaleContext";
import { useTraining } from "../TrainingMatchProvider";
import { BOT_AVATAR, BOT_AVATAR_CUSTOMIZATION, BOT_NAME } from "../constants";

const TOTAL_QUESTIONS = 12;

/**
 * Ranked results screen, training edition: same wrapper/hero/stats as the real
 * RealtimeResultsScreen's friendly variant (tiers hidden, no friend button, no
 * RP panel) but fully local — and only a Main Menu action, like ranked's
 * secondary button.
 */
export function TrainingResultsStage() {
  const { match, tooltips, onSkip, resultsCopy } = useTraining();
  const { player } = usePlayer();
  const { avatarUrl: playerResolvedAvatar, avatarCustomization } = usePlayerAvatar();
  const { t } = useLocale();
  const { state } = match;
  const tooltipFired = useRef(false);

  useEffect(() => {
    if (!tooltipFired.current) {
      tooltipFired.current = true;
      tooltips.tryShowStageTooltip("results");
    }
  }, [tooltips]);

  // Ranked folds penalty goals into the displayed score only when the match
  // actually went to a deciding shootout (i.e. regulation ended level).
  const regulationTied = state.playerGoals === state.opponentGoals;
  const hadPenalties = state.penaltyPlayerGoals !== null && state.penaltyOpponentGoals !== null;
  const decidedByPenalties = hadPenalties && regulationTied;
  const playerScore = state.playerGoals + (decidedByPenalties ? state.penaltyPlayerGoals ?? 0 : 0);
  const opponentScore = state.opponentGoals + (decidedByPenalties ? state.penaltyOpponentGoals ?? 0 : 0);
  const playerWon = playerScore > opponentScore;
  const isDraw = playerScore === opponentScore;
  // Ranked hardcodes English literals here; training localizes since its whole
  // point is teaching in the player's language.
  const resultHeading = playerWon
    ? t("training.resultVictory")
    : isDraw
      ? t("training.resultDraw")
      : t("training.resultDefeat");

  const playerQuestionResults = Array.from(
    { length: TOTAL_QUESTIONS },
    (_, i) => state.playerQuestionResults[i] ?? null,
  );
  const opponentQuestionResults = Array.from(
    { length: TOTAL_QUESTIONS },
    (_, i) => state.opponentQuestionResults[i] ?? null,
  );
  const playerCorrect = playerQuestionResults.filter((r) => r === "correct").length;
  const opponentCorrect = opponentQuestionResults.filter((r) => r === "correct").length;
  const accuracy = Math.round((playerCorrect / TOTAL_QUESTIONS) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-surface-page-alt p-3 md:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
      />
      <div
        aria-hidden
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
          isCancelledNoContest={false}
          resultHeading={resultHeading}
          playerUsername={player.username}
          playerAvatar={playerResolvedAvatar}
          playerAvatarCustomization={avatarCustomization ?? null}
          opponentUsername={BOT_NAME}
          opponentAvatar={BOT_AVATAR}
          opponentAvatarCustomization={BOT_AVATAR_CUSTOMIZATION}
          opponentId="coachbot"
          playerScore={playerScore}
          opponentScore={opponentScore}
          totalGamesLabel={t("results.matchComplete")}
          preMatchRankedProfile={null}
          playerTier={null}
          playerDisplayRp={null}
          opponentTier={null}
          opponentDisplayRp={null}
        />

        {resultsCopy?.message && (
          <p className="mx-auto max-w-[498px] text-center text-sm font-medium text-white/80">
            {resultsCopy.message}
          </p>
        )}

        <div className="mx-auto flex w-full max-w-[498px] flex-col items-stretch gap-3 pt-2 md:gap-4">
          <MatchStatsDropdown
            accuracy={accuracy}
            playerCorrect={playerCorrect}
            opponentCorrect={opponentCorrect}
            totalQuestions={TOTAL_QUESTIONS}
            playerScore={playerScore}
            opponentScore={opponentScore}
            xpEarned={0}
            level={null}
            xpToNextLevel={null}
            playerQuestionResults={playerQuestionResults}
            opponentQuestionResults={opponentQuestionResults}
            t={t}
          />

          <button
            onClick={onSkip}
            className="flex h-[64px] w-full items-center justify-center rounded-[20px] border-[3px] border-brand-green bg-transparent font-poppins font-semibold uppercase text-white text-[1.5rem] transition-colors hover:bg-brand-green/10 md:h-[80px] md:text-[28px]"
          >
            {resultsCopy?.cta ?? t("results.mainMenu")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
