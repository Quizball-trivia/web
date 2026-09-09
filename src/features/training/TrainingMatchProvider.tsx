"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useTrainingMatch } from "./hooks/useTrainingMatch";
import { useTrainingTooltips } from "./hooks/useTrainingTooltips";
import { useTrainingCompletion } from "./hooks/useTrainingCompletion";
import { useCategoriesList } from "@/lib/queries/categories.queries";
import { useQuestionsList } from "@/lib/queries/questions.queries";
import { usePreloadImages } from "@/lib/usePreloadImages";
import type { CategorySummary, GameQuestion } from "@/lib/domain";
import { BAN_CATEGORY_COUNT } from "./constants";
import { QUESTIONS_PER_HALF } from "@/features/possession/types/possession.types";
import { useLocale } from "@/contexts/LocaleContext";
import { TRAINING_PENALTY_QUESTIONS } from "./data/trainingQuestions";
import { TRAINING_FLOW_SCRIPT } from "./data/trainingScript";
import { buildTrainingCategoryQuestionPool } from "./data/trainingQuestionPool";

const CATEGORY_QUESTION_FETCH_COUNT = QUESTIONS_PER_HALF + 4;

type TrainingResultsCopy = {
  message: string;
  cta: string;
};

type TrainingContextValue = {
  match: ReturnType<typeof useTrainingMatch>;
  tooltips: ReturnType<typeof useTrainingTooltips>;
  completion: ReturnType<typeof useTrainingCompletion>;
  /** Real categories fetched from the API in a stable order for the scripted ban phase. */
  banCategories: CategorySummary[];
  /** True once both surviving categories have enough real questions to play. */
  questionsReady: boolean;
  /** Category-backed penalty questions (local only for explicit offline overrides). */
  penaltyQuestions: GameQuestion[];
  /** Disables canned special rounds when the real category pool is active. */
  usingCategoryQuestions: boolean;
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
  const { locale } = useLocale();

  const { data: categoriesData } = useCategoriesList(
    {
      limit: 100,
      page: 1,
      is_active: "true",
    },
    { enabled: !banCategoriesOverride },
    locale,
  );

  // Use the real category catalog and artwork. The pool is no longer shuffled:
  // the tutorial scripts the displayed positions, not fake category content.
  const banCategories = useMemo(() => {
    if (banCategoriesOverride) {
      return banCategoriesOverride.slice(0, BAN_CATEGORY_COUNT);
    }
    const items = categoriesData?.items ?? [];
    if (items.length === 0) return [];
    const withArt = items.filter((category) => Boolean(category.imageUrl));
    const pool = withArt.length >= BAN_CATEGORY_COUNT ? withArt : items;
    return pool.slice(0, BAN_CATEGORY_COUNT);
  }, [banCategoriesOverride, categoriesData?.items]);

  // In ranked, both bans leave one category. Preload the two scripted
  // survivors and use their real published MCQs for the corresponding halves.
  const firstHalfCategory = banCategories[TRAINING_FLOW_SCRIPT.banning.questionCategoryIndex];
  const secondHalfCategory = banCategories[TRAINING_FLOW_SCRIPT.halftime.questionCategoryIndex];
  const shouldFetchCategoryQuestions = !questionsOverride;
  const firstHalfQuery = useQuestionsList(
    {
      category_id: firstHalfCategory?.id,
      status: "published",
      type: "mcq_single",
      page: 1,
      limit: CATEGORY_QUESTION_FETCH_COUNT,
    },
    { enabled: shouldFetchCategoryQuestions && Boolean(firstHalfCategory?.id) },
    locale,
  );
  const secondHalfQuery = useQuestionsList(
    {
      category_id: secondHalfCategory?.id,
      status: "published",
      type: "mcq_single",
      page: 1,
      limit: CATEGORY_QUESTION_FETCH_COUNT,
    },
    { enabled: shouldFetchCategoryQuestions && Boolean(secondHalfCategory?.id) },
    locale,
  );

  const categoryQuestionPool = useMemo(() => buildTrainingCategoryQuestionPool({
    firstHalfCategory,
    secondHalfCategory,
    firstHalfQuestions: firstHalfQuery.data?.items ?? [],
    secondHalfQuestions: secondHalfQuery.data?.items ?? [],
  }), [firstHalfCategory, firstHalfQuery.data?.items, secondHalfCategory, secondHalfQuery.data?.items]);
  const usingCategoryQuestions = !questionsOverride && categoryQuestionPool !== null;
  const questionsReady = questionsOverride
    ? questionsOverride.length >= QUESTIONS_PER_HALF * 2
    : usingCategoryQuestions;
  const matchQuestions = questionsOverride ?? categoryQuestionPool?.matchQuestions;
  const penaltyQuestions = categoryQuestionPool?.penaltyQuestions ?? TRAINING_PENALTY_QUESTIONS;

  const match = useTrainingMatch(tooltips.isPaused, matchQuestions);

  // Warm the ban-category images while the match plays so the ban phase is instant.
  const banImageUrls = useMemo(() => banCategories.map((c) => c.imageUrl ?? null), [banCategories]);
  usePreloadImages(banImageUrls);

  const onSkip = () => {
    completion.markComplete();
    onComplete();
  };

  return (
    <TrainingContext.Provider value={{
      match,
      tooltips,
      completion,
      banCategories,
      questionsReady,
      penaltyQuestions,
      usingCategoryQuestions,
      onSkip,
      resultsCopy,
    }}>
      {children}
    </TrainingContext.Provider>
  );
}
