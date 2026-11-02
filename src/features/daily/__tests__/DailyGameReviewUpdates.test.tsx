import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CareerPathGame } from '../CareerPathGame';
import { MoneyDropGame } from '../MoneyDropGame';
import { PassChainGame } from '../PassChainGame';
import { StatSniperGame } from '../StatSniperGame';
import { TrueFalseGame } from '../TrueFalseGame';
import { personalBestOutcome } from '../components/PersonalBestNote';
import type {
  CareerPathSession,
  MoneyDropSession,
  PassChainLinkResult,
  PassChainPlayer,
  PassChainSession,
  StatSniperSession,
  TrueFalseSession,
} from '@/lib/domain/dailyChallenge';

vi.mock('@/lib/sounds/gameSounds', () => ({ playSfx: vi.fn() }));
vi.mock('@/lib/analytics/game-events', () => ({ trackLifelineUsed: vi.fn() }));
vi.mock('@/features/aproximado/PlayRoomWithFriendsButton', () => ({ PlayRoomWithFriendsButton: () => null }));
vi.mock('@/features/daily/StatSniperLeaderboard', () => ({ StatSniperLeaderboard: () => null }));
// The completion modal has its own tests; here it shows exactly what each game hands it.
vi.mock('../components/DailyChallengeCompleteModal', () => ({
  DailyChallengeCompleteModal: ({ open, scoreLabel, scoreValue, details }: { open: boolean; scoreLabel?: string; scoreValue?: string; details?: ReactNode }) =>
    open ? (
      <div data-testid="complete-modal">
        <p data-testid="score-label">{scoreLabel}</p>
        <p data-testid="score-value">{scoreValue}</p>
        {details}
      </div>
    ) : null,
}));
vi.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, max }: { value: number[]; onValueChange: (v: number[]) => void; max?: number }) => (
    <input type="range" data-testid="bet-slider" value={value[0]} max={max} onChange={(e) => onValueChange([Number(e.target.value)])} />
  ),
}));

afterEach(() => {
  vi.useRealTimers();
});

describe('True or False answer positions', () => {
  it('keeps True on the left and False on the right for every statement', () => {
    vi.useFakeTimers();
    const session: TrueFalseSession = {
      challengeType: 'trueFalse',
      title: 'True or False',
      description: '',
      questionCount: 3,
      secondsPerQuestion: 30,
      questions: [true, false, true].map((correctAnswer, i) => ({
        id: `tf-${i}`,
        category: 'Football',
        difficulty: 'easy' as const,
        prompt: `Statement ${i}`,
        trueLabel: 'True',
        falseLabel: 'False',
        correctAnswer,
      })),
    };
    render(<TrueFalseGame session={session} onBack={vi.fn()} onComplete={vi.fn()} />);

    for (let i = 0; i < 3; i += 1) {
      expect(screen.getByText(`Statement ${i}`)).toBeInTheDocument();
      expect(screen.getAllByTestId('daily-tf-option').map((button) => button.textContent)).toEqual(['True', 'False']);
      fireEvent.click(screen.getAllByTestId('daily-tf-option')[0]);
      act(() => { vi.advanceTimersByTime(1300); });
    }
  });
});

describe('Career Path pacing and review', () => {
  const session: CareerPathSession = {
    challengeType: 'careerPath',
    title: 'Career Path',
    description: '',
    questionCount: 2,
    secondsPerQuestion: 30,
    questions: [
      { id: 'c1', category: 'Careers', difficulty: 'easy', prompt: '', clubs: ['Birmingham City', 'Borussia Dortmund', 'Real Madrid'], clubMatchNames: [], displayAnswer: 'Jude Bellingham', acceptedAnswers: ['Jude Bellingham', 'Bellingham'] },
      { id: 'c2', category: 'Careers', difficulty: 'easy', prompt: '', clubs: ['Molde', 'Salzburg', 'Dortmund', 'Man City'], clubMatchNames: [], displayAnswer: 'Erling Haaland', acceptedAnswers: ['Erling Haaland', 'Haaland'] },
    ],
  };

  it('waits on the reveal until Next, then reviews every career on the result screen', () => {
    vi.useFakeTimers();
    render(<CareerPathGame session={session} onBack={vi.fn()} onComplete={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Type the player name'), { target: { value: 'Kane' } });
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));
    act(() => { vi.advanceTimersByTime(10_000); });
    // Still on the first career: the reveal is not cut short.
    expect(screen.getByText('Birmingham City')).toBeInTheDocument();
    expect(screen.getByText(/Jude Bellingham/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next career/i }));
    expect(screen.getByText('Molde')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Type the player name'), { target: { value: 'Haaland' } });
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));
    fireEvent.click(screen.getByRole('button', { name: /view results/i }));

    const modal = within(screen.getByTestId('complete-modal'));
    expect(modal.getByText("Today's careers")).toBeInTheDocument();
    expect(modal.getByText('Jude Bellingham')).toBeInTheDocument();
    expect(modal.getByText('Birmingham City → Borussia Dortmund → Real Madrid')).toBeInTheDocument();
    expect(modal.getByText('You: Kane')).toBeInTheDocument();
    expect(modal.getByText('Erling Haaland')).toBeInTheDocument();
  });
});

describe('Stat Sniper start screen, scoring explanation and personal best', () => {
  const session = (personalBest?: number | null): StatSniperSession => ({
    challengeType: 'statSniper',
    title: 'Closest Wins',
    description: '',
    questionCount: 1,
    secondsPerQuestion: 20,
    ...(personalBest !== undefined ? { personalBest } : {}),
    questions: [{ id: 'q1', difficulty: 'easy', kind: 'goals', prompt: 'How many goals?', unit: 'goals', value: 60, min: 0, max: 100, step: 1 }],
  });

  it('does not start the clock until Start is tapped', () => {
    vi.useFakeTimers();
    render(<StatSniperGame session={session(40)} demo practice onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByTestId('stat-sniper-start')).toBeInTheDocument();
    expect(screen.getByText('Target: beat 40%')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(60_000); });
    // Nothing locked in while waiting on the start screen.
    expect(screen.queryByText(/Answer:/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));
    expect(screen.getByText('How many goals?')).toBeInTheDocument();
    for (let second = 0; second < 21; second += 1) act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(10); });
    expect(screen.getByText(/Answer: 60 goals/)).toBeInTheDocument();
  });

  it('explains distance → points after each guess and celebrates a new personal best', async () => {
    render(<StatSniperGame session={session(40)} demo onBack={vi.fn()} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));
    // The slider starts at the midpoint (50): 10 off on a 0–100 range → 10% → 60 points.
    fireEvent.click(screen.getByRole('button', { name: /lock it in/i }));
    expect(screen.getByText('You: 50')).toBeInTheDocument();
    expect(screen.getByText('Off by 10 (10% of the range)')).toBeInTheDocument();
    expect(screen.getByText('60 points')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /see results/i }));
    await waitFor(() => expect(screen.getByTestId('complete-modal')).toBeInTheDocument());
    expect(screen.getByTestId('score-label')).toHaveTextContent('Average accuracy');
    expect(screen.getByTestId('score-value')).toHaveTextContent('60%');
    expect(screen.getByTestId('personal-best-new')).toHaveTextContent('Previous best: 40%');
  });
});

describe('Money Drop personal-best target', () => {
  it('shows the bank to beat during play and celebrates beating it', () => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn();
    const session: MoneyDropSession = {
      challengeType: 'moneyDrop',
      title: 'Money Drop',
      description: '',
      questionCount: 1,
      secondsPerQuestion: 30,
      startingMoney: 1000,
      personalBest: 600,
      questions: [{ id: 'q1', category: 'World Cup', difficulty: 'easy', prompt: 'Q1', options: ['A', 'B', 'C', 'D'], correctAnswerIndex: 0, clue: null }],
    };
    render(<MoneyDropGame session={session} onBack={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByTestId('money-drop-personal-best')).toHaveTextContent(/Target: beat 600/);

    fireEvent.change(screen.getAllByTestId('bet-slider')[0], { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm bets/i }));
    act(() => { vi.advanceTimersByTime(6000); });
    fireEvent.click(screen.getByRole('button', { name: /view results/i }));
    expect(screen.getByTestId('personal-best-new')).toHaveTextContent(/Previous best: 600/);
  });

  it('classifies results against the earlier best', () => {
    expect(personalBestOutcome(10, undefined)).toBe('unknown');
    expect(personalBestOutcome(10, null)).toBe('first');
    expect(personalBestOutcome(11, 10)).toBe('new');
    expect(personalBestOutcome(10, 10)).toBe('matched');
    expect(personalBestOutcome(9, 10)).toBe('short');
  });
});

describe('Pass Chain route efficiency', () => {
  const player = (id: string, name: string): PassChainPlayer => ({ id, name, clubs: [], imageUrl: null });
  const start = player('p-start', 'Alan Start');
  const target = player('p-target', 'Tom Target');
  const session: PassChainSession = {
    challengeType: 'passChain',
    title: 'Pass Chain',
    description: '',
    puzzleCount: 1,
    secondsPerPuzzle: 120,
    puzzles: [{
      id: 'z1',
      difficulty: 'easy',
      par: 2,
      start,
      target,
      solution: [
        { player: player('p-bridge', 'Ben Bridge'), via: 'Club X', kind: 'club' },
        { player: target, via: 'Club Y', kind: 'club' },
      ],
    }],
  };
  const linked = (p: PassChainPlayer, reachesTarget: boolean): PassChainLinkResult => ({
    status: 'linked', player: p, viaClub: 'Club', viaKind: 'club', reachesTarget, targetClub: reachesTarget ? 'Club T' : null, targetKind: reachesTarget ? 'club' : null,
  });

  it('headlines route length against the shortest route and shows both routes', async () => {
    const answers: Record<string, PassChainLinkResult> = {
      dan: linked(player('p-dan', 'Dan One'), false),
      eve: linked(player('p-eve', 'Eve Two'), true),
    };
    render(<PassChainGame session={session} onBack={vi.fn()} onComplete={vi.fn()} resolveLink={async (_from, text) => answers[text]} />);

    for (const text of ['dan', 'eve']) {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
      fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));
      await screen.findByText(text === 'dan' ? 'Dan One' : 'Eve Two');
    }
    // 3 links against a shortest of 2: one shortest route is shown at once.
    expect(screen.getByText('A shortest route: Start → Bridge → Target')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /see results/i }));
    expect(screen.getByTestId('score-label')).toHaveTextContent('Route length');
    expect(screen.getByTestId('score-value')).toHaveTextContent('3 links');
    const summary = within(screen.getByTestId('pass-chain-route-summary'));
    expect(summary.getByText('Shortest possible: 2 links')).toBeInTheDocument();
    expect(summary.getByText('+1 over the shortest')).toBeInTheDocument();
    expect(summary.getByText('Start → One → Two → Target')).toBeInTheDocument();
    expect(summary.getByText('Start → Bridge → Target')).toBeInTheDocument();
    expect(summary.getByText('1/1 chains linked')).toBeInTheDocument();
  });
});
