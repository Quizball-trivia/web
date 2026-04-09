import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../PossessionFeed', () => ({
  PossessionFeed: () => <div>feed</div>,
}));

vi.mock('../PossessionQuestionPanel', () => ({
  PossessionQuestionPanel: () => <div>mcq-panel</div>,
}));

vi.mock('../LiveSpecialQuestionPanel', () => ({
  LiveSpecialQuestionPanel: () => <div>special-panel</div>,
}));

vi.mock('../RoundTransitionOverlay', () => ({
  RoundTransitionOverlay: ({ title }: { title: string }) => <div>{title}</div>,
}));

import { PossessionQuestionArea, type PossessionQuestionAreaModel } from '../PossessionQuestionArea';

const baseModel: PossessionQuestionAreaModel = {
  feed: {
    message: null,
    direction: 'neutral',
    side: 'left',
  },
  content: { kind: 'empty' },
  showRoundTransition: false,
  showPenaltyTransition: false,
  transitionSnapshot: {
    title: 'Question 4',
    categoryName: 'Football',
    subtitle: '1st Half',
  },
};

describe('PossessionQuestionArea', () => {
  it('routes multiple-choice content to PossessionQuestionPanel and keeps content mounted under the transition overlay', () => {
    render(
      <PossessionQuestionArea
        model={{
          ...baseModel,
          content: {
            kind: 'multipleChoice',
            props: {
              phase: 'playing',
              isPenaltyPhase: false,
              isShotPhase: false,
              isLastAttackPhase: false,
              question: {
                id: 'q-1',
                prompt: 'Question 1',
                options: ['A', 'B', 'C', 'D'],
                correctIndex: 0,
              },
              showOptions: true,
              selectedAnswer: null,
              answerStates: ['default', 'default', 'default', 'default'],
              opponentAnswer: null,
              onAnswer: vi.fn(),
            },
          },
          showRoundTransition: true,
        }}
      />
    );

    expect(screen.getByText('feed')).toBeInTheDocument();
    expect(screen.getByText('mcq-panel')).toBeInTheDocument();
    expect(screen.getByText('Question 4')).toBeInTheDocument();
  });

  it('routes special content to LiveSpecialQuestionPanel', () => {
    render(
      <PossessionQuestionArea
        model={{
          ...baseModel,
          content: {
            kind: 'special',
            props: {
              matchId: 'match-1',
              qIndex: 4,
              question: {
                kind: 'clues',
                id: 'q-4',
                prompt: 'Who am I?',
                clues: [{ type: 'text', content: 'Clue 1' }],
              },
              showOptions: true,
              timeRemaining: 10,
              questionDurationSeconds: 45,
              roundResolved: false,
              answerAck: null,
              roundResult: null,
              countdownGuessAck: null,
              cluesGuessAck: null,
            },
          },
        }}
      />
    );

    expect(screen.getByText('special-panel')).toBeInTheDocument();
    expect(screen.queryByText('mcq-panel')).not.toBeInTheDocument();
  });
});
