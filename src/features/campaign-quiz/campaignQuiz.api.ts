import { API_BASE_URL } from '@/lib/config';
import type {
  CampaignQuiz,
  CampaignQuizAnswer,
  CampaignQuizRating,
  CampaignQuizHubPage,
  CampaignQuizRoute,
} from './campaignQuiz.types';
import type { Locale } from '@/lib/i18n/messages';

export class CampaignQuizApiError extends Error {
  constructor(public readonly status: number) {
    super(`Campaign quiz request failed with ${status}`);
  }
}

const CAMPAIGN_QUIZ_REQUEST_TIMEOUT_MS = 5_000;

function requestSignal(): AbortSignal {
  return AbortSignal.timeout(CAMPAIGN_QUIZ_REQUEST_TIMEOUT_MS);
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new CampaignQuizApiError(response.status);
  }
  return response.json() as Promise<T>;
}

export async function getCampaignQuiz(
  slug: string,
  previewToken?: string,
  locale: Locale = 'en',
): Promise<CampaignQuiz> {
  const searchParams = new URLSearchParams({ locale });
  if (previewToken) searchParams.set('preview', previewToken);
  const response = await fetch(
    `${API_BASE_URL}/api/v1/campaign-quizzes/${encodeURIComponent(slug)}?${searchParams.toString()}`,
    {
      ...(previewToken ? { cache: 'no-store' as const } : { next: { revalidate: 300 } }),
      headers: { Accept: 'application/json' },
      signal: requestSignal(),
    },
  );
  return parseJson<CampaignQuiz>(response);
}

export async function listCampaignQuizPages(locale: Locale = 'en'): Promise<CampaignQuizHubPage[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/campaign-quizzes?locale=${locale}`, {
    next: { revalidate: 300 },
    headers: { Accept: 'application/json' },
    signal: requestSignal(),
  });
  return parseJson<CampaignQuizHubPage[]>(response);
}

/**
 * The catalog with a last-known-good fallback. The 5-minute entry is the source
 * of truth. A twin request to the same endpoint (its own cache key, refreshed
 * at most daily) is made on every call so its entry stays warm; Next serves a
 * stale entry while a background refresh fails, so during an outage the twin
 * still answers with the catalog as of its last successful refresh. Only when
 * both are unavailable does this throw, so a caller can fail loudly instead of
 * publishing an empty catalog as success. (Cold caches at outage time still fail.)
 */
export async function listCampaignQuizPagesResilient(locale: Locale = 'en'): Promise<CampaignQuizHubPage[]> {
  const twin = fetch(`${API_BASE_URL}/api/v1/campaign-quizzes?locale=${locale}&lkg=1`, {
    next: { revalidate: 86_400 },
    headers: { Accept: 'application/json' },
    signal: requestSignal(),
  }).then((response) => parseJson<CampaignQuizHubPage[]>(response));
  // The twin is issued on every call to stay warm but only awaited when the primary fails,
  // so a slow or cold twin never delays a healthy response.
  void twin.catch(() => undefined);
  try {
    return await listCampaignQuizPages(locale);
  } catch (primaryError) {
    try {
      return await twin;
    } catch {
      throw primaryError;
    }
  }
}

export async function resolveCampaignQuizRoute(slug: string): Promise<CampaignQuizRoute> {
  const response = await fetch(`${API_BASE_URL}/api/v1/campaign-quizzes/routes/${encodeURIComponent(slug)}`, {
    next: { revalidate: 300 },
    headers: { Accept: 'application/json' },
    signal: requestSignal(),
  });
  return parseJson<CampaignQuizRoute>(response);
}

export async function answerCampaignQuizQuestion(input: {
  slug: string;
  questionId: string;
  selectedOptionId: string;
  previewToken?: string;
  locale?: Locale;
}): Promise<CampaignQuizAnswer> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/campaign-quizzes/${encodeURIComponent(input.slug)}/answers?locale=${encodeURIComponent(input.locale ?? 'en')}`,
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
        preview_token: input.previewToken,
      }),
      signal: requestSignal(),
    },
  );
  return parseJson<CampaignQuizAnswer>(response);
}

export async function rateCampaignQuiz(
  slug: string,
  rating: number,
): Promise<{ rating: CampaignQuizRating; authenticated: boolean }> {
  // Signed-out visitors can rate too; the backend keys those by a hashed
  // client address. Load Supabase only after a rating interaction instead of
  // adding the full auth SDK to every organic-search visitor's initial bundle.
  const { getSupabaseAccessToken } = await import('@/lib/auth/supabase');
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
      signal: requestSignal(),
    },
  );
  return {
    rating: await parseJson<CampaignQuizRating>(response),
    authenticated: Boolean(accessToken),
  };
}
