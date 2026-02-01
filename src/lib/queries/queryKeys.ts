import type { ListCategoriesQuery } from "@/lib/repositories/categories.repo";
import type { ListQuestionsQuery } from "@/lib/repositories/questions.repo";

export const queryKeys = {
  categories: {
    all: ["categories"] as const,
    list: (filters?: ListCategoriesQuery) =>
      [...queryKeys.categories.all, "list", filters ?? {}] as const,
    detail: (id: string) =>
      [...queryKeys.categories.all, "detail", id] as const,
    dependencies: (id: string) =>
      [...queryKeys.categories.all, "dependencies", id] as const,
  },
  featuredCategories: {
    all: ["featuredCategories"] as const,
    list: () =>
      [...queryKeys.featuredCategories.all, "list"] as const,
  },
  questions: {
    all: ["questions"] as const,
    list: (filters?: ListQuestionsQuery) =>
      [...queryKeys.questions.all, "list", filters ?? {}] as const,
    detail: (id: string) =>
      [...queryKeys.questions.all, "detail", id] as const,
  },
};
