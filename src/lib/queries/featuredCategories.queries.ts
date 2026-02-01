import { useQuery } from "@tanstack/react-query";
import type { FeaturedCategoriesDTO } from "@/lib/dtos/featuredCategories.dto";
import { listFeaturedCategories } from "@/lib/repositories/featuredCategories.repo";
import { toFeaturedCategory } from "@/lib/mappers/featuredCategory.mapper";
import { queryKeys } from "@/lib/queries/queryKeys";

export const getFeaturedCategoriesQuery = () => ({
  queryKey: queryKeys.featuredCategories.list(),
  queryFn: async (): Promise<FeaturedCategoriesDTO> => {
    const data = await listFeaturedCategories();
    return {
      items: data.map((item) => toFeaturedCategory(item)),
    };
  },
});

export function useFeaturedCategories() {
  return useQuery(getFeaturedCategoriesQuery());
}
