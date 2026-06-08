import posthog from 'posthog-js';

// Initialize PostHog in any environment that has a key configured (prod AND
// staging use separate project keys). Local dev has no key, so init is skipped.
// Gating on the key — not VERCEL_ENV — because NEXT_PUBLIC_VERCEL_ENV does not
// reliably inline at build on the prod Vercel build, which silently disabled
// all browser analytics on prod.
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  try {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: {
        dom_event_allowlist: ['click', 'submit', 'change'],
        element_allowlist: ['button', 'a', 'input', 'select', 'textarea', 'form'],
      },
      session_recording: {
        recordCrossOriginIframes: true,
      },
      capture_performance: false,
    });
  } catch (error) {
    console.error('PostHog initialization error:', error);
  }
}
