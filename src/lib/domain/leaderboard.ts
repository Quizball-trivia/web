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
  total: number;
}

export type LeaderboardType = 'global' | 'country';

/** Which board a player list is read from. */
export type BoardScope =
  | { kind: 'global' }
  | { kind: 'country'; country: string }
  | { kind: 'club'; club: string };

export type BoardKind = BoardScope['kind'];

/** Players ranked inside a board, or the nations/clubs ranked against each other. */
export type BoardView = 'players' | 'standings';

/** One nation or club in the standings; `score` is the sum of its top 10 players. */
export interface LeaderboardStanding {
  key: string;
  rank: number;
  players: number;
  score: number;
  topPlayer: { username: string; points: number } | null;
  isMine: boolean;
}

/** The viewer's place on the selected board, plus the next player to catch. */
export interface BoardStanding {
  rank: number;
  total: number;
  nextTarget: { username: string; rank: number; gap: number } | null;
  /** Standings only: where the viewer's points sit inside the group's top 10. */
  topTenSlot: number | null;
  /** Points still needed to enter the group's top 10, when outside it. */
  topTenGap: number | null;
  /** Standings only: the viewer's live points in this mode. */
  livePoints?: number | null;
}
