import posthog from 'posthog-js';

// Initialize PostHog (production builds only)
if (
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_POSTHOG_KEY &&
  process.env.NODE_ENV === 'production'
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
      capture_performance: true,
    });
  } catch (error) {
    console.error('PostHog initialization error:', error);
  }
}
