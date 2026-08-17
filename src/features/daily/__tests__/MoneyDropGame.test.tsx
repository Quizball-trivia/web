import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MoneyDropGame } from '../MoneyDropGame';
import type { MoneyDropSession } from '@/lib/domain/dailyChallenge';

vi.mock('@/lib/sounds/gameSounds', () => ({ playSfx: vi.fn() }));
vi.mock('@/lib/analytics/game-events', () => ({ trackLifelineUsed: vi.fn() }));
vi.mock('@/components/ui/slider', () => ({
  Slider: ({
    value,
    onValueChange,
    ...rest
  }: {
    value: number[];
    onValueChange: (v: number[]) => void;
    max?: number;
  }) => (
    <input
      type="range"
      data-testid="bet-slider"
      value={value[0]}
      max={rest.max}
      onChange={(e) => onValueChange([Number(e.target.value)])}
    />
  ),
}));

const question = (id: string) => ({
  id,
  category: 'World Cup',
  difficulty: 'easy' as const,
  prompt: `Question ${id}`,
  options: ['A', 'B', 'C', 'D'],
  correctAnswerIndex: 0,
});

const session = (questionCount: number): MoneyDropSession =>
  ({
    challengeType: 'moneyDrop',
    title: 'Money Drop',
    description: 'Bet your bank',
    questionCount,
    secondsPerQuestion: 10,
    startingMoney: 250000,
    questions: Array.from({ length: questionCount }, (_, i) => question(`q${i + 1}`)),
  }) as MoneyDropSession;

function betAllOn(index: number) {
  const sliders = screen.getAllByTestId('bet-slider');
  fireEvent.change(sliders[index], { target: { value: '250000' } });
}

function confirmBets() {
  fireEvent.click(screen.getByRole('button', { name: /confirm bets/i }));
  // wrong-answer drop animations (n * 1s) + 2s reveal delay
  act(() => {
    vi.advanceTimersByTime(6000);
  });
}

function expireTimer() {
  // interval ticks every 250ms; QUESTION_TIME=10s, then the reveal chain
  // (≤3s of drop animations + 2s reveal) and the 2.5s auto-advance both fit
  // inside the 6s advance.
  act(() => {
    vi.advanceTimersByTime(10_500);
  });
  act(() => {
    vi.advanceTimersByTime(6000);
  });
}

describe('MoneyDropGame timeout and bust rules', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('a fully idle run scores 0 at the first no-bet timeout (no zombie rounds)', () => {
    const onComplete = vi.fn();
    render(<MoneyDropGame session={session(5)} onBack={vi.fn()} onComplete={onComplete} />);
    expireTimer();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(0);
  });

  it('a no-bet timeout after an engaged round ends the run keeping the bank', () => {
    const onComplete = vi.fn();
    render(<MoneyDropGame session={session(5)} onBack={vi.fn()} onComplete={onComplete} />);
    betAllOn(0); // all on the correct answer
    confirmBets();
    fireEvent.click(screen.getByRole('button', { name: /next question/i }));
    // question 2: idle → timer expires with nothing allocated
    expireTimer();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(250000);
  });

  it('a timer-submitted bust ends the run immediately with 0', () => {
    const onComplete = vi.fn();
    render(<MoneyDropGame session={session(5)} onBack={vi.fn()} onComplete={onComplete} />);
    betAllOn(2); // all on a wrong answer, never press confirm
    expireTimer(); // timer auto-submits the placed (losing) bet
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(0);
  });

  it('pressing View Results during a no-bet auto-window still keeps the bank', () => {
    const onComplete = vi.fn();
    render(<MoneyDropGame session={session(5)} onBack={vi.fn()} onComplete={onComplete} />);
    betAllOn(0);
    confirmBets();
    fireEvent.click(screen.getByRole('button', { name: /next question/i }));
    // question 2: idle timeout, but press the button DURING the reveal window
    // (before the 2.5s auto-advance fires) — outcome must not change
    act(() => {
      vi.advanceTimersByTime(10_500);
    });
    act(() => {
      vi.advanceTimersByTime(3000); // reveal shown (2s), auto-advance (4.5s) not yet
    });
    fireEvent.click(screen.getByRole('button', { name: /next question|view results/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(250000);
  });

  it('a timer-confirmed last-question win with no manual confirm ever scores 0', () => {
    const onComplete = vi.fn();
    render(<MoneyDropGame session={session(1)} onBack={vi.fn()} onComplete={onComplete} />);
    betAllOn(0); // allocated on the correct answer but never pressed Confirm
    expireTimer(); // timer auto-submits and completes the single-question run
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(0);
  });

  it('a manually confirmed bust ends the run with 0', () => {
    const onComplete = vi.fn();
    render(<MoneyDropGame session={session(5)} onBack={vi.fn()} onComplete={onComplete} />);
    betAllOn(2); // all on a wrong answer
    confirmBets();
    fireEvent.click(screen.getByRole('button', { name: /next question|view results/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(0);
  });

  it('a timer-confirmed win on a non-final round advances instead of completing', () => {
    const onComplete = vi.fn();
    render(<MoneyDropGame session={session(5)} onBack={vi.fn()} onComplete={onComplete} />);
    betAllOn(0);
    expireTimer(); // auto-submit the winning bet on question 1
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByText('Question q2')).toBeInTheDocument();
  });

  it('surviving the last question completes with the final bank', () => {
    const onComplete = vi.fn();
    render(<MoneyDropGame session={session(1)} onBack={vi.fn()} onComplete={onComplete} />);
    betAllOn(0);
    confirmBets();
    fireEvent.click(screen.getByRole('button', { name: /view results/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(250000);
  });
});
