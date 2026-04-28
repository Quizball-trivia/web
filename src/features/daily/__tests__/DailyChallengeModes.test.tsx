import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CareerPathGame } from '../CareerPathGame';
import { FootballLogicGame } from '../FootballLogicGame';
import { HighLowGame } from '../HighLowGame';
import { ImposterGame } from '../ImposterGame';
import { TrueFalseGame } from '../TrueFalseGame';
import type {
  CareerPathSession,
  FootballLogicSession,
  HighLowSession,
  ImposterSession,
  TrueFalseSession,
} from '@/lib/domain/dailyChallenge';

describe('daily challenge gameplay modes', () => {
  it('renders and resolves a live true/false session', () => {
    const session: TrueFalseSession = {
      challengeType: 'trueFalse',
      title: 'True or False',
      description: 'Pick the statement value',
      questionCount: 1,
      secondsPerQuestion: 30,
      questions: [
        {
          id: 'tf-1',
          category: 'World Cup',
          difficulty: 'easy',
          prompt: 'Italy failed to qualify for the 2022 FIFA World Cup.',
          trueLabel: 'True',
          falseLabel: 'False',
          correctAnswer: true,
        },
      ],
    };

    render(<TrueFalseGame session={session} onBack={vi.fn()} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /true/i }));

    expect(screen.getByText('Italy failed to qualify for the 2022 FIFA World Cup.')).toBeInTheDocument();
    expect(screen.getAllByText('True').length).toBeGreaterThan(0);
  });

  it('renders imposter options and accepts an exact selected set', () => {
    const session: ImposterSession = {
      challengeType: 'imposter',
      title: 'Imposter',
      description: 'Pick all correct answers',
      questionCount: 1,
      secondsPerQuestion: 30,
      questions: [
        {
          id: 'imposter-1',
          category: 'Awards',
          difficulty: 'medium',
          prompt: "Which players have won the Ballon d'Or?",
          options: [
            { id: 'messi', text: 'Lionel Messi' },
            { id: 'ronaldo', text: 'Cristiano Ronaldo' },
            { id: 'xavi', text: 'Xavi Hernandez' },
            { id: 'henry', text: 'Thierry Henry' },
          ],
          correctOptionIds: ['messi', 'ronaldo'],
        },
      ],
    };

    render(<ImposterGame session={session} onBack={vi.fn()} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /lionel messi/i }));
    fireEvent.click(screen.getByRole('button', { name: /cristiano ronaldo/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit selection/i }));

    expect(screen.getByText("Which players have won the Ballon d'Or?")).toBeInTheDocument();
    expect(screen.getByText('Score:')).toBeInTheDocument();
  });

  it('renders career path club sequence and resolves accepted answers', () => {
    const session: CareerPathSession = {
      challengeType: 'careerPath',
      title: 'Career Path',
      description: 'Guess the player',
      questionCount: 1,
      secondsPerQuestion: 30,
      questions: [
        {
          id: 'career-1',
          category: 'Careers',
          difficulty: 'easy',
          prompt: 'Who followed this path?',
          clubs: ['Birmingham City', 'Borussia Dortmund', 'Real Madrid'],
          displayAnswer: 'Jude Bellingham',
          acceptedAnswers: ['Jude Bellingham', 'Bellingham'],
        },
      ],
    };

    render(<CareerPathGame session={session} onBack={vi.fn()} onComplete={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Type the player name'), {
      target: { value: 'Bellingham' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(screen.getByText('Birmingham City')).toBeInTheDocument();
    expect(screen.getByText('Correct.')).toBeInTheDocument();
  });

  it('renders high low matchups and resolves a correct chain', () => {
    const session: HighLowSession = {
      challengeType: 'highLow',
      title: 'High Low',
      description: 'Pick higher values',
      roundCount: 1,
      secondsPerRound: 30,
      rounds: [
        {
          id: 'high-low-1',
          category: 'Premier League',
          difficulty: 'medium',
          prompt: 'Who has more Premier League goals?',
          statLabel: 'All-time Premier League goals',
          matchups: [
            {
              id: 'owen-v-rvp',
              leftName: 'Michael Owen',
              leftValue: 150,
              rightName: 'Robin van Persie',
              rightValue: 144,
            },
          ],
        },
      ],
    };

    render(<HighLowGame session={session} onBack={vi.fn()} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /pick\s*michael owen/i }));

    expect(screen.getByText('All-time Premier League goals')).toBeInTheDocument();
    expect(screen.getByText('Chain complete.')).toBeInTheDocument();
  });

  it('renders football logic images and resolves accepted answers', () => {
    const session: FootballLogicSession = {
      challengeType: 'footballLogic',
      title: 'Football Logic',
      description: 'Decode visual clues',
      questionCount: 1,
      secondsPerQuestion: 30,
      questions: [
        {
          id: 'logic-1',
          category: 'Logic',
          difficulty: 'hard',
          prompt: 'Decode the player',
          imageAUrl: 'https://cdn.example.com/stopwatch.png',
          imageBUrl: 'https://cdn.example.com/five.png',
          displayAnswer: 'Robert Lewandowski',
          acceptedAnswers: ['Robert Lewandowski', 'Lewandowski'],
          explanation: 'Five goals in nine minutes.',
        },
      ],
    };

    render(<FootballLogicGame session={session} onBack={vi.fn()} onComplete={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Type your answer'), {
      target: { value: 'Lewandowski' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(screen.getByAltText('Football logic clue A')).toHaveAttribute('src', session.questions[0].imageAUrl);
    expect(screen.getByText('Correct.')).toBeInTheDocument();
  });
});
