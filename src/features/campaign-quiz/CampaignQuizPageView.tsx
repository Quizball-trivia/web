'use client';

import { useEffect, useRef } from 'react';
import { trackCampaignQuizPageView } from './campaignQuiz.analytics';
import { registerCampaignSlugs } from './campaignQuiz.routes';
import type { CampaignQuizPublicSlugs } from './campaignQuiz.types';

interface CampaignQuizPageViewProps {
  slug: string;
  totalQuestions: number;
  /** This page's URL per language, so the language menu (a client bundle) links pages it has no table for. */
  publicSlugs?: CampaignQuizPublicSlugs;
}

/**
 * The landing page is a server component, so the campaign-scoped page view is
 * emitted from this marker instead. PostHog's own pageview autocapture does
 * not carry `quiz_slug`, which every funnel here is split by.
 */
export function CampaignQuizPageView({
  slug,
  totalQuestions,
  publicSlugs,
}: CampaignQuizPageViewProps) {
  const trackedSlug = useRef<string | null>(null);

  useEffect(() => {
    if (publicSlugs) registerCampaignSlugs([{ slug, public_slugs: publicSlugs }]);
  }, [slug, publicSlugs]);

  useEffect(() => {
    // Guard against double-firing under React strict mode remounts.
    if (trackedSlug.current === slug) return;
    trackedSlug.current = slug;
    trackCampaignQuizPageView(slug, totalQuestions);
  }, [slug, totalQuestions]);

  return null;
}
