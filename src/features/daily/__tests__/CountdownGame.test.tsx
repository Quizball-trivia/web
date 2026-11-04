import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CountdownGame, CountdownReview } from '../CountdownGame';

const session = {
  challengeType: 'countdown',
  title: 'Countdown',
  description: 'Test session',
  roundCount: 1,
  secondsPerRound: 30,
  rounds: [
    {
      id: 'round-1',
      category: 'Champions League',
      prompt: 'All the players who scored 50+ goals in Champions League',
      answerGroups: [
        {
          id: 'a',
          display: 'Cristiano Ronaldo',
          acceptedAnswers: ['Cristiano Ronaldo', 'Ronaldo', 'CR7'],
        },
        {
          id: 'b',
          display: 'Lionel Messi',
          acceptedAnswers: ['Lionel Messi', 'Messi', 'Leo Messi'],
        },
      ],
    },
  ],
} as const;

const ambiguousSession = {
  ...session,
  rounds: [
    {
      ...session.rounds[0],
      answerGroups: [
        {
          id: 'a',
          display: 'Cristiano Ronaldo',
          acceptedAnswers: ['Cristiano Ronaldo', 'Ronaldo'],
        },
        {
          id: 'b',
          display: 'Ronaldinho',
          acceptedAnswers: ['Ronaldinho'],
        },
      ],
    },
  ],
} as const;

const typoSession = {
  ...session,
  rounds: [
    {
      ...session.rounds[0],
      answerGroups: [
        {
          id: 'a',
          display: 'Fabio Capello',
          acceptedAnswers: ['Fabio Capello'],
        },
      ],
    },
  ],
} as const;

describe('CountdownGame', () => {
  it('accepts aliases and shows the found answer', () => {
    render(
      <CountdownGame
        session={session as never}
        onBack={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Press Enter to submit...');
    fireEvent.change(input, { target: { value: 'CR7' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getAllByText('Cristiano Ronaldo').length).toBeGreaterThan(0);
  });

  it('does not leak answers as suggestions while typing a partial', () => {
    render(
      <CountdownGame
        session={session as never}
        onBack={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Press Enter to submit...');
    fireEvent.change(input, { target: { value: 'rona' } });

    // The full answer must NOT be revealed before it's accepted.
    expect(screen.queryByText('Cristiano Ronaldo')).not.toBeInTheDocument();
  });

  it('accepts a fully typed answer on Enter and reveals it', () => {
    render(
      <CountdownGame
        session={session as never}
        onBack={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Press Enter to submit...');
    fireEvent.change(input, { target: { value: 'Cristiano Ronaldo' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getAllByText('Cristiano Ronaldo').length).toBeGreaterThan(0);
  });

  it('does not submit an ambiguous short prefix on Enter', () => {
    render(
      <CountdownGame
        session={ambiguousSession as never}
        onBack={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Press Enter to submit...');
    fireEvent.change(input, { target: { value: 'ron' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('No answers found yet. Start typing!')).toBeInTheDocument();
  });

  it('accepts one-letter typos in multi-word answers', () => {
    render(
      <CountdownGame
        session={typoSession as never}
        onBack={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Press Enter to submit...');
    fireEvent.change(input, { target: { value: 'capelo' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getAllByText('Fabio Capello').length).toBeGreaterThan(0);
  });

  it('reviews every round after the game: found answers, every missed one, and the personal best', () => {
    const questions = [
      { id: 'r1', prompt: 'Round one', answerGroups: [{ display: 'Cristiano Ronaldo' }, { display: 'Lionel Messi' }, { display: 'Raul' }] },
      { id: 'r2', prompt: 'Round two', answerGroups: [{ display: 'Fabio Capello' }] },
    ];
    render(<CountdownReview questions={questions} foundByRound={[['Lionel Messi'], ['Fabio Capello']]} score={2} personalBest={5} />);

    const found = document.querySelectorAll('[data-countdown-answer="found"]');
    const missed = document.querySelectorAll('[data-countdown-answer="missed"]');
    expect([...found].map((el) => el.textContent)).toEqual(['Lionel Messi', 'Fabio Capello']);
    expect([...missed].map((el) => el.textContent)).toEqual(['Cristiano Ronaldo', 'Raul']);
    expect(screen.getByText('1/3 found')).toBeInTheDocument();
    expect(screen.getByText('You found every answer!')).toBeInTheDocument();
    expect(screen.getByText(/Personal best: 5/)).toBeInTheDocument();
  });

  it('shows no personal best line when the history is unknown (guests)', () => {
    render(<CountdownReview questions={[{ id: 'r1', prompt: 'Round one', answerGroups: [{ display: 'Raul' }] }]} foundByRound={[[]]} score={0} />);
    expect(screen.queryByText(/Personal best/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('personal-best-new')).not.toBeInTheDocument();
  });
});
