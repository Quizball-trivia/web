import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const trackEvent = vi.fn();
vi.mock('@/lib/posthog', () => ({ trackEvent: (...args: unknown[]) => trackEvent(...args) }));
vi.mock('@/lib/analytics/game-events', () => ({
  trackMatchmakingStarted: (mode: string, variant?: string) => trackEvent('matchmaking_started', { mode, variant }),
  trackMatchmakingHumanFound: (mode: string, wait_ms: number) => trackEvent('matchmaking_human_found', { mode, wait_ms }),
  trackMatchmakingAiFallback: (mode: string, wait_ms: number) => trackEvent('matchmaking_ai_fallback', { mode, wait_ms }),
  trackMatchmakingCancelled: (mode: string, wait_ms: number) => trackEvent('matchmaking_cancelled', { mode, wait_ms }),
  trackMatchStarted: (props: Record<string, unknown>) => trackEvent('match_started', props),
  trackMatchCompleted: (props: Record<string, unknown>) => trackEvent('match_completed', props),
}));

import { useFootballGridAnalytics } from '../useFootballGridAnalytics';

const ME = 'me';
const BOT = 'bot';
const state = (overrides: Record<string, unknown> = {}) => ({
  matchId: 'm1',
  phase: 'turn',
  turnNumber: 5,
  claims: [{ cellIndex: 0 }, { cellIndex: 4 }],
  winnerUserId: null,
  completionReason: null,
  players: [{ userId: ME, isBot: false }, { userId: BOT, isBot: true }],
  ...overrides,
}) as never;
const seriesInfo = { seriesId: 's1', format: 'bo3' as const, gameIndex: 1, targetWins: 2, wins: { [ME]: 1, [BOT]: 0 }, draws: 0, winnerUserId: null as string | null, finished: false };
const series = seriesInfo as never;

describe('useFootballGridAnalytics', () => {
  beforeEach(() => trackEvent.mockClear());

  it('emits the shared funnel once per match and grid events once per command', () => {
    const base = { selfUserId: ME, theme: 'european', opponent: { id: BOT, username: 'Bot', avatarUrl: null, rp: 1200 } as never, commandResult: null, completed: null };
    const { rerender } = renderHook((props: Parameters<typeof useFootballGridAnalytics>[0]) => useFootballGridAnalytics(props), {
      initialProps: { ...base, search: { state: 'searching', searchId: 'q1', queuedAt: new Date().toISOString() }, state: null, series: null },
    });
    expect(trackEvent).toHaveBeenCalledWith('matchmaking_started', { mode: 'football_grid', variant: 'european' });

    rerender({ ...base, search: { state: 'matched', searchId: 'q1' }, state: state(), series });
    rerender({ ...base, search: { state: 'matched', searchId: 'q1' }, state: state({ turnNumber: 6 }), series });
    expect(trackEvent.mock.calls.filter(([name]) => name === 'matchmaking_ai_fallback')).toHaveLength(1);
    expect(trackEvent.mock.calls.filter(([name]) => name === 'match_started')).toHaveLength(1);
    expect(trackEvent).toHaveBeenCalledWith('match_started', expect.objectContaining({ matchId: 'm1', mode: 'football_grid', opponentIsAi: true, opponentRp: 1200, variant: 'european:bo3:g1' }));

    const correct = { commandId: 'c1', matchId: 'm1', outcome: 'correct' } as never;
    rerender({ ...base, search: { state: 'matched', searchId: 'q1' }, state: state(), series, commandResult: correct });
    rerender({ ...base, search: { state: 'matched', searchId: 'q1' }, state: state(), series, commandResult: correct });
    expect(trackEvent.mock.calls.filter(([name]) => name === 'grid_turn_submitted')).toHaveLength(1);

    const finished = { ...seriesInfo, finished: true, winnerUserId: ME, wins: { [ME]: 2, [BOT]: 0 }, gameIndex: 2 } as never;
    const completed = { matchId: 'm1', state: state({ phase: 'terminal', winnerUserId: ME, completionReason: 'line' }), series: finished } as never;
    rerender({ ...base, search: { state: 'matched', searchId: 'q1' }, state: state(), series: finished, completed });
    rerender({ ...base, search: { state: 'matched', searchId: 'q1' }, state: state(), series: finished, completed });
    expect(trackEvent.mock.calls.filter(([name]) => name === 'match_completed')).toHaveLength(1);
    expect(trackEvent).toHaveBeenCalledWith('match_completed', expect.objectContaining({ won: true, score: 2, opponentScore: 0, correctAnswers: 1, questionsAnswered: 1, winnerDecisionMethod: 'line' }));
    expect(trackEvent.mock.calls.filter(([name]) => name === 'grid_series_completed')).toHaveLength(1);
    expect(trackEvent).toHaveBeenCalledWith('grid_series_completed', expect.objectContaining({ won: true, score: '2-0', games: 2 }));
  });

  it('records a cancelled search when the queue ends without a match', () => {
    const base = { selfUserId: ME, theme: 'european', opponent: null, commandResult: null, completed: null, series: null, state: null };
    const { rerender } = renderHook((props: Parameters<typeof useFootballGridAnalytics>[0]) => useFootballGridAnalytics(props), {
      initialProps: { ...base, search: { state: 'searching', searchId: 'q2' } },
    });
    rerender({ ...base, search: { state: 'idle', searchId: null } });
    expect(trackEvent.mock.calls.filter(([name]) => name === 'matchmaking_cancelled')).toHaveLength(1);
  });
});
