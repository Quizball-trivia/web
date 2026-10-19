import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posthogMocks = vi.hoisted(() => ({
  get_property: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  capture: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  default: posthogMocks,
}));

let identifyUser: typeof import('../posthog').identifyUser;
let resetUser: typeof import('../posthog').resetUser;
let trackEvent: typeof import('../posthog').trackEvent;

describe('PostHog identity', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    ({ identifyUser, resetUser, trackEvent } = await import('../posthog'));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('beacons a departing event immediately and leaves ordinary events on the batch queue', () => {
    trackEvent('campaign_quiz_abandon', { campaign_id: 'c' }, { departing: true });
    expect(posthogMocks.capture).toHaveBeenLastCalledWith(
      'campaign_quiz_abandon',
      expect.objectContaining({ campaign_id: 'c', event_source: 'web' }),
      { send_instantly: true, transport: 'sendBeacon' },
    );
    trackEvent('campaign_quiz_start', { campaign_id: 'c' });
    expect(posthogMocks.capture.mock.lastCall).toHaveLength(2);
  });

  it('does not reset an anonymous identity', () => {
    posthogMocks.get_property.mockReturnValue(undefined);

    resetUser();

    expect(posthogMocks.reset).not.toHaveBeenCalled();
  });

  it('preserves a guest across fresh page runtimes without counting each reload as a new identity', async () => {
    let anonymousId = 'persisted-browser-guest';
    posthogMocks.reset.mockImplementation(() => { anonymousId = 'incorrectly-new-guest'; });
    const capturedIds: string[] = [];
    posthogMocks.capture.mockImplementation(() => { capturedIds.push(anonymousId); });
    for (let boot = 0; boot < 10; boot += 1) {
      vi.resetModules();
      const analytics = await import('../posthog');
      analytics.resetUser();
      analytics.trackEvent('game_start');
    }
    expect(new Set(capturedIds)).toEqual(new Set(['persisted-browser-guest']));
    expect(posthogMocks.reset).not.toHaveBeenCalled();
    expect(posthogMocks.capture).toHaveBeenCalledTimes(10);
  });

  it('detaches a restored member once when its login expires in a fresh page runtime', async () => {
    let persistedUser: string | undefined = 'expired-member';
    posthogMocks.get_property.mockImplementation(() => persistedUser);
    posthogMocks.reset.mockImplementation(() => { persistedUser = undefined; });
    for (let boot = 0; boot < 3; boot += 1) {
      vi.resetModules();
      (await import('../posthog')).resetUser();
    }
    expect(posthogMocks.reset).toHaveBeenCalledTimes(1);
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
    posthogMocks.get_property.mockReturnValue('restored-member');

    resetUser();

    expect(posthogMocks.reset).toHaveBeenCalledTimes(1);
  });

  it('identifies again after logout even if the SDK has lost its persisted member marker', () => {
    posthogMocks.get_property.mockReturnValue(undefined);
    const properties = { email: 'user@example.com' };
    const setOnce = { signup_date: '2026-08-10' };

    identifyUser('user-1', properties, setOnce);
    resetUser();
    identifyUser('user-1', properties, setOnce);

    expect(posthogMocks.reset).toHaveBeenCalledTimes(1);
    expect(posthogMocks.identify).toHaveBeenCalledTimes(2);
  });

  it('takes the privacy-safe reset path when stored identity cannot be read', () => {
    posthogMocks.get_property.mockImplementation(() => { throw Error('storage unavailable'); });
    resetUser();
    expect(posthogMocks.reset).toHaveBeenCalledTimes(1);
  });
});
