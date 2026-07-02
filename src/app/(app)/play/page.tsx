"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ModeSelectionScreen } from "@/features/play/ModeSelectionScreen";
import { useGameSessionStore } from "@/stores/gameSession.store";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getQuestionsListQuery } from "@/lib/queries/questions.queries";
import { useCategoriesList } from "@/lib/queries/categories.queries";
import { useFeaturedCategories } from "@/lib/queries/featuredCategories.queries";
import { useMatchStatsSummary } from "@/lib/queries/stats.queries";
import { useRankedProfile } from "@/lib/queries/ranked.queries";
import { useStoreWallet, getStoreWalletQuery } from "@/lib/queries/store.queries";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useRankedMatchmakingStore } from "@/stores/rankedMatchmaking.store";
import type { CategorySummary, GameQuestion } from "@/lib/domain";
import type { ListQuestionsQuery } from "@/lib/repositories/questions.repo";
import { QUESTION_COUNT } from "@/lib/constants/game";
import { queryKeys } from "@/lib/queries/queryKeys";
import { markRankedQueueIntent, trackModeSelected } from "@/lib/analytics/game-events";
import { shuffleArray } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import { logSocketDebug } from "@/lib/realtime/socket-client";

// Ranked entry costs 1 ticket — mirrors ModeConfirmModal's CONFIG.ranked.entryCost.
const RANKED_TICKET_COST = 1;

export default function PlayPage() {
  const router = useRouter();
  const { t } = useLocale();
  const startSession = useGameSessionStore((state) => state.startSession);
  const resetRealtime = useRealtimeMatchStore((state) => state.reset);
  const queryClient = useQueryClient();
  const { data: featuredData } = useFeaturedCategories();
  const { data: matchStatsSummary = null } = useMatchStatsSummary();
  const { data: rankedProfile, isLoading: rankedProfileLoading } = useRankedProfile();
  const { data: storeWallet } = useStoreWallet();
  const { data: categoriesData } = useCategoriesList({
    limit: 100,
    page: 1,
    is_active: "true",
  });

  const defaultCategory: CategorySummary | undefined =
    featuredData?.items[0]?.category ?? categoriesData?.items[0];

  // Refresh the ticket balance whenever the Play screen opens so the ranked
  // confirm modal shows the correct insufficient-tickets state up front (the
  // cached wallet seeded from localStorage can otherwise be stale).
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
  }, [queryClient]);

  const fetchQuestions = async (categoryId?: string) => {
    const filters: ListQuestionsQuery = {
      category_id: categoryId,
      status: "published",
      page: 1,
      limit: QUESTION_COUNT,
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
    const previousSessionState = useRealtimeMatchStore.getState().sessionState;
    resetRealtime();
    if (params.mode === "ranked" && previousSessionState) {
      useRealtimeMatchStore.getState().setSessionState(previousSessionState);
      logSocketDebug("ranked preserved session state after realtime reset", {
        state: previousSessionState.state,
        queueSearchId: previousSessionState.queueSearchId,
        waitingLobbyId: previousSessionState.waitingLobbyId,
        activeMatchId: previousSessionState.activeMatchId,
      });
    }
    useRankedMatchmakingStore.getState().clearRankedMatchmaking();

    // For ranked mode, start matchmaking without pre-fetching questions
    // Questions will be fetched after category blocking
    if (params.mode === "ranked") {
      // Gate on the LIVE ticket balance before entering the search screen — the
      // cached wallet (seeded from localStorage) can be stale and let a 0-ticket
      // player into matchmaking, where the server then rejects the queue join and
      // strands them on the searching map. Refetch fresh; if they can't afford it,
      // bounce to the store instead of starting.
      let liveTickets = storeWallet?.tickets ?? 0;
      try {
        const fresh = await queryClient.fetchQuery(getStoreWalletQuery());
        liveTickets = fresh.tickets;
      } catch {
        // Network hiccup — fall back to the cached value rather than hard-blocking.
      }
      if (liveTickets < RANKED_TICKET_COST) {
        logSocketDebug("ranked start blocked before navigation", {
          cachedTickets: storeWallet?.tickets ?? null,
          liveTickets,
          requiredTickets: RANKED_TICKET_COST,
        });
        toast.error(t("modeConfirm.notEnoughTickets"));
        router.push("/store");
        return;
      }

      logSocketDebug("ranked start requested from play screen", {
        cachedTickets: storeWallet?.tickets ?? null,
        liveTickets,
        requiredTickets: RANKED_TICKET_COST,
      });
      markRankedQueueIntent("mode_select");
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
      toast.error(t('play.toastCategoriesLoadFail'));
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
      toast.error(t('play.toastQuestionsLoadFail'));
      return;
    }

    if (questions.length === 0) {
      toast.error(t('play.toastNoQuestions'));
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
    <div className="relative min-h-full overflow-hidden">
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
          ticketsRemaining={storeWallet?.tickets ?? 0}
          matchStatsSummary={matchStatsSummary}
          rankedProfile={rankedProfile ?? null}
          rankedProfileLoading={rankedProfileLoading}
        />
      </div>
    </div>
  );
}
