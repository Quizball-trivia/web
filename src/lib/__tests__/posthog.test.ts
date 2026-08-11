import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posthogMocks = vi.hoisted(() => ({
  _isIdentified: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  default: posthogMocks,
}));

import { identifyUser, resetUser } from '../posthog';

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
