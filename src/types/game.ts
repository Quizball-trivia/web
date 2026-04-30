import type { components } from "@/types/api.generated";

export type GameMode = 'timeAttack' | 'moneyDrop' | 'categories' | 'survival' | 'countdown' | 'clues' | 'buzzer' | 'trueFalse' | 'emojiGuess' | 'putInOrder';


export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
  target?: number;
  unlockedAt?: string | null;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earned: boolean;
}

type StoredAvatarCustomization = NonNullable<components["schemas"]["UserResponse"]["avatar_customization"]>;

export interface AvatarCustomization extends StoredAvatarCustomization {
  /**
   * Legacy field kept so external URLs (Google avatar) and qb-avatar URIs can pass through.
   * AvatarDisplay decodes this when present.
   */
  base?: string;
}

export interface PlayerStats {
  id: string;
  username: string;
  avatar: string;
  avatarCustomization?: AvatarCustomization;
  profileBackground?: 'bronze' | 'silver' | 'gold' | 'icon'; // FIFA-style profile backgrounds
  ownedBackgrounds?: string[]; // Unlocked profile backgrounds
  coins: number;
  tickets?: number; // Daily tickets for ranked play (10 per day)
  lastTicketReset?: string; // ISO date string for daily reset
  lastSpinDate?: string; // ISO date string for last rewards wheel spin
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalScore: number;
  gamesPlayed: number;
  correctAnswers: number;
  totalQuestionsAttempted?: number;
  currentStreak: number;
  bestStreak: number;
  achievements: Achievement[];
  badges: Badge[];
  rank: number;
  ownedItems: string[]; // IDs of owned shop items
  moneyDropWinnings?: number; // Best Money Drop performance
  rankPoints?: number; // Ranked mode points (Division system)
  completedLevels?: number[]; // IDs of completed career levels
}
