'use client';

import Link from 'next/link';
import {
  trackCampaignHubQuizClick,
  trackCampaignRelatedQuizClick,
} from './campaignQuiz.analytics';

interface CampaignTrackedLinkProps {
  /** Slug of the page the click happened on; omit on the hub. */
  fromSlug?: string;
  targetSlug: string;
  href: string;
  className?: string;
  'aria-label'?: string;
  title?: string;
  children: React.ReactNode;
}

/**
 * Internal navigation between campaign pages, instrumented so the hub-to-quiz
 * and quiz-to-related-quiz paths are measurable separately from signup clicks.
 */
export function CampaignTrackedLink({
  fromSlug,
  targetSlug,
  href,
  className,
  children,
  ...rest
}: CampaignTrackedLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() =>
        fromSlug
          ? trackCampaignRelatedQuizClick(fromSlug, targetSlug)
          : trackCampaignHubQuizClick(targetSlug)
      }
      {...rest}
    >
      {children}
    </Link>
  );
}
