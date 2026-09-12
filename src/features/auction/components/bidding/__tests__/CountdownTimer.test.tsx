import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CountdownTimer } from '../CountdownTimer';

describe('CountdownTimer pausedAt', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('freezes at the paused instant instead of counting down', async () => {
    const now = Date.now();
    render(<CountdownTimer endsAt={now + 7_000} totalMs={15_000} pausedAt={now + 2_000} />);
    expect(screen.getByRole('timer')).toHaveTextContent('5');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('5');
  });

  it('counts down when not paused', async () => {
    const now = Date.now();
    render(<CountdownTimer endsAt={now + 7_000} totalMs={15_000} />);
    expect(screen.getByRole('timer')).toHaveTextContent('7');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('4');
  });
});
