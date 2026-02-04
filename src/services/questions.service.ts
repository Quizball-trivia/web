import type { Question } from '@/types/game';
import { getRandomQuestions, mockQuestions } from '@/data/mockData';
import { listQuestions, type QuestionResponse } from '@/lib/repositories/questions.repo';
import { logger } from '@/utils/logger';

/**
 * Maps an API QuestionResponse to the domain Question type.
 * Handles MCQ questions with options array in payload.
 */
function toQuestion(response: QuestionResponse, locale = 'en'): Question {
  const prompt = response.prompt as Record<string, string> | null;
  const explanation = response.explanation as Record<string, string> | null;
  const payload = response.payload as {
    options?: Array<{
      id: string;
      text: Record<string, string>;
      is_correct: boolean;
    }>;
  } | null;

  const options = payload?.options ?? [];
  const correctIndex = options.findIndex((opt) => opt.is_correct);

  return {
    id: response.id,
    question: prompt?.[locale] ?? prompt?.en ?? '',
    options: options.map((opt) => opt.text?.[locale] ?? opt.text?.en ?? ''),
    correctAnswer: correctIndex >= 0 ? correctIndex : 0,
    difficulty: response.difficulty,
    category: response.category_id,
    clue: explanation?.[locale] ?? explanation?.en ?? '',
  };
}

export const questionsService = {
  async getRandomQuestions(count: number, locale = 'en'): Promise<Question[]> {
    try {
      const response = await listQuestions({
        limit: String(count),
        status: 'published',
      });

      const items = response?.data;
      if (!items || items.length === 0) {
        throw new Error('No questions returned from API');
      }

      return items.map((item: QuestionResponse) => toQuestion(item, locale));
    } catch (error) {
      // Log error and fall back to mock data for local/dev
      logger.warn('Failed to fetch questions from API, using mock data', { error });
      return getRandomQuestions(mockQuestions, count);
    }
  },
};
