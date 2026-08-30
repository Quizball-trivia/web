import type { CampaignQuizHubPage } from './campaignQuiz.types';
import { campaignQuizPath, type CampaignQuizLocale } from './campaignQuiz.routes';
import { SITE_URL } from '@/lib/seo/site';

const LANGUAGE: Record<CampaignQuizLocale, string> = {
  en: 'en-GB',
  ka: 'ka-GE',
  es: 'es-ES',
};

export function buildCampaignQuizHubJsonLd(input: {
  locale: CampaignQuizLocale;
  url: string;
  title: string;
  description: string;
  pages: CampaignQuizHubPage[];
}) {
  const listId = `${input.url}#quiz-list`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${input.url}#webpage`,
        url: input.url,
        name: input.title,
        description: input.description,
        inLanguage: LANGUAGE[input.locale],
        isPartOf: { '@id': `${SITE_URL}/#website` },
        mainEntity: { '@id': listId },
      },
      {
        '@type': 'ItemList',
        '@id': listId,
        name: input.title,
        numberOfItems: input.pages.length,
        itemListElement: input.pages.map((page, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: page.breadcrumb_label,
          url: `${SITE_URL}${campaignQuizPath(page.slug, input.locale)}`,
        })),
      },
    ],
  };
}

export function serializeCampaignHubJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
