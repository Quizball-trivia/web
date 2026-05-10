export type {
  ObjectivePeriod,
  ObjectivePeriodType as ObjectiveCategory,
  ObjectiveProgress as Objective,
  ObjectivesResponse,
} from "@/lib/domain/objective";

export type ObjectiveDifficulty = "easy" | "medium" | "hard" | "expert";
export interface PlayerProgress {
  questionsStreak?: number;
  rankedWins?: number;
  careerLevelsCompleted?: number;
  totalGamesPlayed?: number;
  perfectScores?: number;
  friendsInvited?: number;
}
