import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CampaignQuizGame } from '../CampaignQuizGame';
import { answerCampaignQuizQuestion } from '../campaignQuiz.api';
import type { CampaignQuizQuestion } from '../campaignQuiz.types';

vi.mock('../campaignQuiz.api', () => ({
  answerCampaignQuizQuestion: vi.fn(),
}));

vi.mock('../campaignQuiz.analytics', () => ({
  trackCampaignQuizComplete: vi.fn(),
  trackCampaignQuizStart: vi.fn(),
  trackCampaignSignupClick: vi.fn(),
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: { status: 'anonymous' }) => unknown) =>
    selector({ status: 'anonymous' }),
}));

const questions: CampaignQuizQuestion[] = [
  {
    id: 'question-1',
    position: 1,
    difficulty: 'easy',
    type: 'mcq_single',
    prompt: 'Who managed Liverpool to the league title?',
    details: [],
    image_url: null,
    options: [
      { id: 'a', text: 'Rafael Benítez' },
      { id: 'b', text: 'Jürgen Klopp' },
    ],
  },
  {
    id: 'question-2',
    position: 2,
    difficulty: 'medium',
    type: 'mcq_single',
    prompt: 'What is Liverpool’s home ground?',
    details: [],
    image_url: null,
    options: [
      { id: 'a', text: 'Goodison Park' },
      { id: 'b', text: 'Anfield' },
    ],
  },
];

describe('CampaignQuizGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(answerCampaignQuizQuestion).mockImplementation(async ({ questionId }) => ({
      correct: true,
      correct_option_id: 'b',
      explanation: questionId === 'question-1' ? 'Klopp led the title win.' : 'Anfield is home.',
    }));
  });

  it('renders every question in the initial DOM without an answer marker', () => {
    const { container } = render(
      <CampaignQuizGame slug="liverpool" questions={questions} />,
    );

    expect(screen.getByText(questions[0].prompt)).toBeVisible();
    expect(screen.getByText(questions[1].prompt)).toBeInTheDocument();
    expect(screen.getByText(questions[1].prompt).closest('section')).toHaveAttribute('hidden');
    expect(container.innerHTML).not.toMatch(/correct_option_id|is_correct|answer_key/i);
  });

  it('checks answers through the API and shows the final score', async () => {
    render(<CampaignQuizGame slug="liverpool" questions={questions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Jürgen Klopp' }));
    await screen.findByText('Klopp led the title win.');
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));

    fireEvent.click(screen.getByRole('button', { name: 'Anfield' }));
    await screen.findByText('Anfield is home.');
    fireEvent.click(screen.getByRole('button', { name: 'See my score' }));

    await waitFor(() => {
      expect(screen.getByTestId('campaign-quiz-score')).toHaveTextContent(
        'You scored 2/2',
      );
    });
    expect(answerCampaignQuizQuestion).toHaveBeenCalledTimes(2);
  });
});
