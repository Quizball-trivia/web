import type { CategorySummary } from "./category";

export interface FeaturedCategory {
  id: string;
  sortOrder?: number;
  category: CategorySummary;
}
