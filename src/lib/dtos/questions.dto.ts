import type { GameQuestion } from "@/lib/domain";

export interface QuestionsListDTO {
  items: GameQuestion[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
