'use client';

import { useEffect, useRef } from 'react';
import { trackCampaignQuizHubView } from './campaignQuiz.analytics';

interface CampaignQuizHubPageViewProps {
  locale: 'en' | 'ka';
}

/** Adds campaign context that PostHog's generic pageview event does not have. */
export function CampaignQuizHubPageView({ locale }: CampaignQuizHubPageViewProps) {
  const trackedLocale = useRef<string | null>(null);

  useEffect(() => {
    if (trackedLocale.current === locale) return;
    trackedLocale.current = locale;
    trackCampaignQuizHubView(locale);
  }, [locale]);

  return null;
}
