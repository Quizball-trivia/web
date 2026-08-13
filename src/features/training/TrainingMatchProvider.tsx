"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useTrainingMatch } from "./hooks/useTrainingMatch";
import { useTrainingTooltips } from "./hooks/useTrainingTooltips";
import { useTrainingCompletion } from "./hooks/useTrainingCompletion";
import { useCategoriesList } from "@/lib/queries/categories.queries";
import { usePreloadImages } from "@/lib/usePreloadImages";
import { shuffleArray } from "@/lib/utils";
import type { CategorySummary, GameQuestion } from "@/lib/domain";
import { BAN_CATEGORY_COUNT } from "./constants";

type TrainingResultsCopy = {
  message: string;
  cta: string;
};

type TrainingContextValue = {
  match: ReturnType<typeof useTrainingMatch>;
  tooltips: ReturnType<typeof useTrainingTooltips>;
  completion: ReturnType<typeof useTrainingCompletion>;
  /** Real categories fetched from the API, shuffled and sliced for the ban phase */
  banCategories: CategorySummary[];
  onSkip: () => void;
  /** Overrides the results-screen message + CTA (offline/demo). */
  resultsCopy?: TrainingResultsCopy;
};

const TrainingContext = createContext<TrainingContextValue | null>(null);

export function useTraining() {
  const ctx = useContext(TrainingContext);
  if (!ctx) throw new Error("useTraining must be used inside TrainingMatchProvider");
  return ctx;
}

interface TrainingMatchProviderProps {
  children: ReactNode;
  onComplete: () => void;
  /** Skip the categories fetch and use these for the ban phase (offline/demo). */
  banCategoriesOverride?: CategorySummary[];
  /** Replace the built-in training questions (offline/demo). Must match the 6-per-half structure. */
  questionsOverride?: GameQuestion[];
  /** Overrides the results-screen message + CTA (offline/demo). */
  resultsCopy?: TrainingResultsCopy;
}

export function TrainingMatchProvider({
  children,
  onComplete,
  banCategoriesOverride,
  questionsOverride,
  resultsCopy,
}: TrainingMatchProviderProps) {
  const tooltips = useTrainingTooltips();
  const completion = useTrainingCompletion();
  const match = useTrainingMatch(tooltips.isPaused, questionsOverride);

  const { data: categoriesData } = useCategoriesList(
    {
      limit: 100,
      page: 1,
      is_active: "true",
    },
    { enabled: !banCategoriesOverride },
  );

  // Pick BAN_CATEGORY_COUNT random categories for the ban phase.
  const banCategories = useMemo(() => {
    if (banCategoriesOverride) {
      return banCategoriesOverride.slice(0, BAN_CATEGORY_COUNT);
    }
    const items = categoriesData?.items ?? [];
    if (items.length === 0) return [];
    return shuffleArray(items).slice(0, BAN_CATEGORY_COUNT);
  }, [banCategoriesOverride, categoriesData?.items]);

  // Warm the ban-category images while the match plays so the ban phase is instant.
  const banImageUrls = useMemo(() => banCategories.map((c) => c.imageUrl ?? null), [banCategories]);
  usePreloadImages(banImageUrls);

  const onSkip = () => {
    completion.markComplete();
    onComplete();
  };

  return (
    <TrainingContext.Provider value={{ match, tooltips, completion, banCategories, onSkip, resultsCopy }}>
      {children}
    </TrainingContext.Provider>
  );
}
