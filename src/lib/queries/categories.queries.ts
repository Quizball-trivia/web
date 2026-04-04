import { useQuery } from "@tanstack/react-query";
import type { CategoriesListDTO } from "@/lib/dtos/categories.dto";
import type { CategoryDependenciesDTO } from "@/lib/dtos/categoryDependencies.dto";
import type { CategorySummary } from "@/lib/domain";
import {
  getCategory,
  getCategoryDependencies,
  listCategories,
  type ListCategoriesQuery,
} from "@/lib/repositories/categories.repo";
import {
  toCategorySummary,
  toCategorySummaryFromDependency,
} from "@/lib/mappers/category.mapper";
import {
  toGameQuestionFromDependency,
} from "@/lib/mappers/question.mapper";
import { queryKeys } from "@/lib/queries/queryKeys";

export const getCategoriesListQuery = (filters?: ListCategoriesQuery) => ({
  queryKey: queryKeys.categories.list(filters),
  queryFn: async (): Promise<CategoriesListDTO> => {
    const data = await listCategories(filters);
    return {
      items: data.data.map((category) => toCategorySummary(category)),
      page: data.page,
      limit: data.limit,
      total: data.total,
      totalPages: data.total_pages,
    };
  },
});

export function useCategoriesList(filters?: ListCategoriesQuery) {
  return useQuery(getCategoriesListQuery(filters));
}

export const getAllCategoriesListQuery = (filters?: ListCategoriesQuery) => ({
  queryKey: [...queryKeys.categories.list(filters), "all-pages"],
  queryFn: async (): Promise<CategoriesListDTO> => {
    const baseFilters = { ...filters };
    const requestedLimit = Number(baseFilters.limit ?? 100);
    const firstPage = await listCategories({ ...baseFilters, page: 1, limit: requestedLimit });
    const items = firstPage.data.map((category) => toCategorySummary(category));
    const totalPages = firstPage.total_pages ?? 1;

    if (totalPages > 1) {
      for (let page = 2; page <= totalPages; page += 1) {
        const data = await listCategories({ ...baseFilters, page, limit: requestedLimit });
        items.push(...data.data.map((category) => toCategorySummary(category)));
      }
    }

    return {
      items,
      page: 1,
      limit: requestedLimit,
      total: firstPage.total,
      totalPages,
    };
  },
});

export function useAllCategoriesList(filters?: ListCategoriesQuery) {
  return useQuery(getAllCategoriesListQuery(filters));
}

export const getCategoryQuery = (id: string) => ({
  queryKey: queryKeys.categories.detail(id),
  queryFn: async (): Promise<CategorySummary> => {
    const data = await getCategory(id);
    return toCategorySummary(data);
  },
  enabled: Boolean(id),
});

export function useCategory(id?: string) {
  return useQuery({
    ...getCategoryQuery(id ?? ""),
    enabled: Boolean(id),
  });
}

export const getCategoryDependenciesQuery = (id: string) => ({
  queryKey: queryKeys.categories.dependencies(id),
  queryFn: async (): Promise<CategoryDependenciesDTO> => {
    const data = await getCategoryDependencies(id);
    return {
      children: data.children.map((child) =>
        toCategorySummaryFromDependency(child),
      ),
      questions: data.questions.map((question) =>
        toGameQuestionFromDependency(question),
      ),
      featured: data.featured,
    };
  },
  enabled: Boolean(id),
});

export function useCategoryDependencies(id?: string) {
  return useQuery({
    ...getCategoryDependenciesQuery(id ?? ""),
    enabled: Boolean(id),
  });
}
