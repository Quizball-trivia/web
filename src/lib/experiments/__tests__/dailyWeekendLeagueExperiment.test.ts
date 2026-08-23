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
  DAILY_WEEKEND_LEAGUE_EXPERIMENT_KEY,
  loadDailyWeekendLeagueExperimentVariant,
} from '../dailyWeekendLeagueExperiment';

describe('daily Weekend League experiment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    posthogMock.featureFlags.hasLoadedFlags = false;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('loads the flag, records exposure, and pauses reloads again', async () => {
    posthogMock.getFeatureFlag.mockReturnValue('test');
    posthogMock.onFeatureFlags.mockImplementation((callback) => {
      posthogMock.reloadFeatureFlags.mockImplementation(() => {
        callback(
          [DAILY_WEEKEND_LEAGUE_EXPERIMENT_KEY],
          { [DAILY_WEEKEND_LEAGUE_EXPERIMENT_KEY]: 'test' },
          { errorsLoading: false },
        );
      });
      return vi.fn();
    });

    await expect(loadDailyWeekendLeagueExperimentVariant({
      createdAt: '2026-07-01T00:00:00.000Z',
    })).resolves.toBe('test');

    expect(posthogMock.setPersonPropertiesForFlags).toHaveBeenCalledWith(
      { created_at: '2026-07-01T00:00:00.000Z' },
      false,
    );
    expect(posthogMock.getFeatureFlag).toHaveBeenCalledWith(
      DAILY_WEEKEND_LEAGUE_EXPERIMENT_KEY,
    );
    expect(posthogMock.featureFlags.setReloadingPaused.mock.calls).toEqual([
      [false],
      [true],
    ]);
  });

  it('waits for the refreshed value when flags were already loaded', async () => {
    posthogMock.featureFlags.hasLoadedFlags = true;
    posthogMock.getFeatureFlag.mockReturnValue('test');
    posthogMock.onFeatureFlags.mockImplementation((callback) => {
      posthogMock.reloadFeatureFlags.mockImplementation(() => {
        callback([], {}, { errorsLoading: false });
        callback(
          [DAILY_WEEKEND_LEAGUE_EXPERIMENT_KEY],
          { [DAILY_WEEKEND_LEAGUE_EXPERIMENT_KEY]: 'test' },
          { errorsLoading: false },
        );
      });
      return vi.fn();
    });

    await expect(loadDailyWeekendLeagueExperimentVariant({
      createdAt: '2026-07-01T00:00:00.000Z',
    })).resolves.toBe('test');

    expect(posthogMock.getFeatureFlag).toHaveBeenCalledTimes(1);
  });

  it('falls back to the current UI when flag loading fails', async () => {
    posthogMock.onFeatureFlags.mockImplementation((callback) => {
      posthogMock.reloadFeatureFlags.mockImplementation(() => {
        callback([], {}, { errorsLoading: true });
      });
      return vi.fn();
    });

    await expect(loadDailyWeekendLeagueExperimentVariant({
      createdAt: '2026-07-01T00:00:00.000Z',
    })).resolves.toBe('not_enrolled');

    expect(posthogMock.getFeatureFlag).not.toHaveBeenCalled();
  });

  it('does no flag work outside production analytics', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');

    await expect(loadDailyWeekendLeagueExperimentVariant({
      createdAt: '2026-07-01T00:00:00.000Z',
    })).resolves.toBe('not_enrolled');

    expect(posthogMock.reloadFeatureFlags).not.toHaveBeenCalled();
    expect(posthogMock.getFeatureFlag).not.toHaveBeenCalled();
  });
});
