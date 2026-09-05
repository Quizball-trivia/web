import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import DevWlAbPage from '../page';

const clock = vi.hoisted(() => ({ now: 0 }));
vi.mock('@/features/weekend-league/wlClock', () => ({ wlNow: () => clock.now }));
vi.mock('@/features/weekend-league/components/WeekendLeaguePromoCard', () => ({
  WeekendLeaguePromoCard: ({ kickoffMs }: { kickoffMs: number | null }) => <output data-testid="kickoff">{kickoffMs}</output>,
}));
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('uses the synchronized clock instead of the device clock for preview kickoff', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-04T12:00:00Z'));
  clock.now = Date.parse('2026-09-05T12:00:00Z');
  render(<DevWlAbPage />);
  expect(Number(screen.getByTestId('kickoff').textContent)).toBe(Date.parse('2026-09-12T12:00:00Z'));
});

it('moves an expired preview kickoff to the next Saturday', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
  clock.now = Date.now();
  render(<DevWlAbPage />);
  clock.now = Date.parse('2026-09-13T12:00:00Z');
  act(() => { vi.advanceTimersByTime(1000); });
  expect(Number(screen.getByTestId('kickoff').textContent)).toBe(Date.parse('2026-09-19T12:00:00Z'));
});
