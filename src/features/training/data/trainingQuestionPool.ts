import type { CategorySummary, GameQuestion } from "@/lib/domain";
import { QUESTIONS_PER_HALF } from "@/features/possession/types/possession.types";

const PENALTY_QUESTION_COUNT = 4;

export interface TrainingCategoryQuestionPool {
  matchQuestions: GameQuestion[];
  penaltyQuestions: GameQuestion[];
}

function usableMcqs(questions: readonly GameQuestion[]): GameQuestion[] {
  return questions.filter((question) => (
    question.options.length === 4
    && question.correctIndex >= 0
    && question.correctIndex < question.options.length
  ));
}

function takeFromCategory(
  questions: readonly GameQuestion[],
  category: CategorySummary,
  count: number,
  offset = 0,
): GameQuestion[] {
  const usable = usableMcqs(questions);
  if (usable.length === 0) return [];
  return Array.from({ length: count }, (_, index) => {
    const source = usable[(offset + index) % usable.length];
    return {
      ...source,
      // A small category can legitimately repeat during this fixed tutorial.
      // Keep each rendered round identity unique while preserving the source id.
      id: `${source.id}:training-${offset + index}`,
      categoryId: category.id,
      categoryName: category.name,
    };
  });
}

/**
 * Build the deterministic tutorial pool from the two categories that survive
 * the scripted ban phases. Returns null instead of falling back to unrelated
 * canned trivia when either category has no usable published MCQ.
 */
export function buildTrainingCategoryQuestionPool(params: {
  firstHalfCategory?: CategorySummary;
  secondHalfCategory?: CategorySummary;
  firstHalfQuestions: readonly GameQuestion[];
  secondHalfQuestions: readonly GameQuestion[];
}): TrainingCategoryQuestionPool | null {
  const {
    firstHalfCategory,
    secondHalfCategory,
    firstHalfQuestions,
    secondHalfQuestions,
  } = params;
  if (!firstHalfCategory || !secondHalfCategory) return null;

  const firstHalf = takeFromCategory(
    firstHalfQuestions,
    firstHalfCategory,
    QUESTIONS_PER_HALF,
  );
  const secondHalf = takeFromCategory(
    secondHalfQuestions,
    secondHalfCategory,
    QUESTIONS_PER_HALF,
  );
  if (firstHalf.length !== QUESTIONS_PER_HALF || secondHalf.length !== QUESTIONS_PER_HALF) {
    return null;
  }

  const penaltyQuestions = [
    ...takeFromCategory(firstHalfQuestions, firstHalfCategory, 2, QUESTIONS_PER_HALF),
    ...takeFromCategory(secondHalfQuestions, secondHalfCategory, 2, QUESTIONS_PER_HALF),
  ].slice(0, PENALTY_QUESTION_COUNT);

  return {
    matchQuestions: [...firstHalf, ...secondHalf],
    penaltyQuestions,
  };
}
