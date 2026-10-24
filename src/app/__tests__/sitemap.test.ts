import { beforeEach, describe, expect, it, vi } from 'vitest';

const listCampaignQuizPagesMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/campaign-quiz/campaignQuiz.api', async (importOriginal) => ({
  CampaignQuizApiError: (await importOriginal<typeof import('@/features/campaign-quiz/campaignQuiz.api')>()).CampaignQuizApiError,
  listCampaignQuizPages: listCampaignQuizPagesMock,
}));

import sitemap from '../sitemap';
import { CampaignQuizApiError } from '@/features/campaign-quiz/campaignQuiz.api';
import { DOWNLOAD_UPDATED_AT } from '@/lib/seo/app-download';

describe('sitemap lastModified signals', () => {
  beforeEach(() => {
    listCampaignQuizPagesMock.mockReset();
  });

  it('omits fake dates from evergreen pages and uses CMS dates for campaign URLs', async () => {
    listCampaignQuizPagesMock.mockResolvedValue([
      { slug: 'club-badges', locale_mode: 'en_only', updated_at: '2026-08-12T10:00:00.000Z' },
      { slug: 'liverpool', locale_mode: 'en_only', updated_at: '2026-08-20T12:30:00.000Z' },
    ]);

    const entries = await sitemap();
    const englishHome = entries.find((entry) => entry.url.endsWith('/en'));
    const hub = entries.find((entry) => entry.url.endsWith('/en/football-quiz'));
    const liverpool = entries.find((entry) => entry.url.endsWith('/en/football-quiz/liverpool'));

    expect(englishHome?.lastModified).toBeUndefined();
    for (const locale of ['en', 'ka', 'es', 'tr']) {
      const downloads = entries.filter((entry) => entry.url === `https://quizball.io/${locale}/download`);
      expect(downloads).toHaveLength(1);
      expect(downloads[0].lastModified).toEqual(new Date(DOWNLOAD_UPDATED_AT));
    }
    expect(entries.find((entry) => entry.url.endsWith('/en/about'))?.lastModified)
      .toEqual(new Date('2026-08-30T00:00:00.000Z'));
    expect(entries.find((entry) => entry.url.endsWith('/es/editorial-methodology'))?.lastModified)
      .toEqual(new Date('2026-08-30T00:00:00.000Z'));
    expect(entries.find((entry) => entry.url.endsWith('/en/football-knowledge-index'))?.lastModified)
      .toEqual(new Date('2026-08-30T00:00:00.000Z'));
    expect(entries.some((entry) => entry.url.endsWith('/es/football-knowledge-index'))).toBe(true);
    expect(entries.some((entry) => entry.url.endsWith('/ka/football-knowledge-index'))).toBe(false);
    expect(entries.some((entry) => entry.url.endsWith('/en/press'))).toBe(true);
    expect(entries.some((entry) => entry.url.endsWith('/es/press'))).toBe(true);
    expect(entries.some((entry) => entry.url.endsWith('/ka/press'))).toBe(false);
    expect(hub?.lastModified).toEqual(new Date('2026-08-20T12:30:00.000Z'));
    expect(entries.find((entry) => entry.url === 'https://quizball.io/ru/futbolnaya-viktorina')?.lastModified)
      .toEqual(new Date('2026-08-20T12:30:00.000Z'));
    expect(entries.find((entry) => entry.url === 'https://quizball.io/ru/futbolnaya-viktorina/ugaday-klub-po-embleme')?.lastModified)
      .toEqual(new Date('2026-08-12T10:00:00.000Z'));
    expect(entries.some((entry) => entry.url === 'https://quizball.io/ru/futbolnaya-viktorina/viktorina-liverpul')).toBe(true);
    expect(liverpool?.lastModified).toEqual(new Date('2026-08-20T12:30:00.000Z'));
    expect(entries.some((entry) => entry.url.endsWith('/ka/football-quiz'))).toBe(false);
  });

  it('adds Georgian hub and page entries only when localized content exists', async () => {
    listCampaignQuizPagesMock.mockResolvedValue([
      { slug: 'club-badges', locale_mode: 'en_ka', updated_at: '2026-08-21T10:00:00.000Z' },
    ]);

    const entries = await sitemap();

    expect(entries.some((entry) => entry.url.endsWith('/ka/football-quiz'))).toBe(true);
    expect(entries.some((entry) => entry.url.endsWith('/ka/football-quiz/club-badges'))).toBe(true);
  });

  it('lists a Russian quiz page only when the Russian catalog has its edition', async () => {
    const pages = [
      { slug: 'club-badges', locale_mode: 'en_only', updated_at: '2026-08-12T10:00:00.000Z' },
      { slug: 'liverpool', locale_mode: 'en_only', updated_at: '2026-08-20T12:30:00.000Z' },
    ];
    listCampaignQuizPagesMock.mockImplementation(async (locale: string) => (locale === 'ru' ? pages.slice(0, 1) : pages));

    const entries = await sitemap();

    expect(entries.some((entry) => entry.url === 'https://quizball.io/ru/futbolnaya-viktorina/ugaday-klub-po-embleme')).toBe(true);
    expect(entries.some((entry) => entry.url === 'https://quizball.io/ru/futbolnaya-viktorina/viktorina-liverpul')).toBe(false);
    expect(entries.some((entry) => entry.url.endsWith('/en/football-quiz/liverpool'))).toBe(true);
  });

  it('lists the pt hub and a pt quiz page only when the pt catalog has its edition', async () => {
    const pages = [
      { slug: 'club-badges', locale_mode: 'en_only', updated_at: '2026-08-12T10:00:00.000Z' },
      { slug: 'liverpool', locale_mode: 'en_only', updated_at: '2026-08-20T12:30:00.000Z' },
    ];
    listCampaignQuizPagesMock.mockImplementation(async (locale: string) => (locale === 'pt' ? pages.slice(0, 1) : pages));

    const entries = await sitemap();

    expect(entries.find((entry) => entry.url === 'https://quizball.io/pt/quiz-de-futebol')?.lastModified)
      .toEqual(new Date('2026-08-12T10:00:00.000Z'));
    expect(entries.some((entry) => entry.url === 'https://quizball.io/pt/quiz-de-futebol/adivinhe-o-time-pelo-escudo')).toBe(true);
    expect(entries.some((entry) => entry.url === 'https://quizball.io/pt/quiz-de-futebol/quiz-do-liverpool')).toBe(false);
  });

  it('a backend without Portuguese pages (400 on locale=pt) gives no pt entries instead of failing', async () => {
    const pages = [{ slug: 'liverpool', locale_mode: 'en_only', updated_at: '2026-08-20T12:30:00.000Z' }];
    listCampaignQuizPagesMock.mockImplementation(async (locale: string) => {
      if (locale === 'pt') throw new CampaignQuizApiError(400);
      return pages;
    });

    const entries = await sitemap();

    expect(entries.some((entry) => entry.url.includes('/pt/quiz-de-futebol'))).toBe(false);
    expect(entries.some((entry) => entry.url.endsWith('/en/football-quiz/liverpool'))).toBe(true);

    listCampaignQuizPagesMock.mockImplementation(async (locale: string) => {
      if (locale === 'pt') throw new CampaignQuizApiError(503);
      return pages;
    });
    await expect(sitemap()).rejects.toBeInstanceOf(CampaignQuizApiError);
  });

  it('lists the de hub and a de quiz page only when the de catalog has its edition', async () => {
    const pages = [
      { slug: 'club-badges', locale_mode: 'en_only', updated_at: '2026-08-12T10:00:00.000Z' },
      { slug: 'liverpool', locale_mode: 'en_only', updated_at: '2026-08-20T12:30:00.000Z' },
    ];
    listCampaignQuizPagesMock.mockImplementation(async (locale: string) => (locale === 'de' ? pages.slice(0, 1) : pages));

    const entries = await sitemap();

    expect(entries.find((entry) => entry.url === 'https://quizball.io/de/fussball-quiz')?.lastModified)
      .toEqual(new Date('2026-08-12T10:00:00.000Z'));
    expect(entries.some((entry) => entry.url === 'https://quizball.io/de/fussball-quiz/fussball-wappen-quiz')).toBe(true);
    expect(entries.some((entry) => entry.url === 'https://quizball.io/de/fussball-quiz/liverpool-quiz')).toBe(false);
  });

  it('a backend without German pages (400 on locale=de) gives no de quiz entries instead of failing', async () => {
    const pages = [{ slug: 'liverpool', locale_mode: 'en_only', updated_at: '2026-08-20T12:30:00.000Z' }];
    listCampaignQuizPagesMock.mockImplementation(async (locale: string) => {
      if (locale === 'de') throw new CampaignQuizApiError(400);
      return pages;
    });

    const entries = await sitemap();

    expect(entries.some((entry) => entry.url.includes('/de/fussball-quiz'))).toBe(false);
    expect(entries.some((entry) => entry.url.endsWith('/pt/quiz-de-futebol/quiz-do-liverpool'))).toBe(true);

    listCampaignQuizPagesMock.mockImplementation(async (locale: string) => {
      if (locale === 'de') throw new CampaignQuizApiError(503);
      return pages;
    });
    await expect(sitemap()).rejects.toBeInstanceOf(CampaignQuizApiError);
  });
});
