import { describe, expect, it, vi } from 'vitest';

const listCampaignQuizPagesMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/campaign-quiz/campaignQuiz.api', () => ({
  listCampaignQuizPages: listCampaignQuizPagesMock,
}));

import { generateMetadata } from '@/app/[locale]/football-quiz/page';
import { generateMetadata as generateSpanishMetadata } from '@/app/[locale]/quiz-de-futbol/page';
import { generateMetadata as generateRussianMetadata } from '@/app/[locale]/futbolnaya-viktorina/page';

describe('football quiz hub metadata', () => {
  it('advertises Spanish while withholding Georgian until localized pages exist', async () => {
    listCampaignQuizPagesMock.mockResolvedValue([
      {
        slug: 'club-badges',
        locale_mode: 'en_only',
        category: 'quiz_type',
        breadcrumb_label: 'Club badges',
      },
    ]);

    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });

    expect(metadata.alternates?.languages).toEqual({
      en: 'https://quizball.io/en/football-quiz',
      es: 'https://quizball.io/es/quiz-de-futbol',
      ru: 'https://quizball.io/ru/futbolnaya-viktorina',
      'x-default': 'https://quizball.io/en/football-quiz',
    });
  });

  it('does not advertise an unavailable Georgian hub from the Spanish page', async () => {
    const metadata = await generateSpanishMetadata({ params: Promise.resolve({ locale: 'es' }) });

    expect(metadata.alternates?.languages).toEqual({
      en: 'https://quizball.io/en/football-quiz',
      es: 'https://quizball.io/es/quiz-de-futbol',
      ru: 'https://quizball.io/ru/futbolnaya-viktorina',
      'x-default': 'https://quizball.io/en/football-quiz',
    });
  });
});

describe('Spanish football quiz hub metadata', () => {
  it('uses the branded large preview for social and search surfaces', async () => {
    const metadata = await generateSpanishMetadata({ params: Promise.resolve({ locale: 'es' }) });

    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({ width: 1200, height: 630 }),
    ]);
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
  });
});

describe('Russian football quiz hub metadata', () => {
  it('leads with the searched Russian phrase and links every edition', async () => {
    const metadata = await generateRussianMetadata({ params: Promise.resolve({ locale: 'ru' }) });

    expect(metadata.title).toEqual({ absolute: expect.stringMatching(/^Футбольная викторина онлайн/) });
    expect(String((metadata.title as { absolute: string }).absolute)).toContain('футбольный квиз');
    expect(metadata.alternates).toEqual({
      canonical: 'https://quizball.io/ru/futbolnaya-viktorina',
      languages: {
        en: 'https://quizball.io/en/football-quiz',
        es: 'https://quizball.io/es/quiz-de-futbol',
        ru: 'https://quizball.io/ru/futbolnaya-viktorina',
        'x-default': 'https://quizball.io/en/football-quiz',
      },
    });
    expect(metadata.openGraph).toMatchObject({ locale: 'ru_RU' });
  });

  it('has no metadata outside the Russian locale', async () => {
    await expect(generateRussianMetadata({ params: Promise.resolve({ locale: 'en' }) })).resolves.toEqual({});
  });
});
