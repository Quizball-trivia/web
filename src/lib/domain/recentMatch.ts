export type WinnerDecisionMethod = "goals" | "penalty_goals" | "total_points_fallback" | "forfeit";

export interface RecentMatchSummary {
  matchId: string;
  mode: "friendly" | "ranked";
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
  opponent: {
    id: string | null;
    username: string;
    avatarUrl: string | null;
    isAi: boolean;
  };
}
