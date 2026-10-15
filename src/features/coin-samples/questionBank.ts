import type { TriviaQuestion } from "@/features/mini-games/data/trivia";
import type { MiniLocale } from "@/features/mini-games/lib/i18n";
import { SAMPLE_QUESTIONS } from "./data/sampleQuestions";
import type { SampleQuestion } from "./types";

/** The frozen four-language bank in the mini-game engines' question shape. */
export function sampleTriviaQuestions(locale: MiniLocale): TriviaQuestion[] {
  return SAMPLE_QUESTIONS.map((q) => toTriviaQuestion(q, locale));
}

export function toTriviaQuestion(q: SampleQuestion, locale: MiniLocale): TriviaQuestion {
  const pick = (t: SampleQuestion["prompt"]) => t[locale] || t.en;
  return {
    id: q.id,
    q: pick(q.prompt),
    options: q.options.map((o) => pick(o.text)),
    answer: Math.max(0, q.options.findIndex((o) => o.id === q.correctOptionId)),
    difficulty: q.difficulty,
  };
}
