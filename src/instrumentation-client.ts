import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();

// Initialize PostHog (production only)
if (
  typeof window !== 'undefined' &&
  POSTHOG_KEY &&
  process.env.NODE_ENV === 'production'
) {
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
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
      capture_performance: true,
    });
  } catch (error) {
    console.error('PostHog initialization error:', error);
  }
}
