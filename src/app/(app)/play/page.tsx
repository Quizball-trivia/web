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
import { queryKeys } from "@/lib/queries/queryKeys";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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
    // For ranked mode, start matchmaking without pre-fetching questions
    // Questions will be fetched after category blocking
    if (params.mode === "ranked") {
      startSession({
        ...params,
        questionCount: QUESTION_COUNT,
      });
      router.push("/game");
      return;
    }

    // For other modes, use default category
    const selectedCategory = defaultCategory;

    if (!selectedCategory) {
      toast.error("Unable to load categories. Please try again.");
      return;
    }

    // Invalidate questions cache to ensure fresh data each game
    await queryClient.invalidateQueries({
      queryKey: queryKeys.questions.all,
    });

    let questions: GameQuestion[] = [];
    try {
      const fetched = await fetchQuestions(selectedCategory.id);
      // Shuffle questions for randomized order
      const shuffledQuestions = shuffleArray(fetched);
      questions = shuffledQuestions.map((question) => ({
        ...question,
        categoryName: selectedCategory.name,
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
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      categoryIcon: selectedCategory.icon || "⚽",
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
        // Multiple Choice (QuizBall) - navigate to categories to pick a category first
        router.push("/categories");
      }}
      ticketsRemaining={player.tickets || 0}
    />
  );
}
