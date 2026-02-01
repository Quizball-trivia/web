export type GameMode = 'timeAttack' | 'moneyDrop' | 'categories' | 'survival' | 'countdown' | 'clues' | 'buzzer' | 'footballJeopardy' | 'trueFalse' | 'emojiGuess' | 'putInOrder';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface AnswerGroup {
  display: string; // The display name for this answer
  accepted: string[]; // All acceptable variations (normalized lowercase)
}

export interface CountdownQuestion {
  id: string;
  category: string;
  prompt: string;
  answerGroups: AnswerGroup[]; // Groups of answers with their display names
  difficulty: Difficulty | 'medium-hard';
  timeLimit?: number; // Time limit in seconds
  pointsPerAnswer?: number; // Points awarded per correct answer
}

export interface Clue {
  type: 'emoji' | 'text' | 'image';
  content: string; // Emoji, text description, or image URL
}

export interface ClueQuestion {
  id: string;
  category: string;
  clues: Clue[]; // 1-5 clues (progressively easier)
  answer: string; // The correct answer (normalized)
  acceptedAnswers: string[]; // All acceptable answer variations (normalized lowercase)
  displayAnswer: string; // The display version of the answer
  difficulty: Difficulty;
}

export interface EmojiQuestion {
  id: string;
  emojis: string; // 2-3 emojis representing the answer
  answerType: 'player' | 'manager' | 'club';
  correctAnswer: string; // The correct answer (normalized)
  acceptedAnswers: string[]; // All acceptable answer variations (normalized lowercase)
  displayAnswer: string; // The display version of the answer
  difficulty: Difficulty;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: Difficulty;
  category: string;
  clue: string;
}

export interface CategoryBox {
  id: string;
  title: string;
  question: Question;
  answered: boolean;
  correct?: boolean;
}

export interface GameState {
  mode: GameMode;
  currentQuestionIndex: number;
  score: number;
  lives: number;
  streak: number;
  timeRemaining: number;
  questions: Question[];
  answeredQuestions: boolean[];
  correctAnswers: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
  target?: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earned: boolean;
}

export interface AvatarCustomization {
  base: string; // Base character emoji
  hat?: string;
  glasses?: string;
  accessory?: string;
  background?: string;
}

export interface ShopItem {
  id: string;
  name: string;
  category: 'hat' | 'glasses' | 'accessory' | 'background' | 'base';
  emoji: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  owned: boolean;
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
  // TODO: lastSpinDate is a stopgap. Preferred fix:
  // - Pass as separate prop from wheel/storage state (not embedded in PlayerStats)
  // - Or derive from actual spin tracking if stored elsewhere
  lastSpinDate?: string; // ISO date string for last rewards wheel spin
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalScore: number;
  gamesPlayed: number;
  correctAnswers: number;
  currentStreak: number;
  bestStreak: number;
  achievements: Achievement[];
  badges: Badge[];
  rank: number;
  ownedItems: string[]; // IDs of owned shop items
  moneyDropWinnings?: number; // Best Money Drop performance
  rankPoints?: number; // Ranked mode points (Division system)
  rankedTier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond'; // Legacy, will be replaced by Division system
  completedLevels?: number[]; // IDs of completed career levels
}

export type MatchType = 'casual' | 'ranked' | 'friendly';
export type PlayMode = 'single' | 'multiplayer';

export interface RoundResult {
  roundNumber: number;
  mode: GameMode;
  player1Score: number;
  player2Score: number;
  winner: 'player1' | 'player2' | 'tie';
}

export interface MultiplayerMatch {
  matchId: string;
  matchType: MatchType;
  player1: {
    id: string;
    username: string;
    avatar: string;
    score: number;
    roundsWon: number;
  };
  player2: {
    id: string;
    username: string;
    avatar: string;
    score: number;
    roundsWon: number;
  };
  currentRound: number;
  roundResults: RoundResult[];
  isComplete: boolean;
  winner?: 'player1' | 'player2';
}

export interface BuzzerPlayer {
  id: string;
  username: string;
  avatar: string;
  score: number;
  buzzedIn: boolean;
  position: number; // 1-4
}

export interface BuzzerGameState {
  matchId: string;
  matchType: MatchType;
  players: BuzzerPlayer[];
  currentQuestionIndex: number;
  totalQuestions: number;
  buzzerPressed: boolean;
  activePlayerId?: string;
  timerActive: boolean;
  isPenaltyRound: boolean;
  gamePhase: 'waiting' | 'showQuestion' | 'buzzerActive' | 'answerPhase' | 'result' | 'complete';
  isComplete: boolean;
  winners?: string[]; // Player IDs of winners
}

// Game result interfaces (shared across game modes)
export interface GameResults {
  score: number;
  correctAnswers: number;
  streak: number;
  finalMoney?: number;
}

export interface BuzzerResultPlayer {
  id: string;
  username: string;
  avatar: string;
  score: number;
  position: number;
}