import { api } from "@/utils/api";
import type { components, paths } from "@/types/api.generated";

export type ListCategoriesQuery =
  paths["/api/v1/categories"]["get"]["parameters"]["query"];
export type CategoryResponse = components["schemas"]["CategoryResponse"];
export type PaginatedCategoriesResponse =
  components["schemas"]["PaginatedCategoriesResponse"];
export type CategoryDependenciesResponse =
  components["schemas"]["CategoryDependenciesResponse"];

export async function listCategories(query?: ListCategoriesQuery) {
  return api.GET("/api/v1/categories", { query });
}

export async function getCategory(id: string) {
  return api.GET("/api/v1/categories/{id}", { params: { id } });
}

export async function getCategoryDependencies(id: string) {
  return api.GET("/api/v1/categories/{id}/dependencies", { params: { id } });
}
