"use client";

import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";
import { useTrainingMatch } from "./hooks/useTrainingMatch";
import { useTrainingTooltips } from "./hooks/useTrainingTooltips";
import { useTrainingCompletion } from "./hooks/useTrainingCompletion";
import { useCategoriesList } from "@/lib/queries/categories.queries";
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

  // Pick BAN_CATEGORY_COUNT random categories — lock the first result so refetches don't reshuffle
  const banCategoriesRef = useRef<CategorySummary[] | null>(null);
  const banCategories = useMemo(() => {
    if (banCategoriesRef.current) return banCategoriesRef.current;
    const items = categoriesData?.items ?? [];
    if (items.length === 0) return [];
    const result = shuffleArray(items).slice(0, BAN_CATEGORY_COUNT);
    banCategoriesRef.current = result;
    return result;
  }, [categoriesData?.items]);

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
