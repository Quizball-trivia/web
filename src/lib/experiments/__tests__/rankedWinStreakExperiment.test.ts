import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posthogMock = vi.hoisted(() => ({
  setPersonPropertiesForFlags: vi.fn(),
  getFeatureFlag: vi.fn(),
  reloadFeatureFlags: vi.fn(),
  onFeatureFlags: vi.fn(),
  featureFlags: {
    hasLoadedFlags: false,
    setReloadingPaused: vi.fn(),
  },
}));

vi.mock('@/lib/posthog', () => ({ posthog: posthogMock }));

import {
  getPostMatchWinStreakCount,
  loadRankedWinStreakExperimentVariant,
  RANKED_WIN_STREAK_EXPERIMENT_KEY,
} from '../rankedWinStreakExperiment';

describe('ranked win-streak experiment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    posthogMock.featureFlags.hasLoadedFlags = false;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('only returns a count for a ranked winner continuing an existing streak', () => {
    expect(getPostMatchWinStreakCount({
      matchType: 'ranked',
      winnerId: 'self',
      selfUserId: 'self',
      cancelledNoContest: false,
      preMatchWinStreak: 2,
    })).toBe(3);

    expect(getPostMatchWinStreakCount({
      matchType: 'ranked',
      winnerId: 'opponent',
      selfUserId: 'self',
      cancelledNoContest: false,
      preMatchWinStreak: 2,
    })).toBeNull();

    expect(getPostMatchWinStreakCount({
      matchType: 'ranked',
      winnerId: 'self',
      selfUserId: 'self',
      cancelledNoContest: false,
      preMatchWinStreak: 0,
    })).toBeNull();
  });

  it('loads the eligible flag, records exposure, and pauses reloads again', async () => {
    posthogMock.getFeatureFlag.mockReturnValue('test');
    posthogMock.onFeatureFlags.mockImplementation((callback) => {
      posthogMock.reloadFeatureFlags.mockImplementation(() => {
        callback(
          [RANKED_WIN_STREAK_EXPERIMENT_KEY],
          { [RANKED_WIN_STREAK_EXPERIMENT_KEY]: 'test' },
          { errorsLoading: false },
        );
      });
      return vi.fn();
    });

    await expect(loadRankedWinStreakExperimentVariant({
      streakCount: 3,
      createdAt: '2026-07-01T00:00:00.000Z',
    })).resolves.toBe('test');

    expect(posthogMock.setPersonPropertiesForFlags).toHaveBeenCalledWith(
      { created_at: '2026-07-01T00:00:00.000Z' },
      false,
    );
    expect(posthogMock.getFeatureFlag).toHaveBeenCalledWith(
      RANKED_WIN_STREAK_EXPERIMENT_KEY,
    );
    expect(posthogMock.featureFlags.setReloadingPaused.mock.calls).toEqual([
      [false],
      [true],
    ]);
  });

  it('does no flag work when the player is not eligible', async () => {
    await expect(loadRankedWinStreakExperimentVariant({
      streakCount: 1,
      createdAt: '2026-07-01T00:00:00.000Z',
    })).resolves.toBe('not_enrolled');

    expect(posthogMock.reloadFeatureFlags).not.toHaveBeenCalled();
    expect(posthogMock.getFeatureFlag).not.toHaveBeenCalled();
  });
});
