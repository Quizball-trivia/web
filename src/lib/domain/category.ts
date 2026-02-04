export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string;
  imageUrl?: string | null;
  rank?: number;
  playerCount?: number;
  popularity?: number;
  totalPlayers?: number;
  yourBestScore?: number;
  yourRank?: number;
  leaderboardTop?: {
    rank: number;
    username: string;
    avatar: string;
    score: number;
  }[];
  isNew?: boolean;
  trending?: boolean;
}
