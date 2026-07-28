export interface ModeMatchStatsSummary {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export interface RankedSeasonSplit {
  current: ModeMatchStatsSummary;
  previous: ModeMatchStatsSummary;
  currentSeasonNumber: number;
  previousSeasonNumber: number | null;
}

export interface MatchStatsSummary {
  overall: ModeMatchStatsSummary;
  ranked: ModeMatchStatsSummary;
  friendly: ModeMatchStatsSummary;
  rankedSeasons?: RankedSeasonSplit;
}
