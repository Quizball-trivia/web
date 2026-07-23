import { API_BASE_URL } from '@/lib/config';
import { getSupabaseAccessToken } from '@/lib/auth/supabase';
import type {
  CampaignQuiz,
  CampaignQuizAnswer,
  CampaignQuizRating,
} from './campaignQuiz.types';

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Campaign quiz request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getCampaignQuiz(slug: string): Promise<CampaignQuiz> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/campaign-quizzes/${encodeURIComponent(slug)}`,
    {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    },
  );
  return parseJson<CampaignQuiz>(response);
}

export async function answerCampaignQuizQuestion(input: {
  slug: string;
  questionId: string;
  selectedOptionId: string;
}): Promise<CampaignQuizAnswer> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/campaign-quizzes/${encodeURIComponent(input.slug)}/answers`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question_id: input.questionId,
        selected_option_id: input.selectedOptionId,
      }),
    },
  );
  return parseJson<CampaignQuizAnswer>(response);
}

export async function rateCampaignQuiz(
  slug: string,
  rating: number,
): Promise<CampaignQuizRating> {
  const accessToken = await getSupabaseAccessToken();
  if (!accessToken) throw new Error('Sign in to rate this quiz');

  const response = await fetch(
    `${API_BASE_URL}/api/v1/campaign-quizzes/${encodeURIComponent(slug)}/rating`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating }),
    },
  );
  return parseJson<CampaignQuizRating>(response);
}
