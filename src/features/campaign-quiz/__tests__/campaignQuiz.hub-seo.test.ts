import { describe, expect, it } from 'vitest';
import { buildCampaignQuizHubJsonLd } from '../campaignQuiz.hub-seo';
import type { CampaignQuizHubPage } from '../campaignQuiz.types';

const pages: CampaignQuizHubPage[] = [
  {
    slug: 'guess-the-player',
    category: 'quiz_type',
    h1: 'Adivina el jugador',
    breadcrumb_label: 'Adivina el jugador',
    hero_image_url: '/guess.webp',
    hero_image_alt: 'Jugador de fútbol',
    locale_mode: 'en_only',
    updated_at: '2026-08-30T00:00:00Z',
  },
];

describe('campaign quiz hub structured data', () => {
  it('describes the localized hub as a collection with canonical quiz URLs', () => {
    const result = buildCampaignQuizHubJsonLd({
      locale: 'es',
      url: 'https://quizball.io/es/quiz-de-futbol',
      title: 'Quiz de Fútbol',
      description: 'Preguntas de fútbol gratis.',
      pages,
    });

    expect(result['@graph'][0]).toMatchObject({
      '@type': 'CollectionPage',
      inLanguage: 'es-ES',
    });
    expect(result['@graph'][1]).toMatchObject({
      '@type': 'ItemList',
      numberOfItems: 1,
      itemListElement: [expect.objectContaining({
        url: 'https://quizball.io/es/quiz-de-futbol/adivina-el-jugador',
      })],
    });
  });
});
