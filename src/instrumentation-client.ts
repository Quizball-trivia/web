import posthog from 'posthog-js';

// Initialize PostHog on real deployments — production AND staging (Vercel
// "preview"). They use separate PostHog project keys. Skipped locally, where
// VERCEL_ENV is "development" / unset.
const deployEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
if (
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_POSTHOG_KEY &&
  (deployEnv === 'production' || deployEnv === 'preview')
) {
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
