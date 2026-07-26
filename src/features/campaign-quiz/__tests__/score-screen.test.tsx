import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/features/campaign-quiz/campaignQuiz.api', () => ({
  answerCampaignQuizQuestion: vi.fn().mockResolvedValue({
    correct: true, correct_option_id: 'a', explanation: null,
  }),
}));
vi.mock('@/lib/posthog', () => ({ trackEvent: vi.fn() }));

import { CampaignQuizGame } from '@/features/campaign-quiz/CampaignQuizGame';

const q = (id: string) => ({
  id, position: 1, difficulty: 'easy' as const, type: 'mcq_single' as const,
  prompt: 'Q?', details: [], image_url: null,
  options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
});

describe('campaign score screen', () => {
  it('uses brand blue and the loading ball, not the sparkles icon', async () => {
    render(<CampaignQuizGame slug="club-badges" questions={[q('1')]} />);
    fireEvent.click(screen.getByText('A'));
    await waitFor(() => screen.getByText('See my score'));
    fireEvent.click(screen.getByText('See my score'));
    const card = await screen.findByTestId('campaign-quiz-score');
    expect(card.className).toContain('bg-brand-blue');
    expect(card.className).not.toContain('surface-card-deeper');
    const img = card.querySelector('img');
    expect(img?.getAttribute('src') ?? '').toContain('goal-ball-small');
    expect(card.querySelector('.lucide-sparkles')).toBeNull();
  });
});
