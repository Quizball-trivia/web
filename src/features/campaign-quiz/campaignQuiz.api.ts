import { API_BASE_URL } from '@/lib/config';
import type {
  CampaignQuiz,
  CampaignQuizAnswer,
  CampaignQuizRating,
  CampaignQuizHubPage,
  CampaignQuizPublicSlugs,
  CampaignQuizRoute,
} from './campaignQuiz.types';
import { registerCampaignSlugs, replaceCampaignSlugs } from './campaignQuiz.routes';
import type { Locale } from '@/lib/i18n/messages';
import { timeoutSignal } from '@/lib/timeoutSignal';

export class CampaignQuizApiError extends Error {
  constructor(public readonly status: number) {
    super(`Campaign quiz request failed with ${status}`);
  }
}

const CAMPAIGN_QUIZ_REQUEST_TIMEOUT_MS = 5_000;

function requestSignal(): AbortSignal {
  return timeoutSignal(CAMPAIGN_QUIZ_REQUEST_TIMEOUT_MS);
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
  const pages = await parseJson<CampaignQuizHubPage[]>(response);
  registerCampaignSlugs(pages);
  return pages;
}

/**
 * Reads the backend's slug registry into the route helpers (cached five minutes). A backend without the registry, or
 * one that cannot be reached, leaves the hardcoded tables in charge: the 29 original pages keep working either way.
 */
const REGISTRY_TTL_MS = 300_000;
let registryRead: { at: number; pending: Promise<void> } | null = null;

export function loadCampaignSlugRegistry(): Promise<void> {
  if (registryRead && Date.now() - registryRead.at < REGISTRY_TTL_MS) return registryRead.pending;
  const read = { at: Date.now(), pending: Promise.resolve() };
  read.pending = readCampaignSlugRegistry().then((settled) => {
    // A failed read is retried by the next request instead of waiting out the five minutes.
    if (!settled && registryRead === read) registryRead = null;
  });
  registryRead = read;
  return read.pending;
}

/** True when the read settled the registry (read, or known to be absent); false on a failure worth retrying. */
async function readCampaignSlugRegistry(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/campaign-quizzes/slugs`, {
      next: { revalidate: 300 },
      headers: { Accept: 'application/json' },
      signal: requestSignal(),
    });
    // A backend without the registry (or rolled back to before it): the tables alone, until the next read.
    if (response.status === 404) {
      replaceCampaignSlugs([]);
      return true;
    }
    if (!response.ok) return false;
    const body = await response.json() as { pages?: Array<{ slug: string; public_slugs?: CampaignQuizPublicSlugs }> };
    if (!Array.isArray(body.pages)) return false;
    replaceCampaignSlugs(body.pages);
    return true;
  } catch {
    // Unreachable: keep what was read last; the tables answer what it never had.
    return false;
  }
}

/** Test seam: forget when the registry was last read. */
export function resetCampaignSlugRegistryRead(): void {
  registryRead = null;
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
  setVersion?: number;
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
        // Version 0 means the set has no recorded versions yet: nothing to pin.
        ...(input.setVersion !== undefined && input.setVersion > 0 ? { set_version: input.setVersion } : {}),
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
