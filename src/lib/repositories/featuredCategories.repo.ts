import { api } from "@/utils/api";
import type { components } from "@/types/api.generated";

export type FeaturedCategoryResponse =
  components["schemas"]["FeaturedCategoryResponse"];

export async function listFeaturedCategories() {
  return api.GET("/api/v1/featured-categories");
}
