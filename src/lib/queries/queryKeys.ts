import type { ListCategoriesQuery } from "@/lib/repositories/categories.repo";
import type { ListQuestionsQuery } from "@/lib/repositories/questions.repo";
import type { LeaderboardType } from "@/lib/domain/leaderboard";

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
  leaderboard: {
    all: ["leaderboard"] as const,
    list: (type: LeaderboardType) =>
      [...queryKeys.leaderboard.all, "list", type] as const,
    user: (userId: string, type?: LeaderboardType) =>
      [...queryKeys.leaderboard.all, "user", userId, type ?? "global"] as const,
  },
  ranked: {
    all: ["ranked"] as const,
    profile: () => [...queryKeys.ranked.all, "profile"] as const,
    ranks: () => [...queryKeys.ranked.all, "ranks"] as const,
  },
  users: {
    all: ["users"] as const,
    publicProfile: (userId: string) =>
      [...queryKeys.users.all, "publicProfile", userId] as const,
    achievements: (userId?: string) =>
      [...queryKeys.users.all, "achievements", userId ?? "me"] as const,
  },
  stats: {
    all: ["stats"] as const,
    summary: () => [...queryKeys.stats.all, "summary"] as const,
    headToHead: (userAId: string, userBId: string) => {
      const [first, second] = [userAId, userBId].sort();
      return [...queryKeys.stats.all, "headToHead", first, second] as const;
    },
    recentMatches: (limit: number, userId?: string) =>
      [...queryKeys.stats.all, "recentMatches", limit, userId ?? "me"] as const,
  },
  store: {
    all: ["store"] as const,
    products: () => [...queryKeys.store.all, "products"] as const,
    wallet: () => [...queryKeys.store.all, "wallet"] as const,
    inventory: () => [...queryKeys.store.all, "inventory"] as const,
  },
};
