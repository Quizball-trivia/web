import { headers } from 'next/headers';

/** Set by the middleware when the backend confirmed the requested quiz URL is the page's canonical one. */
export const CONFIRMED_QUIZ_HEADER = 'x-quiz-confirmed-source';

/**
 * The page's source slug when the middleware already confirmed this URL with the backend registry: the page then
 * renders it as is, so a registry copy that is a few minutes older here cannot redirect against the middleware.
 */
export async function confirmedCampaignSource(): Promise<string | null> {
  return (await headers()).get(CONFIRMED_QUIZ_HEADER);
}
