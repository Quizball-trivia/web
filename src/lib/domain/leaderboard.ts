import type { AvatarCustomization } from "@/types/game";

export interface LeaderboardEntry {
  id: string;
  rank: number;
  username: string;
  avatar?: string;
  avatarCustomization?: AvatarCustomization | null;
  country?: string | null;
  tier: string;
  rankPoints: number;
  isCurrentUser: boolean;
  trend: 'up' | 'down' | 'same';
  trendValue: number;
}

/** User's own rank information, always marked as current user */
export interface UserRank extends Omit<LeaderboardEntry, 'isCurrentUser'> {
  isCurrentUser: true;
}

export type LeaderboardType = 'global' | 'country';
