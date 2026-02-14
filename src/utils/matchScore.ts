import type { RecentMatchSummary } from "@/lib/domain/recentMatch";

export interface FormattedMatchScore {
  /** Main score text, e.g. "2-0", "0-0" */
  score: string;
  /** Optional suffix like "(P 3-1)" */
  suffix: string | null;
  /** Optional badge label like "FF" or "ABD" */
  badge: string | null;
  /** Badge color variant */
  badgeVariant: "red" | "muted" | null;
}

export function formatMatchScore(match: Pick<
  RecentMatchSummary,
  "status" | "playerGoals" | "opponentGoals" | "playerPenaltyGoals" | "opponentPenaltyGoals" | "winnerDecisionMethod"
>): FormattedMatchScore {
  const goalScore = `${match.playerGoals}-${match.opponentGoals}`;

  if (match.status === "abandoned") {
    return { score: goalScore, suffix: null, badge: "ABD", badgeVariant: "muted" };
  }

  if (match.winnerDecisionMethod === "forfeit") {
    return { score: goalScore, suffix: null, badge: "FF", badgeVariant: "red" };
  }

  if (match.winnerDecisionMethod === "penalty_goals") {
    const penaltyScore = `${match.playerGoals + match.playerPenaltyGoals}-${match.opponentGoals + match.opponentPenaltyGoals}`;
    return { score: goalScore, suffix: `(P ${penaltyScore})`, badge: null, badgeVariant: null };
  }

  return { score: goalScore, suffix: null, badge: null, badgeVariant: null };
}
