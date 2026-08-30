'use client';

import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        trackCampaignSignupClick(slug, placement);
        router.push(href);
      }}
    >
      {children}
    </button>
  );
}
