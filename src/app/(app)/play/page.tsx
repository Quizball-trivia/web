"use client";

import { useRouter } from "next/navigation";
import { ModeSelectionScreen } from "@/components/ModeSelectionScreen";
import { usePlayer } from "@/contexts/PlayerContext";
import { useGameSessionStore } from "@/stores/gameSession.store";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getQuestionsListQuery } from "@/lib/queries/questions.queries";
import { useCategoriesList } from "@/lib/queries/categories.queries";
import { useFeaturedCategories } from "@/lib/queries/featuredCategories.queries";
import type { CategorySummary, GameQuestion } from "@/lib/domain";
import type { ListQuestionsQuery } from "@/lib/repositories/questions.repo";
import { QUESTION_COUNT } from "@/lib/constants/game";

export default function PlayPage() {
  const router = useRouter();
  const { player } = usePlayer();
  const startSession = useGameSessionStore((state) => state.startSession);
  const queryClient = useQueryClient();
  const { data: featuredData } = useFeaturedCategories();
  const { data: categoriesData } = useCategoriesList({
    limit: 100,
    page: 1,
    is_active: "true",
  });

  const defaultCategory: CategorySummary | undefined =
    featuredData?.items[0]?.category ?? categoriesData?.items[0];

  const fetchQuestions = async (categoryId?: string) => {
    const filters: ListQuestionsQuery = {
      category_id: categoryId,
      status: "published",
      page: "1",
      limit: String(QUESTION_COUNT),
    };

    const result = await queryClient.fetchQuery(
      getQuestionsListQuery(filters),
    );

    const items = result.items.slice(0, QUESTION_COUNT);
    return items;
  };

  const startMatch = async (params: {
    mode: "solo" | "ranked" | "quizball" | "buzzer";
    matchType: "casual" | "ranked" | "friendly";
  }) => {
    if (!defaultCategory) {
      toast.error("Unable to load categories. Please try again.");
      return;
    }

    let questions: GameQuestion[] = [];
    try {
      const fetched = await fetchQuestions(defaultCategory.id);
      questions = fetched.map((question) => ({
        ...question,
        categoryName: defaultCategory.name,
      }));
    } catch {
      toast.error("Unable to load questions. Please try again.");
      return;
    }

    if (questions.length === 0) {
      toast.error("No questions available for this category.");
      return;
    }

    const baseConfig = {
      categoryId: defaultCategory.id,
      categoryName: defaultCategory.name,
      categoryIcon: defaultCategory.icon || "⚽",
      questionCount: QUESTION_COUNT,
    };

    startSession({ ...params, ...baseConfig }, questions);
    router.push("/game");
  };

  return (
    <ModeSelectionScreen
      onSelectMode={(mode) => {
        if (mode === "solo") {
          void startMatch({ mode: "solo", matchType: "casual" });
          return;
        }
        if (mode === "ranked") {
          void startMatch({ mode: "ranked", matchType: "ranked" });
          return;
        }
        void startMatch({ mode: "quizball", matchType: "friendly" });
      }}
      onSelectFriendGameMode={(mode) => {
        if (mode === "buzzerBattle") {
          void startMatch({ mode: "buzzer", matchType: "friendly" });
          return;
        }
        void startMatch({ mode: "quizball", matchType: "friendly" });
      }}
      ticketsRemaining={player.tickets || 0}
    />
  );
}
