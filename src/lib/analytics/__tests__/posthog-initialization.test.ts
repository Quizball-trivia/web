import { afterEach, expect, it, vi } from 'vitest';
import type { CaptureResult, PostHogConfig } from 'posthog-js';

const { init } = vi.hoisted(() => ({ init: vi.fn() }));
vi.mock('posthog-js', () => ({
  default: { init, featureFlags: { setReloadingPaused: vi.fn() } },
}));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

it('registers a capture hook that removes credentials before an initialized client sends events', async () => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-project-key');
  await import('@/instrumentation-client');
  expect(init).toHaveBeenCalledOnce();
  const config = init.mock.calls[0][1] as PostHogConfig;
  expect(config.before_send).toBeTypeOf('function');
  const event: CaptureResult = {
    uuid: 'event-1', event: '$pageview',
    properties: { $current_url: 'https://quizball.io/en/play?code=secret&utm_source=google' },
  };
  const capture = config.before_send as (event: CaptureResult) => CaptureResult | null;
  expect(capture(event)?.properties.$current_url).toBe('https://quizball.io/en/play?utm_source=google');
});
