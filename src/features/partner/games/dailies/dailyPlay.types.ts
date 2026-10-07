import type { PartnerGameId } from "../../api/partnerApi.types";

/** One play as the server shows it (backend daily-play.service.ts `DailyPlayView`): never an answer before it is given. */
export interface PartnerDailyPlay<Item = unknown, Reveal = unknown> {
  playId: string;
  gameId: PartnerGameId;
  state: "playing" | "finished" | "cancelled";
  itemCount: number;
  secondsPerItem: number;
  index: number;
  score: number;
  item: Item | null;
  resolved: boolean;
  reveal: Reveal | null;
  itemPoints: number | null;
  remainingMs: number;
}

export interface PartnerDailyAnswerResult<Item = unknown, Reveal = unknown, Feedback = unknown> {
  play: PartnerDailyPlay<Item, Reveal>;
  feedback: Feedback | null;
  late: boolean;
}

export interface TrueFalseItem { category: string; prompt: string; trueLabel: string; falseLabel: string }
export interface TrueFalseReveal { correctAnswer: boolean; picked: boolean | null; correct: boolean }

export interface PickEmItem { category: string; prompt: string; options: Array<{ id: string; text: string }> }
export interface PickEmReveal { correctOptionIds: string[]; picked: string[]; correct: boolean }

export interface CareerPathItem { category: string; clubs: string[]; clubMatchNames: string[] }
export interface CareerPathReveal { displayAnswer: string; correct: boolean }

export interface HigherLowerItem {
  category: string;
  statLabel: string;
  prompt: string;
  matchupIndex: number;
  matchupCount: number;
  left: string;
  right: string;
  passed: Array<{ leftValue: number; rightValue: number; pick: "left" | "right"; correct: boolean }>;
}
export interface HigherLowerReveal { cleared: boolean; matchupsPassed: number }
export interface HigherLowerFeedback { correct: boolean; leftValue: number; rightValue: number }

export interface CountdownItem { category: string; prompt: string; found: string[] }
export interface CountdownReveal { found: string[] }
export interface CountdownFeedback { accepted: boolean; display?: string; capped?: boolean; limited?: boolean }
