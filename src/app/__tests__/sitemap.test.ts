import { beforeEach, describe, expect, it, vi } from 'vitest';

const listCampaignQuizPagesMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/campaign-quiz/campaignQuiz.api', async (importOriginal) => ({
  CampaignQuizApiError: (await importOriginal<typeof import('@/features/campaign-quiz/campaignQuiz.api')>()).CampaignQuizApiError,
  listCampaignQuizPages: listCampaignQuizPagesMock,
}));

// The page module is imported for its metadata/params exports only: its screens and request headers stay out.
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/features/marketing/PublicGameScreen', () => ({ PublicGameScreen: () => null }));
vi.mock('@/features/marketing/DailyCollectionScreen', () => ({ DailyCollectionScreen: () => null }));

import sitemap from '../sitemap';
import { CampaignQuizApiError } from '@/features/campaign-quiz/campaignQuiz.api';
import { DOWNLOAD_UPDATED_AT } from '@/lib/seo/app-download';
import { publicGameDynamicParams, publicGameMetadata, publicGameRoomPlayers, publicGameStaticParams } from '@/features/marketing/publicGamePage';
import { PUBLIC_GAMES_FOLDER, SEO_PAGE_LOCALES, gamePagePath } from '@/lib/seo/game-pages';
import { findPublicGameByModeId, publishedLocalesOf } from '@/lib/seo/public-games';
import { buildPublicGameStructuredData } from '@/lib/seo/structured-data';
import { HTML_LANG } from '@/lib/i18n/locale';

describe('sitemap lastModified signals', () => {
  beforeEach(() => {
    listCampaignQuizPagesMock.mockReset();
  });

  it('omits fake dates from evergreen pages and uses CMS dates for campaign URLs', async () => {
    const catalog = [
      { slug: 'club-badges', locale_mode: 'en_only', updated_at: '2026-08-12T10:00:00.000Z' },
      { slug: 'liverpool', locale_mode: 'en_only', updated_at: '2026-08-20T12:30:00.000Z' },
    ];
    listCampaignQuizPagesMock.mockImplementation(async (locale: string) => (locale === 'ka' || locale === 'tr' ? [] : catalog));

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

  it.each([
    ['ka', 'https://quizball.io/ka/football-quiz', 'https://quizball.io/ka/football-quiz/club-badges', 'https://quizball.io/ka/football-quiz/liverpool'],
    ['tr', 'https://quizball.io/tr/futbol-bilgi-yarismasi', 'https://quizball.io/tr/futbol-bilgi-yarismasi/logodan-takim-bilme', 'https://quizball.io/tr/futbol-bilgi-yarismasi/liverpool-testi'],
  ])('lists the %s hub and a quiz page only when that catalog has its edition', async (language, hub, listed, unlisted) => {
    const pages = [
      { slug: 'club-badges', locale_mode: 'en_ka', updated_at: '2026-08-12T10:00:00.000Z' },
      { slug: 'liverpool', locale_mode: 'en_ka', updated_at: '2026-08-20T12:30:00.000Z' },
    ];
    listCampaignQuizPagesMock.mockImplementation(async (locale: string) => (locale === language ? pages.slice(0, 1) : pages));

    const entries = await sitemap();

    expect(entries.find((entry) => entry.url === hub)?.lastModified).toEqual(new Date('2026-08-12T10:00:00.000Z'));
    expect(entries.some((entry) => entry.url === listed)).toBe(true);
    expect(entries.some((entry) => entry.url === unlisted)).toBe(false);
  });

  it('a backend without Turkish pages (400 on locale=tr) gives no tr entries instead of failing', async () => {
    const pages = [{ slug: 'liverpool', locale_mode: 'en_only', updated_at: '2026-08-20T12:30:00.000Z' }];
    listCampaignQuizPagesMock.mockImplementation(async (locale: string) => {
      if (locale === 'tr') throw new CampaignQuizApiError(400);
      return pages;
    });

    const entries = await sitemap();

    expect(entries.some((entry) => entry.url.includes('/tr/futbol-bilgi-yarismasi'))).toBe(false);
    expect(entries.some((entry) => entry.url.endsWith('/en/football-quiz/liverpool'))).toBe(true);
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

  it('lists the fr hub and a fr quiz page only when the fr catalog has its edition, and survives a backend without fr', async () => {
    const pages = [
      { slug: 'club-badges', locale_mode: 'en_only', updated_at: '2026-08-12T10:00:00.000Z' },
      { slug: 'barcelona', locale_mode: 'en_only', updated_at: '2026-08-20T12:30:00.000Z' },
    ];
    listCampaignQuizPagesMock.mockImplementation(async (locale: string) => (locale === 'fr' ? pages.slice(0, 1) : pages));
    const entries = await sitemap();
    expect(entries.some((entry) => entry.url === 'https://quizball.io/fr/quiz-foot')).toBe(true);
    expect(entries.some((entry) => entry.url === 'https://quizball.io/fr/quiz-foot/quiz-logo-foot')).toBe(true);
    expect(entries.some((entry) => entry.url === 'https://quizball.io/fr/quiz-foot/quiz-fc-barcelone')).toBe(false);
    expect(entries.some((entry) => entry.url === 'https://quizball.io/fr')).toBe(true);
    expect(entries.some((entry) => entry.url === 'https://quizball.io/fr/jeux-de-foot/jeux-quotidiens')).toBe(true);
    expect(entries.some((entry) => entry.url === 'https://quizball.io/fr/jeux-de-foot/morpion-foot')).toBe(true);
    expect(entries.some((entry) => entry.url === 'https://quizball.io/fr/jeux-de-foot/codenames-foot')).toBe(true);

    // Staging answers a language it does not know with 422 from the query validator.
    listCampaignQuizPagesMock.mockImplementation(async (locale: string) => {
      if (locale === 'fr') throw new CampaignQuizApiError(422);
      return pages;
    });
    const without = await sitemap();
    expect(without.some((entry) => entry.url.includes('/fr/quiz-foot'))).toBe(false);
    expect(without.some((entry) => entry.url.includes('/fr/jeux-de-foot/'))).toBe(true);
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

describe('Football Mentalista public page (private room)', () => {
  const mentalista = findPublicGameByModeId('mentalista')!;
  const slugOf = (locale: (typeof SEO_PAGE_LOCALES)[number]) => gamePagePath(mentalista, locale).split('/')[3];

  beforeEach(() => {
    listCampaignQuizPagesMock.mockReset();
    // No live API: the campaign catalog is empty for every locale.
    listCampaignQuizPagesMock.mockResolvedValue([]);
  });

  it('is published in all eight page locales under each locale folder', () => {
    expect(mentalista.page).toBe(true);
    expect(mentalista.guest).toBe('room');
    expect(publishedLocalesOf(mentalista)).toEqual([...SEO_PAGE_LOCALES]);
    for (const locale of SEO_PAGE_LOCALES) {
      expect(gamePagePath(mentalista, locale)).toBe(`/${locale}/${PUBLIC_GAMES_FOLDER[locale]}/${slugOf(locale)}`);
      expect(slugOf(locale)).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('lists the page once per locale in the sitemap, and never the noindex room route', async () => {
    const entries = await sitemap();
    for (const locale of SEO_PAGE_LOCALES) {
      const url = `https://quizball.io${gamePagePath(mentalista, locale)}`;
      expect(entries.filter((entry) => entry.url === url), url).toHaveLength(1);
    }
    expect(entries.some((entry) => entry.url.includes('/friend/room'))).toBe(false);
    expect(listCampaignQuizPagesMock).toHaveBeenCalled();
  });

  it('every locale folder serves its page through the static and dynamic params', () => {
    for (const locale of SEO_PAGE_LOCALES) {
      const folder = PUBLIC_GAMES_FOLDER[locale];
      const param = { locale, slug: slugOf(locale) };
      expect(publicGameStaticParams(folder)).toContainEqual(param);
      expect(publicGameDynamicParams(folder)).toContainEqual(param);
      // Another locale's folder does not serve it under this locale.
      for (const other of new Set(Object.values(PUBLIC_GAMES_FOLDER))) {
        if (other !== folder) expect(publicGameStaticParams(other)).not.toContainEqual(param);
      }
    }
  });

  it.each(SEO_PAGE_LOCALES)('%s: canonical and hreflang name the eight localized pages', async (locale) => {
    const metadata = await publicGameMetadata(PUBLIC_GAMES_FOLDER[locale], Promise.resolve({ locale, slug: slugOf(locale) }));
    expect(metadata.alternates?.canonical).toBe(`https://quizball.io${gamePagePath(mentalista, locale)}`);
    const languages = metadata.alternates?.languages as Record<string, string>;
    for (const other of SEO_PAGE_LOCALES) {
      expect(languages[HTML_LANG[other]]).toBe(`https://quizball.io${gamePagePath(mentalista, other)}`);
    }
    expect(languages['x-default']).toBe(`https://quizball.io${gamePagePath(mentalista, 'en')}`);
    expect(metadata.title).toBeTruthy();
    expect(metadata.description).toBe(mentalista.copy[locale].metaDescription);
  });

  it('structured data: a 3–6 player multiplayer party game, nothing about solo, daily or ranked play', () => {
    const room = publicGameRoomPlayers(mentalista);
    expect(room).toEqual({ minPlayers: 3, maxPlayers: 6 });
    const data = buildPublicGameStructuredData({ locale: 'en', path: gamePagePath(mentalista, 'en'), name: 'Football Mentalista', description: 'x', homeLabel: 'Games', free: true, room });
    const game = data['@graph'].find((node) => node['@type'] === 'VideoGame') as Record<string, unknown>;
    expect(game.genre).toEqual(['Sports', 'Party']);
    expect(game.playMode).toBe('MultiPlayer');
    expect(game.numberOfPlayers).toEqual({ '@type': 'QuantitativeValue', minValue: 3, maxValue: 6 });
    expect(JSON.stringify(data)).not.toMatch(/SinglePlayer|daily|ranked|leaderboard/i);
  });

  it('structured data keeps the defaults for every other public game', () => {
    for (const modeId of ['grid', 'auction', 'ranked', 'codenames', 'buscaminas']) {
      const game = findPublicGameByModeId(modeId)!;
      expect(publicGameRoomPlayers(game), modeId).toBeUndefined();
      const data = buildPublicGameStructuredData({ locale: 'en', path: gamePagePath(game, 'en'), name: modeId, description: 'x', homeLabel: 'Games', free: true, room: publicGameRoomPlayers(game) });
      const node = data['@graph'].find((entry) => entry['@type'] === 'VideoGame') as Record<string, unknown>;
      expect(node.genre).toEqual(['Trivia', 'Sports']);
      expect(node).not.toHaveProperty('playMode');
      expect(node).not.toHaveProperty('numberOfPlayers');
    }
  });
});
