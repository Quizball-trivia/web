import type { components } from "@/types/api.generated";
import type { GameQuestion } from "@/lib/domain";
import { getI18nText } from "@/lib/utils/i18n";

type QuestionResponse = components["schemas"]["QuestionResponse"];
type I18nField = components["schemas"]["I18nField"];
type CategoryDependencyQuestion =
  components["schemas"]["CategoryDependenciesResponse"]["questions"][number];

interface McqOption {
  id: string;
  text: I18nField;
  is_correct: boolean;
}

interface McqPayload {
  type?: "mcq_single";
  options?: McqOption[];
}

function isMcqOption(value: unknown): value is McqOption {
  if (!value || typeof value !== "object") return false;
  const option = value as { id?: unknown; text?: unknown; is_correct?: unknown };
  return (
    typeof option.id === "string" &&
    typeof option.is_correct === "boolean" &&
    !!option.text &&
    typeof option.text === "object"
  );
}

function isMcqPayload(value: unknown): value is McqPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as { options?: unknown };
  if (!Array.isArray(payload.options)) return false;
  return payload.options.every(isMcqOption);
}

export function toGameQuestion(
  question: QuestionResponse,
  locale = "en",
): GameQuestion {
  const payload = isMcqPayload(question.payload) ? question.payload : undefined;
  const options = Array.isArray(payload?.options) ? payload.options : [];
  const correctIndex = options.findIndex((option) => option.is_correct);

  return {
    id: question.id,
    prompt: getI18nText(question.prompt, locale),
    options: options.map((option) => getI18nText(option.text, locale)),
    correctIndex: correctIndex >= 0 ? correctIndex : 0,
    categoryId: question.category_id,
    difficulty: question.difficulty,
    explanation: getI18nText(
      question.explanation as I18nField | null | undefined,
      locale,
    ),
  };
}

export function toGameQuestionFromDependency(
  question: CategoryDependencyQuestion,
  locale = "en",
): GameQuestion {
  return {
    id: question.id,
    prompt: getI18nText(question.prompt, locale),
    options: [],
    correctIndex: 0,
    difficulty: question.difficulty,
  };
}
