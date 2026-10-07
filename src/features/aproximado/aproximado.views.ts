import type { AvatarCustomization } from "@/types/game";
import type { AproximadoQuestion, RoundResult, Scoring, SeatStatus, Standing } from "./aproximado.rules";

/**
 * What one seat's screen gets about the question: an explicit allow-list (the server builds it field by field, never by
 * spreading the stored item), so the value and the exact window can never ride along.
 */
export type PublicQuestion = Pick<AproximadoQuestion, "id" | "kind" | "prompt" | "unit" | "precision">;
export const toPublicQuestion = (q: AproximadoQuestion): PublicQuestion => ({ id: q.id, kind: q.kind, prompt: q.prompt, unit: q.unit, precision: q.precision });

export interface RoomSeatView {
  seat: number;
  name: string;
  avatar: AvatarCustomization;
  status: SeatStatus;
  /** Answered this round (the guess itself stays hidden until the reveal). */
  answered: boolean;
  /** Two rounds in a row without a guess: the early close stops waiting for this seat. */
  idle: boolean;
  score: number;
}

export interface AproximadoRoomView {
  phase: "intro" | "guess" | "reveal" | "over";
  round: number;
  totalRounds: number;
  scoring: Scoring;
  question: PublicQuestion;
  seats: RoomSeatView[];
  mySeat: number;
  /** My own guess this round (only mine). */
  myGuess: number | null;
  /** Present only in the reveal: every guess and the value of THIS round. Must be null while guessing. */
  reveal: RoundResult | null;
  /** Only rounds already revealed (never the open one). */
  results: RoundResult[];
  standings: Standing[] | null;
}
