export interface RecentMatchSummary {
  matchId: string;
  mode: "friendly" | "ranked";
  status: "completed" | "abandoned";
  result: "win" | "loss" | "draw";
  endedAt: string | null;
  timeLabel: string;
  playerScore: number;
  opponentScore: number;
  opponent: {
    id: string | null;
    username: string;
    avatarUrl: string | null;
    isAi: boolean;
  };
}
