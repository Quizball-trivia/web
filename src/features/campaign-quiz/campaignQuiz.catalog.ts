import { after } from 'next/server';
import { API_BASE_URL } from '@/lib/config';
import { listCampaignQuizPages } from './campaignQuiz.api';
import type { CampaignQuizHubPage } from './campaignQuiz.types';
import type { Locale } from '@/lib/i18n/locale';

const CAMPAIGN_QUIZ_REQUEST_TIMEOUT_MS = 5_000;

/**
 * The catalog with a last-known-good fallback (server components and routes only —
 * `after` must never reach a client bundle). The 5-minute entry in
 * listCampaignQuizPages is the source of truth. A twin request to the same
 * endpoint (its own cache key, refreshed at most daily) is issued on every call so
 * its entry stays warm; Next serves a stale entry while a background refresh fails,
 * so during an outage the twin still answers with the catalog as of its last
 * successful refresh. It is awaited only when the primary fails, so a slow or cold
 * twin never delays a healthy response. Only when both are unavailable does this
 * throw, so a caller can fail loudly instead of publishing an empty catalog as
 * success. (Cold caches at outage time still fail.)
 */
export async function listCampaignQuizPagesResilient(locale: Locale = 'en'): Promise<CampaignQuizHubPage[]> {
  const twin = fetch(`${API_BASE_URL}/api/v1/campaign-quizzes?locale=${locale}&lkg=1`, {
    next: { revalidate: 86_400 },
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(CAMPAIGN_QUIZ_REQUEST_TIMEOUT_MS),
  }).then(async (response) => {
    if (!response.ok) throw new Error(`Catalog fallback failed with ${response.status}`);
    return (await response.json()) as CampaignQuizHubPage[];
  });
  // Handled immediately (no unhandled rejection before the response); `after` keeps the
  // un-awaited cache fill alive past the response on serverless. Outside a request scope
  // (tests, build) `after` throws and the handled promise alone is enough.
  const handled = twin.catch(() => undefined);
  try {
    after(() => handled);
  } catch {
    // no request scope
  }
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
