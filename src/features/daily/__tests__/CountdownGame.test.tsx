import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CountdownGame } from '../CountdownGame';

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
});
