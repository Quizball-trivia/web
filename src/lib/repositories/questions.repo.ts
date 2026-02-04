import { api } from "@/lib/api/api";
import type { components, paths } from "@/types/api.generated";

export type ListQuestionsQuery =
  paths["/api/v1/questions"]["get"]["parameters"]["query"];
export type QuestionResponse = components["schemas"]["QuestionResponse"];
export type PaginatedQuestionsResponse =
  components["schemas"]["PaginatedQuestionsResponse"];

export async function listQuestions(query?: ListQuestionsQuery) {
  return api.GET("/api/v1/questions", { query });
}

export async function getQuestion(id: string) {
  return api.GET("/api/v1/questions/{id}", { params: { id } });
}
