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
      // $pageleave on every navigation — redundant with our explicit funnel
      // events, so off to cut event volume.
      capture_pageleave: false,
      // Autocapture fires a $autocapture on every click/submit/change. In a
      // tap-heavy game that's huge event volume and fully redundant with our
      // ~60 named events — disabled to cut the bill.
      autocapture: false,
      // The one event toggle is driven by NEXT_PUBLIC_GEORGIA_WC_EVENT_ENABLED
      // (Vercel env), not a PostHog flag, so PostHog never fetches flags (was
      // ~15k flag requests/day for one boolean).
      advanced_disable_feature_flags: true,
      advanced_disable_feature_flags_on_first_load: true,
      session_recording: {
        recordCrossOriginIframes: true,
      },
      capture_performance: false,
    });
  } catch (error) {
    console.error('PostHog initialization error:', error);
  }
}
