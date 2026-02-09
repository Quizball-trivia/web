export interface ModeMatchStatsSummary {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export interface MatchStatsSummary {
  overall: ModeMatchStatsSummary;
  ranked: ModeMatchStatsSummary;
  friendly: ModeMatchStatsSummary;
}
