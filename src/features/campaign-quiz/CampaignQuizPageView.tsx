'use client';

import { useEffect, useRef } from 'react';
import { trackCampaignQuizPageView } from './campaignQuiz.analytics';

interface CampaignQuizPageViewProps {
  slug: string;
  totalQuestions: number;
}

/**
 * The landing page is a server component, so the campaign-scoped page view is
 * emitted from this marker instead. PostHog's own pageview autocapture does
 * not carry `quiz_slug`, which every funnel here is split by.
 */
export function CampaignQuizPageView({
  slug,
  totalQuestions,
}: CampaignQuizPageViewProps) {
  const trackedSlug = useRef<string | null>(null);

  useEffect(() => {
    // Guard against double-firing under React strict mode remounts.
    if (trackedSlug.current === slug) return;
    trackedSlug.current = slug;
    trackCampaignQuizPageView(slug, totalQuestions);
  }, [slug, totalQuestions]);

  return null;
}
