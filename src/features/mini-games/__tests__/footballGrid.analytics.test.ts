import { beforeEach, describe, expect, it, vi } from 'vitest';

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));

vi.mock('@/lib/posthog', () => ({ trackEvent }));

import {
  trackFootballGridDemoCompleted,
  trackFootballGridEngagementEnded,
  trackFootballGridPlayStarted,
  trackFootballGridViewed,
} from '../footballGrid.analytics';

describe('Football Grid analytics', () => {
  beforeEach(() => {
    trackEvent.mockClear();
  });

  it('tracks the view and play intent with a stable low-cardinality context', () => {
    const context = { surface: 'demo', gridId: 'grid-1', opponentType: 'bot' } as const;

    trackFootballGridViewed(context);
    trackFootballGridPlayStarted(context);

    expect(trackEvent).toHaveBeenNthCalledWith(1, 'football_grid_viewed', {
      surface: 'demo',
      grid_id: 'grid-1',
      opponent_type: 'bot',
    });
    expect(trackEvent).toHaveBeenNthCalledWith(2, 'football_grid_play_started', {
      surface: 'demo',
      grid_id: 'grid-1',
      opponent_type: 'bot',
    });
  });

  it('tracks only aggregate gameplay facts and never a typed answer', () => {
    trackFootballGridDemoCompleted({
      surface: 'demo',
      gridId: 'grid-2',
      opponentType: 'bot',
      result: 'win',
      completionReason: 'line',
      durationSeconds: 64.5,
      turns: 7,
      humanClaims: 3,
      opponentClaims: 2,
    });

    expect(trackEvent).toHaveBeenCalledWith('football_grid_demo_completed', {
      surface: 'demo',
      grid_id: 'grid-2',
      opponent_type: 'bot',
      result: 'win',
      completion_reason: 'line',
      duration_seconds: 64.5,
      turns: 7,
      human_claims: 3,
      opponent_claims: 2,
    });
    expect(JSON.stringify(trackEvent.mock.calls)).not.toContain('submitted_text');
  });

  it('tracks active and elapsed time with aggregate funnel counters', () => {
    trackFootballGridEngagementEnded({
      surface: 'demo',
      gridId: 'grid-1',
      opponentType: 'bot',
      elapsedSeconds: 120,
      activeSeconds: 95,
      matchesStarted: 2,
      matchesCompleted: 1,
      cellSelections: 8,
      answersSubmitted: 6,
      correctAnswers: 4,
      wrongAnswers: 2,
      passes: 1,
      timeouts: 1,
    });

    expect(trackEvent).toHaveBeenCalledWith('football_grid_engagement_ended', expect.objectContaining({
      elapsed_seconds: 120,
      active_seconds: 95,
      matches_started: 2,
      matches_completed: 1,
      reached_gameplay: true,
      completed_any_match: true,
    }));
  });
});
