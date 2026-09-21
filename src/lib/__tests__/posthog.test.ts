import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posthogMocks = vi.hoisted(() => ({
  _isIdentified: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  capture: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  default: posthogMocks,
}));

import { identifyUser, resetUser, trackEvent } from '../posthog';

describe('PostHog identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not reset an anonymous identity', () => {
    posthogMocks._isIdentified.mockReturnValue(false);

    resetUser();

    expect(posthogMocks.reset).not.toHaveBeenCalled();
  });

  it('keeps guest attribution when identify receives an invalid identity', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resetUser();
    identifyUser('   ');
    trackEvent('game_exit', { mode_id: 'missingXi' });
    expect(posthogMocks.identify).not.toHaveBeenCalled();
    expect(posthogMocks.capture).toHaveBeenLastCalledWith('game_exit', expect.objectContaining({ access_type: 'guest' }));
    warning.mockRestore();
  });

  it('labels gameplay through guest, login and logout without mixing the audiences', () => {
    resetUser();
    trackEvent('game_complete', { mode_id: 'freeKicks' });
    identifyUser('member-transition');
    trackEvent('mini_game_round_settled', { game: 'free_kicks' });
    resetUser();
    trackEvent('game_exit', { mode_id: 'freeKicks' });
    expect(posthogMocks.capture.mock.calls.map(([event, props]) => [event, props.access_type, props.event_source])).toEqual([
      ['game_complete', 'guest', 'web'],
      ['mini_game_round_settled', 'member', 'web'],
      ['game_exit', 'guest', 'web'],
    ]);
  });

  it('retains explicit public-session access and does not capture without a project key', () => {
    identifyUser('member-explicit');
    trackEvent('game_start', { access_type: 'guest', mode_id: 'ranked' });
    expect(posthogMocks.capture).toHaveBeenLastCalledWith('game_start', expect.objectContaining({ access_type: 'guest' }));
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    trackEvent('game_complete');
    expect(posthogMocks.capture).toHaveBeenCalledTimes(1);
  });

  it('resets an identified identity once', () => {
    posthogMocks._isIdentified.mockReturnValue(true);

    resetUser();

    expect(posthogMocks.reset).toHaveBeenCalledTimes(1);
  });

  it('identifies again with the same signature after a skipped reset', () => {
    posthogMocks._isIdentified.mockReturnValue(false);
    const properties = { email: 'user@example.com' };
    const setOnce = { signup_date: '2026-08-10' };

    identifyUser('user-1', properties, setOnce);
    resetUser();
    identifyUser('user-1', properties, setOnce);

    expect(posthogMocks.reset).not.toHaveBeenCalled();
    expect(posthogMocks.identify).toHaveBeenCalledTimes(2);
  });
});
