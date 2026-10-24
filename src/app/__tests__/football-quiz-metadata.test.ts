import { beforeEach, describe, expect, it, vi } from 'vitest';

const listCampaignQuizPagesMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/campaign-quiz/campaignQuiz.api', () => ({
  listCampaignQuizPages: listCampaignQuizPagesMock,
}));

import { generateMetadata } from '@/app/[locale]/football-quiz/page';
import { generateMetadata as generateSpanishMetadata } from '@/app/[locale]/quiz-de-futbol/page';
import { generateMetadata as generateRussianMetadata } from '@/app/[locale]/futbolnaya-viktorina/page';
import { generateMetadata as generatePortugueseMetadata } from '@/app/[locale]/quiz-de-futebol/page';
import { generateMetadata as generateGermanMetadata } from '@/app/[locale]/fussball-quiz/page';

const clubBadges = { slug: 'club-badges', locale_mode: 'en_only', category: 'quiz_type', breadcrumb_label: 'Club badges' };

// No quiz has a pt or de edition unless a test says so: those catalogs are then empty.
const withEditions = (...editions: string[]) => async (locale: string) =>
  (locale !== 'pt' && locale !== 'de') || editions.includes(locale) ? [clubBadges] : [];
beforeEach(() => {
  listCampaignQuizPagesMock.mockReset().mockImplementation(withEditions());
});

describe('football quiz hub metadata', () => {
  it('advertises Spanish while withholding Georgian until localized pages exist', async () => {
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

describe('Brazilian Portuguese football quiz hub metadata', () => {
  it('leads with the landing H1 phrase, links every edition and announces pt-BR', async () => {
    listCampaignQuizPagesMock.mockImplementation(withEditions('pt'));
    const metadata = await generatePortugueseMetadata({ params: Promise.resolve({ locale: 'pt' }) });

    expect(metadata.title).toEqual({ absolute: expect.stringMatching(/^Quiz de futebol: perguntas e respostas/) });
    expect(String((metadata.title as { absolute: string }).absolute)).toContain('teste seus conhecimentos');
    expect(metadata.alternates).toEqual({
      canonical: 'https://quizball.io/pt/quiz-de-futebol',
      languages: {
        en: 'https://quizball.io/en/football-quiz',
        es: 'https://quizball.io/es/quiz-de-futbol',
        ru: 'https://quizball.io/ru/futbolnaya-viktorina',
        'pt-BR': 'https://quizball.io/pt/quiz-de-futebol',
        'x-default': 'https://quizball.io/en/football-quiz',
      },
    });
    expect(metadata.openGraph).toMatchObject({ locale: 'pt_BR' });
  });

  it('the other hubs link the pt hub only once a quiz has a pt edition', async () => {
    expect((await generateMetadata({ params: Promise.resolve({ locale: 'en' }) })).alternates?.languages).not.toHaveProperty('pt-BR');
    listCampaignQuizPagesMock.mockImplementation(withEditions('pt'));
    for (const metadata of [
      await generateMetadata({ params: Promise.resolve({ locale: 'en' }) }),
      await generateSpanishMetadata({ params: Promise.resolve({ locale: 'es' }) }),
      await generateRussianMetadata({ params: Promise.resolve({ locale: 'ru' }) }),
    ]) {
      expect(metadata.alternates?.languages).toHaveProperty('pt-BR', 'https://quizball.io/pt/quiz-de-futebol');
    }
  });

  it('has no metadata without a pt edition, while the pt catalog is unreadable, or outside the pt locale', async () => {
    await expect(generatePortugueseMetadata({ params: Promise.resolve({ locale: 'pt' }) })).resolves.toEqual({});
    listCampaignQuizPagesMock.mockImplementation(async (locale: string) => {
      if (locale === 'pt') throw new Error('400');
      return [clubBadges];
    });
    await expect(generatePortugueseMetadata({ params: Promise.resolve({ locale: 'pt' }) })).resolves.toEqual({});
    await expect(generatePortugueseMetadata({ params: Promise.resolve({ locale: 'en' }) })).resolves.toEqual({});
  });
});

describe('German football quiz hub metadata', () => {
  it('leads with the landing H1 phrase, links every edition and announces de', async () => {
    listCampaignQuizPagesMock.mockImplementation(withEditions('de'));
    const metadata = await generateGermanMetadata({ params: Promise.resolve({ locale: 'de' }) });

    expect(metadata.title).toEqual({ absolute: expect.stringMatching(/^Fußball-Quiz: Fragen und Antworten online/) });
    expect(String((metadata.title as { absolute: string }).absolute)).toContain('teste dein Fußballwissen');
    expect(metadata.alternates).toEqual({
      canonical: 'https://quizball.io/de/fussball-quiz',
      languages: {
        en: 'https://quizball.io/en/football-quiz',
        es: 'https://quizball.io/es/quiz-de-futbol',
        ru: 'https://quizball.io/ru/futbolnaya-viktorina',
        de: 'https://quizball.io/de/fussball-quiz',
        'x-default': 'https://quizball.io/en/football-quiz',
      },
    });
    expect(metadata.openGraph).toMatchObject({ locale: 'de_DE', alternateLocale: ['en_GB', 'es_ES', 'ru_RU'] });

    listCampaignQuizPagesMock.mockImplementation(withEditions('de', 'pt'));
    const withPortuguese = await generateGermanMetadata({ params: Promise.resolve({ locale: 'de' }) });
    expect(withPortuguese.alternates?.languages).toHaveProperty('pt-BR', 'https://quizball.io/pt/quiz-de-futebol');
  });

  it('the other hubs link the de hub only once a quiz has a de edition', async () => {
    for (const metadata of [
      await generateMetadata({ params: Promise.resolve({ locale: 'en' }) }),
      await generateSpanishMetadata({ params: Promise.resolve({ locale: 'es' }) }),
      await generateRussianMetadata({ params: Promise.resolve({ locale: 'ru' }) }),
    ]) {
      expect(metadata.alternates?.languages).not.toHaveProperty('de');
    }
    listCampaignQuizPagesMock.mockImplementation(withEditions('de', 'pt'));
    for (const metadata of [
      await generateMetadata({ params: Promise.resolve({ locale: 'en' }) }),
      await generateSpanishMetadata({ params: Promise.resolve({ locale: 'es' }) }),
      await generateRussianMetadata({ params: Promise.resolve({ locale: 'ru' }) }),
      await generatePortugueseMetadata({ params: Promise.resolve({ locale: 'pt' }) }),
    ]) {
      expect(metadata.alternates?.languages).toHaveProperty('de', 'https://quizball.io/de/fussball-quiz');
    }
  });

  it('has no metadata without a de edition, while the de catalog is unreadable, or outside the de locale', async () => {
    await expect(generateGermanMetadata({ params: Promise.resolve({ locale: 'de' }) })).resolves.toEqual({});
    listCampaignQuizPagesMock.mockImplementation(async (locale: string) => {
      if (locale === 'de') throw new Error('400');
      return [clubBadges];
    });
    await expect(generateGermanMetadata({ params: Promise.resolve({ locale: 'de' }) })).resolves.toEqual({});
    await expect(generateGermanMetadata({ params: Promise.resolve({ locale: 'en' }) })).resolves.toEqual({});
  });
});
