'use client';

import Link from 'next/link';
import { trackCampaignSignupClick } from './campaignQuiz.analytics';
import type { CampaignCtaPlacement } from './campaignAttribution';

interface CampaignSignupLinkProps {
  slug: string;
  placement: CampaignCtaPlacement;
  href: string;
  className?: string;
  children: React.ReactNode;
}

export function CampaignSignupLink({
  slug,
  placement,
  href,
  className,
  children,
}: CampaignSignupLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackCampaignSignupClick(slug, placement)}
    >
      {children}
    </Link>
  );
}
