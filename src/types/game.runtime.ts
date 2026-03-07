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

export type GameMode = "solo" | "ranked" | "buzzer" | "quizball" | "training";

export type MatchType = "ranked" | "friendly";

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