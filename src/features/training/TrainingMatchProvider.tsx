"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useTrainingMatch } from "./hooks/useTrainingMatch";
import { useTrainingTooltips } from "./hooks/useTrainingTooltips";
import { useTrainingCompletion } from "./hooks/useTrainingCompletion";
import { useCategoriesList } from "@/lib/queries/categories.queries";
import { usePreloadImages } from "@/lib/usePreloadImages";
import { shuffleArray } from "@/lib/utils";
import type { CategorySummary } from "@/lib/domain";
import { BAN_CATEGORY_COUNT } from "./constants";

type TrainingContextValue = {
  match: ReturnType<typeof useTrainingMatch>;
  tooltips: ReturnType<typeof useTrainingTooltips>;
  completion: ReturnType<typeof useTrainingCompletion>;
  /** Real categories fetched from the API, shuffled and sliced for the ban phase */
  banCategories: CategorySummary[];
  onSkip: () => void;
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
}

export function TrainingMatchProvider({ children, onComplete }: TrainingMatchProviderProps) {
  const tooltips = useTrainingTooltips();
  const completion = useTrainingCompletion();
  const match = useTrainingMatch(tooltips.isPaused);

  const { data: categoriesData } = useCategoriesList({
    limit: 100,
    page: 1,
    is_active: "true",
  });

  // Pick BAN_CATEGORY_COUNT random categories for the ban phase.
  const banCategories = useMemo(() => {
    const items = categoriesData?.items ?? [];
    if (items.length === 0) return [];
    return shuffleArray(items).slice(0, BAN_CATEGORY_COUNT);
  }, [categoriesData?.items]);

  // Warm the ban-category images while the match plays so the ban phase is instant.
  const banImageUrls = useMemo(() => banCategories.map((c) => c.imageUrl ?? null), [banCategories]);
  usePreloadImages(banImageUrls);

  const onSkip = () => {
    completion.markComplete();
    onComplete();
  };

  return (
    <TrainingContext.Provider value={{ match, tooltips, completion, banCategories, onSkip }}>
      {children}
    </TrainingContext.Provider>
  );
}
