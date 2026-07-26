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
  // Signed-out visitors can rate too; the backend keys those by a hashed
  // client address. Only attach a token when one already exists.
  const accessToken = await getSupabaseAccessToken().catch(() => null);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/campaign-quizzes/${encodeURIComponent(slug)}/rating`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ rating }),
    },
  );
  return parseJson<CampaignQuizRating>(response);
}
