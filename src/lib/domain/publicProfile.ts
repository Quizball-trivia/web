import type { MatchStatsSummary } from "./matchStatsSummary";
import type { HeadToHeadSummary } from "./headToHead";
import type { UserProgression } from "./progression";

export interface RankPosition {
  rank: number;
  total: number;
}

export interface PublicProfile {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  country: string | null;
  favoriteClub: string | null;
  progression: UserProgression;
  ranked: {
    rp: number;
    tier: string;
    placementStatus: string;
    placementPlayed: number;
    placementRequired: number;
    placementWins: number;
    currentWinStreak: number;
    lastRankedMatchAt: string | null;
  } | null;
  stats: MatchStatsSummary;
  headToHead: HeadToHeadSummary | null;
  globalRank: RankPosition | null;
  countryRank: RankPosition | null;
}
