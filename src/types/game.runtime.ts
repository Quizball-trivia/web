export type GameStage =
  | "idle"
  | "matchmaking"
  | "categoryBlocking"
  | "showdown"
  | "roundIntro"
  | "playing"
  | "roundResult"
  | "roundTransition"
  | "finalResults";

export type GameMode = "solo" | "ranked" | "buzzer" | "quizball";

export type MatchType = "casual" | "ranked" | "friendly";

export interface GameConfig {
  mode: GameMode;
  matchType?: MatchType;
  categoryId?: string;
  categoryIds?: string[];
  categoryName?: string;
  categoryIcon?: string;
  difficulty?: "easy" | "medium" | "hard" | string;
  questionCount?: number;
  opponentId?: string;
  opponentUsername?: string;
  opponentAvatar?: string;
}

export interface RuntimeQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  categoryId?: string;
  categoryName?: string;
  difficulty?: string;
}

export interface RuntimeAnswer {
  questionId: string;
  selectedIndex: number | null;
  isCorrect?: boolean;
  timeMs?: number;
}
