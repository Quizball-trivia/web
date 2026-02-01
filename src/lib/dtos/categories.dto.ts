import type { CategorySummary } from "@/lib/domain";

export interface CategoriesListDTO {
  items: CategorySummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
