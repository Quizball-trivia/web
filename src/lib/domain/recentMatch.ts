import type { AvatarCustomization } from "@/types/game";
import type { RankedTier } from "@/utils/rankedTier";

export type WinnerDecisionMethod = "goals" | "penalty_goals" | "total_points" | "total_points_fallback" | "forfeit";

export interface RecentMatchOpponent {
  id: string | null;
  username: string;
  avatarUrl: string | null;
  avatarCustomization: AvatarCustomization | null;
  isAi: boolean;
  /** Finishing place in a multi-player (auction) match; null for 1v1. */
  placement: number | null;
}

export interface RecentMatchSummary {
  matchId: string;
  mode: "friendly" | "ranked" | "auction";
  competition: "friendly" | "placement" | "ranked" | "auction";
  status: "completed" | "abandoned";
  result: "win" | "loss" | "draw";
  endedAt: string | null;
  timeLabel: string;
  playerScore: number;
  opponentScore: number;
  playerGoals: number;
  playerPenaltyGoals: number;
  opponentGoals: number;
  opponentPenaltyGoals: number;
  winnerDecisionMethod: WinnerDecisionMethod | null;
  cancelledNoContest: boolean;
  rpDelta: number | null;
  /** Auction: your finishing place (1 = won); null for 1v1 modes. */
  placement: number | null;
  /** Total players (auction = 3). For "1st of N". */
  playerCount: number;
  /** Auction: both opponents you faced; empty for 1v1. */
  opponents: RecentMatchOpponent[];
  opponent: {
    id: string | null;
    username: string;
    avatarUrl: string | null;
    avatarCustomization: AvatarCustomization | null;
    isAi: boolean;
    /** Backend ranked tier of the opponent. Optional until the recent-matches
     *  endpoint includes it; callers fall back to a neutral frame when absent. */
    tier: RankedTier | null;
  };
}
