import { beforeEach, describe, expect, it, vi } from 'vitest';

const listCampaignQuizPagesMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/campaign-quiz/campaignQuiz.api', () => ({
  listCampaignQuizPages: listCampaignQuizPagesMock,
}));

import sitemap from '../sitemap';

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
});
