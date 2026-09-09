import { describe, expect, it } from "vitest";
import type { CategorySummary, GameQuestion } from "@/lib/domain";
import { buildTrainingCategoryQuestionPool } from "../trainingQuestionPool";

const firstCategory: CategorySummary = {
  id: "badges",
  name: "Badges And Logos",
  slug: "badges-and-logos",
};
const secondCategory: CategorySummary = {
  id: "argentina",
  name: "Argentina's World Cup Story",
  slug: "argentina-world-cup",
};

function question(id: string, categoryId: string): GameQuestion {
  return {
    id,
    categoryId,
    prompt: `Prompt ${id}`,
    options: ["A", "B", "C", "D"],
    correctIndex: 1,
  };
}

describe("buildTrainingCategoryQuestionPool", () => {
  it("uses the first surviving category for half one and the second for half two", () => {
    const pool = buildTrainingCategoryQuestionPool({
      firstHalfCategory: firstCategory,
      secondHalfCategory: secondCategory,
      firstHalfQuestions: [question("badge-1", firstCategory.id), question("badge-2", firstCategory.id)],
      secondHalfQuestions: [question("arg-1", secondCategory.id), question("arg-2", secondCategory.id)],
    });

    expect(pool).not.toBeNull();
    expect(pool?.matchQuestions).toHaveLength(12);
    expect(pool?.matchQuestions.slice(0, 6).every((item) => item.categoryId === firstCategory.id)).toBe(true);
    expect(pool?.matchQuestions.slice(0, 6).every((item) => item.categoryName === firstCategory.name)).toBe(true);
    expect(pool?.matchQuestions.slice(6).every((item) => item.categoryId === secondCategory.id)).toBe(true);
    expect(pool?.matchQuestions.slice(6).every((item) => item.categoryName === secondCategory.name)).toBe(true);
    expect(pool?.penaltyQuestions).toHaveLength(4);
    expect(new Set(pool?.penaltyQuestions.map((item) => item.categoryId))).toEqual(
      new Set([firstCategory.id, secondCategory.id]),
    );
  });

  it("does not substitute unrelated canned questions when a category has no usable MCQ", () => {
    const pool = buildTrainingCategoryQuestionPool({
      firstHalfCategory: firstCategory,
      secondHalfCategory: secondCategory,
      firstHalfQuestions: [{ ...question("bad", firstCategory.id), options: [] }],
      secondHalfQuestions: [question("arg-1", secondCategory.id)],
    });

    expect(pool).toBeNull();
  });
});
