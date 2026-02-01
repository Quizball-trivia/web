import type { CategorySummary, GameQuestion } from "@/lib/domain";

export interface CategoryDependenciesDTO {
  children: CategorySummary[];
  questions: GameQuestion[];
  featured: boolean;
}
