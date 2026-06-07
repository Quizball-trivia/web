import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();

// Initialize PostHog in any environment that has a key configured (prod AND
// staging — they use separate project keys). Local dev has no key, so init is
// skipped there.
if (typeof window !== 'undefined' && POSTHOG_KEY) {
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: {
        // Only meaningful clicks on buttons/links. Dropping 'change'/'submit' and
        // input/textarea/form/select cuts the bulk of autocapture volume (every
        // keystroke and field change), which was ~34% of all events, while keeping
        // the clicks we actually analyze.
        dom_event_allowlist: ['click'],
        element_allowlist: ['button', 'a'],
      },
      session_recording: {
        recordCrossOriginIframes: true,
      },
      // Replay sampling (record 30% of sessions, skip <5s) is set server-side in
      // the project's replay settings so it can't drift from the deployed bundle.
      capture_performance: true,
    });
  } catch (error) {
    console.error('PostHog initialization error:', error);
  }
}
