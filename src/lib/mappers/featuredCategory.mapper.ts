import type { components } from "@/types/api.generated";
import type { FeaturedCategory } from "@/lib/domain";
import { toCategorySummary } from "@/lib/mappers/category.mapper";

type FeaturedCategoryResponse =
  components["schemas"]["FeaturedCategoryResponse"];

export function toFeaturedCategory(
  featured: FeaturedCategoryResponse,
  locale = "en",
): FeaturedCategory {
  return {
    id: featured.id,
    sortOrder: featured.sort_order,
    category: toCategorySummary(featured.category, locale),
  };
}
