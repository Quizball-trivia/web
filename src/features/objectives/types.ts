export interface ObjectiveRewards {
  coins?: number;
  xp?: number;
  badge?: string;
  item?: string;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  category: ObjectiveCategory;
  icon: string; // lucide icon name
  iconColor: string;
  progress: number;
  target: number;
  completed: boolean;
  rewards: ObjectiveRewards;
  difficulty: ObjectiveDifficulty;
  expiresIn?: number;
}

export type ObjectiveCategory = 'daily' | 'weekly' | 'season' | 'lifetime';
export type ObjectiveDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface PlayerProgress {
  questionsStreak?: number;
  rankedWins?: number;
  careerLevelsCompleted?: number;
  totalGamesPlayed?: number;
  perfectScores?: number;
  friendsInvited?: number;
}
