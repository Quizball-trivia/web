"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { resolveMatchOutcome } from "@/lib/domain/matchOutcome";
import { ResultsHero } from "@/features/game/results/ResultsHero";
import { ResultsScreenFrame } from "@/features/game/results/ResultsScreenFrame";
import { MatchStatsDropdown } from "@/features/game/results/ResultsStatsPanel";
import type { MatchResultSummary } from "@/features/game/results/results.types";
import { PartnerPointsCount } from "../../components/PartnerPointsCount";
import { partnerCopy, toPartnerLocale } from "../../partnerCopy";
import { FREECROCO_HOME_PATH } from "../../partnerGames";
import { rankedCopy } from "./rankedCopy";

export type PartnerRankedPoints =
  | { status: "settling" }
  | { status: "settled"; score: number }
  | { status: "unavailable" };

/** The Quizball match result (hero, score, match stats) with Freecroco points in place of RP, XP and coins. */
export function PartnerRankedMatchResult({
  summary,
  points,
  onExit,
}: {
  summary: MatchResultSummary;
  points: PartnerRankedPoints;
  onExit: () => void;
}) {
  const { locale, t } = useLocale();
  const partnerLocale = toPartnerLocale(locale);
  const copy = rankedCopy(partnerLocale);
  const outcome = resolveMatchOutcome({
    winnerUserId: summary.finalWinnerId,
    selfUserId: summary.selfUserId,
    winnerDecisionMethod: summary.winnerDecisionMethod,
    isDraw: summary.isDraw,
    playerScore: summary.playerScore,
    opponentScore: summary.opponentScore,
  });
  const isDraw = outcome === "draw";
  const isShootoutDraw = isDraw && (summary.winnerDecisionMethod === "draw" || summary.isDraw === true);
  const accuracy = summary.totalQuestions === 0
    ? 0
    : Math.round((summary.playerCorrect / summary.totalQuestions) * 100);

  return (
    <ResultsScreenFrame>
      <ResultsHero
        playerWon={outcome === "win"}
        isDraw={isDraw}
        isCancelledNoContest={false}
        resultHeading={outcome === "win" ? copy.victory : isDraw ? copy.draw : copy.defeat}
        resultSubheading={isShootoutDraw ? t("possession.resultDrawSubtitle") : null}
        playerUsername={summary.playerUsername}
        playerAvatar={summary.playerAvatar}
        playerAvatarCustomization={summary.playerAvatarCustomization ?? null}
        opponentUsername={summary.opponentUsername}
        opponentAvatar={summary.opponentAvatar}
        opponentAvatarCustomization={summary.opponentAvatarCustomization ?? null}
        opponentId=""
        playerScore={summary.playerScore}
        opponentScore={summary.opponentScore}
        totalGamesLabel={t("results.matchComplete")}
        preMatchRankedProfile={null}
        playerTier={null}
        playerDisplayRp={null}
        opponentTier={null}
        opponentDisplayRp={null}
      />

      <div
        className="mx-auto flex w-full max-w-[720px] flex-col items-center pt-6 text-center md:pt-8"
        data-testid="partner-ranked-result"
      >
        <div className="font-poppins text-[11px] font-semibold uppercase text-white/60 sm:text-[13px] md:text-[14px]">
          {partnerCopy(partnerLocale).pointsLabel}
        </div>
        {points.status === "settled" ? (
          <PartnerPointsCount
            score={points.score}
            locale={partnerLocale}
            delayMs={600}
            className="mt-1 text-[44px] leading-none sm:text-[56px] md:text-[64px]"
          />
        ) : points.status === "settling" ? (
          <div className="mt-3 flex items-center gap-2" data-testid="partner-ranked-settling">
            <Loader2 className="size-5 animate-spin text-brand-yellow" aria-hidden />
            <span className="font-poppins text-sm text-white/70">{copy.settling}</span>
          </div>
        ) : (
          <p className="mt-2 max-w-sm font-poppins text-sm text-white/70">{copy.resultUnavailable}</p>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-[498px] flex-col items-stretch gap-3 pt-2 md:gap-4">
        <MatchStatsDropdown
          accuracy={accuracy}
          playerCorrect={summary.playerCorrect}
          opponentCorrect={summary.opponentCorrect}
          totalQuestions={summary.totalQuestions}
          playerScore={summary.playerScore}
          opponentScore={summary.opponentScore}
          playerQuestionResults={summary.playerQuestionResults}
          opponentQuestionResults={summary.opponentQuestionResults}
          t={t}
        />
        <Link
          href={FREECROCO_HOME_PATH}
          onClick={(event) => {
            // The kit's exit also refreshes the plays left on the games list.
            event.preventDefault();
            onExit();
          }}
          className="flex h-[64px] w-full items-center justify-center rounded-[20px] bg-brand-green px-4 font-poppins text-[1.5rem] font-semibold uppercase text-white transition-colors hover:bg-brand-green/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:h-[80px] md:text-[28px]"
        >
          {copy.back}
        </Link>
      </div>
    </ResultsScreenFrame>
  );
}
