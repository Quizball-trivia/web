export interface LeaderboardEntry {
  id: string;
  rank: number;
  username: string;
  avatar?: string;
  level: number;
  rankPoints: number;
  isCurrentUser: boolean;
  trend: 'up' | 'down' | 'same';
  trendValue: number;
}

export type LeaderboardType = 'global' | 'country' | 'friends';
