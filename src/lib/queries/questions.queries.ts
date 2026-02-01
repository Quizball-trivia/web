import { useQuery } from "@tanstack/react-query";
import type { QuestionsListDTO } from "@/lib/dtos/questions.dto";
import type { GameQuestion } from "@/lib/domain";
import {
  getQuestion,
  listQuestions,
  type ListQuestionsQuery,
} from "@/lib/repositories/questions.repo";
import { toGameQuestion } from "@/lib/mappers/question.mapper";
import { queryKeys } from "@/lib/queries/queryKeys";

export const getQuestionsListQuery = (filters?: ListQuestionsQuery) => ({
  queryKey: queryKeys.questions.list(filters),
  queryFn: async (): Promise<QuestionsListDTO> => {
    const data = await listQuestions(filters);
    return {
      items: data.data.map((question) => toGameQuestion(question)),
      page: data.page,
      limit: data.limit,
      total: data.total,
      totalPages: data.total_pages,
    };
  },
});

export function useQuestionsList(filters?: ListQuestionsQuery) {
  return useQuery(getQuestionsListQuery(filters));
}

export const getQuestionQuery = (id: string) => ({
  queryKey: queryKeys.questions.detail(id),
  queryFn: async (): Promise<GameQuestion> => {
    const data = await getQuestion(id);
    return toGameQuestion(data);
  },
  enabled: Boolean(id),
});

export function useQuestion(id?: string) {
  return useQuery({
    ...getQuestionQuery(id ?? ""),
    enabled: Boolean(id),
  });
}
