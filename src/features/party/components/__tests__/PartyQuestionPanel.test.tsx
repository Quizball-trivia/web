import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PartyQuestionPanel } from '../PartyQuestionPanel';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type { AnswerStateArray } from '@/features/possession/types/possession.types';

const question: GameQuestion = {
  id: 'question-1',
  prompt: 'Who won the Champions League in 2012?',
  options: ['Chelsea', 'Bayern', 'Real Madrid', 'Liverpool'],
  correctIndex: 0,
  categoryName: 'Football',
  difficulty: 'medium',
};

const defaultAnswerStates: AnswerStateArray = ['default', 'default', 'default', 'default'];

describe('PartyQuestionPanel', () => {
  it('renders the question prompt and answer options', () => {
    render(
      <PartyQuestionPanel
        phase="playing"
        question={question}
        showOptions
        selectedAnswer={null}
        answerStates={defaultAnswerStates}
        showPlayerSplash={false}
        playerSplashPoints={0}
        onPlayerSplashComplete={() => {}}
        onAnswer={() => {}}
      />,
    );

    expect(screen.getByText(question.prompt)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /chelsea/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /bayern/i })).toBeEnabled();
  });

  it('prevents answering when the panel is not in the playing phase', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();

    render(
      <PartyQuestionPanel
        phase="question-reveal"
        question={question}
        showOptions={false}
        selectedAnswer={null}
        answerStates={defaultAnswerStates}
        showPlayerSplash={false}
        playerSplashPoints={0}
        onPlayerSplashComplete={() => {}}
        onAnswer={onAnswer}
      />,
    );

    const button = screen.getByRole('button', { name: /chelsea/i });
    expect(button).toBeDisabled();
    await user.click(button);

    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('shows the player splash when points are awarded', () => {
    render(
      <PartyQuestionPanel
        phase="reveal"
        question={question}
        showOptions={false}
        selectedAnswer={0}
        answerStates={['correct', 'disabled', 'disabled', 'disabled']}
        showPlayerSplash
        playerSplashPoints={80}
        onPlayerSplashComplete={() => {}}
        onAnswer={() => {}}
      />,
    );

    expect(screen.getByText('+80')).toBeInTheDocument();
  });
});
