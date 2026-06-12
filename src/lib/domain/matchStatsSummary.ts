export interface ModeMatchStatsSummary {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

/** Ranked W/D/L split at the World Cup event START.
 *  `regular` = ranked games before the event began (the normal ranked record);
 *  `event`   = ranked games played during the event. */
export interface RankedSeasonSplit {
  regular: ModeMatchStatsSummary;
  event: ModeMatchStatsSummary;
}

export interface MatchStatsSummary {
  overall: ModeMatchStatsSummary;
  ranked: ModeMatchStatsSummary;
  friendly: ModeMatchStatsSummary;
  /** Present once the backend stats split ships; optional for back-compat. */
  rankedSeasons?: RankedSeasonSplit;
}
