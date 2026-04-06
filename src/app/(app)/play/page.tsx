"use client";

// import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModeSelectionScreen } from "@/features/play/ModeSelectionScreen";
import { usePlayer } from "@/contexts/PlayerContext";
import { useGameSessionStore } from "@/stores/gameSession.store";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getQuestionsListQuery } from "@/lib/queries/questions.queries";
import { useCategoriesList } from "@/lib/queries/categories.queries";
import { useFeaturedCategories } from "@/lib/queries/featuredCategories.queries";
import { useMatchStatsSummary } from "@/lib/queries/stats.queries";
import { useRankedProfile } from "@/lib/queries/ranked.queries";
import { useStoreWallet } from "@/lib/queries/store.queries";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useRankedMatchmakingStore } from "@/stores/rankedMatchmaking.store";
import type { CategorySummary, GameQuestion } from "@/lib/domain";
import type { ListQuestionsQuery } from "@/lib/repositories/questions.repo";
import { QUESTION_COUNT } from "@/lib/constants/game";
import { queryKeys } from "@/lib/queries/queryKeys";
import { trackModeSelected } from "@/lib/analytics/game-events";
// import { useTrainingCompletion } from "@/features/training/hooks/useTrainingCompletion";
// import { TrainingOfferModal } from "@/features/training/components/TrainingOfferModal";
import { shuffleArray } from "@/lib/utils";

export default function PlayPage() {
  const router = useRouter();
  const { player } = usePlayer();
  const startSession = useGameSessionStore((state) => state.startSession);
  const resetRealtime = useRealtimeMatchStore((state) => state.reset);
  const queryClient = useQueryClient();
  const { data: featuredData } = useFeaturedCategories();
  const { data: matchStatsSummary = null } = useMatchStatsSummary();
  const { data: rankedProfile, isLoading: rankedProfileLoading } = useRankedProfile();
  const { data: storeWallet } = useStoreWallet();
  // Training gate is intentionally disabled for now.
  // const { isComplete: isTrainingComplete, markComplete: markTrainingComplete } = useTrainingCompletion();
  // const [showTrainingModal, setShowTrainingModal] = useState(false);
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
    matchType?: "ranked" | "friendly";
  }) => {
    // Always clear stale realtime state before opening a new game flow.
    resetRealtime();
    useRankedMatchmakingStore.getState().clearRankedMatchmaking();

    // For ranked mode, start matchmaking without pre-fetching questions
    // Questions will be fetched after category blocking
    if (params.mode === "ranked") {
      startSession({
        ...params,
        matchType: "ranked",
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

  // const handlePlayTraining = () => {
  //   setShowTrainingModal(false);
  //   resetRealtime();
  //   startSession({ mode: "training", matchType: "ranked" });
  //   router.push("/game");
  // };
  //
  // const handleSkipTraining = () => {
  //   setShowTrainingModal(false);
  //   markTrainingComplete();
  //   void startMatch({ mode: "ranked", matchType: "ranked" });
  // };

  return (
    <div className="relative min-h-full overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.24]"
        style={{
          backgroundImage: "url('/assets/maracana.png')",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#071013]/78 via-[#071013]/72 to-[#071013]/90" />

      <div className="relative z-10">
        <ModeSelectionScreen
          onSelectMode={(mode) => {
            trackModeSelected(mode);
            if (mode === "solo") {
              void startMatch({ mode: "solo" });
              return;
            }
            if (mode === "ranked") {
              void startMatch({ mode: "ranked", matchType: "ranked" });
              return;
            }
            void startMatch({ mode: "quizball", matchType: "friendly" });
          }}
          // onRankedIntercept={() => {
          //   if (!isTrainingComplete()) {
          //     setShowTrainingModal(true);
          //     return true;
          //   }
          //   return false;
          // }}
          ticketsRemaining={storeWallet?.tickets ?? 0}
          matchStatsSummary={matchStatsSummary}
          rankedProfile={rankedProfile ?? null}
          rankedProfileLoading={rankedProfileLoading}
        />
      </div>

      {/* {showTrainingModal && (
        <TrainingOfferModal
          onPlayTraining={handlePlayTraining}
          onSkip={handleSkipTraining}
        />
      )} */}
    </div>
  );
}
