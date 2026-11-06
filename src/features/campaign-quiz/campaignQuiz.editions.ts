import { cache } from 'react';
import { listCampaignQuizPages } from './campaignQuiz.api';
import { CAMPAIGN_HREFLANG, CAMPAIGN_OG_LOCALE, CAMPAIGN_QUIZ_LOCALES, campaignHubPath, type CampaignQuizLocale } from './campaignQuiz.routes';
import { SITE_URL } from '@/lib/seo/site';

/** These hubs exist from the start; the others once at least one quiz has an edition in that language. */
export const ALWAYS_ON_CAMPAIGN_HUBS: readonly CampaignQuizLocale[] = ['en', 'es', 'ru'];

/** The catalog lists only quizzes with that edition; a catalog that cannot be read (or a backend without the language) means no hub. */
export const hasCampaignHub = cache(async (locale: CampaignQuizLocale): Promise<boolean> => {
  if (ALWAYS_ON_CAMPAIGN_HUBS.includes(locale)) return true;
  try {
    return (await listCampaignQuizPages(locale)).length > 0;
  } catch {
    return false;
  }
});

export async function availableCampaignHubs(): Promise<CampaignQuizLocale[]> {
  const open = await Promise.all(CAMPAIGN_QUIZ_LOCALES.map(hasCampaignHub));
  return CAMPAIGN_QUIZ_LOCALES.filter((_, index) => open[index]);
}

/** The hreflang alternates and Open Graph locales of a hub page. */
export async function campaignHubAlternates(locale: CampaignQuizLocale) {
  const hubs = await availableCampaignHubs();
  return {
    languages: {
      ...Object.fromEntries(hubs.map((hub) => [CAMPAIGN_HREFLANG[hub], `${SITE_URL}${campaignHubPath(hub)}`])),
      'x-default': `${SITE_URL}${campaignHubPath('en')}`,
    } as Record<string, string>,
    alternateLocale: hubs.filter((hub) => hub !== locale).map((hub) => CAMPAIGN_OG_LOCALE[hub]),
  };
}
