import { describe, expect, it, vi } from 'vitest';

const listCampaignQuizPagesMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/campaign-quiz/campaignQuiz.api', () => ({
  listCampaignQuizPages: listCampaignQuizPagesMock,
}));

import { generateMetadata } from '@/app/[locale]/football-quiz/page';

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
      'x-default': 'https://quizball.io/en/football-quiz',
    });
  });
});
