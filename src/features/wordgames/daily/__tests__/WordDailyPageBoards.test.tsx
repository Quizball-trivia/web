import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ leaderboard: vi.fn(async (base: string, day: string, locale: string) => ({ base, day, locale })) }));
vi.mock('../wordDaily.api', () => ({ createWordDailyApi: (base: string) => ({ leaderboard: (day: string, locale: string) => calls.leaderboard(base, day, locale) }) }));
vi.mock('../WordDailyLeaderboard', () => ({ WordDailyLeaderboard: ({ game, locale, load }: { game: { modeId: string }; locale: string; load: (day: string, locale: string) => Promise<unknown> }) => <button onClick={() => void load('2026-10-08', locale)}>{game.modeId}:{locale}</button> }));
import { NameChainDailyBoard, SharedPlayerDailyBoard } from '../WordDailyPageBoards';

describe('standalone daily board routes', () => {
  it.each([
    [SharedPlayerDailyBoard, 'sharedPlayer', '/api/v1/shared-player'],
    [NameChainDailyBoard, 'nameChain', '/api/v1/name-chain'],
  ] as const)('keeps the existing API and locale for %s', async (Board, mode, base) => {
    render(<Board locale="tr" />);
    screen.getByRole('button', { name: `${mode}:tr` }).click();
    expect(calls.leaderboard).toHaveBeenCalledWith(base, '2026-10-08', 'tr');
  });
});
