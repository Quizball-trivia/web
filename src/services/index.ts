import type { Question } from '@/types/game';
import { getRandomQuestions, mockQuestions } from '@/data/mockData';

export const questionsService = {
  async getRandomQuestions(count: number): Promise<Question[]> {
    return getRandomQuestions(mockQuestions, count);
  },
};
