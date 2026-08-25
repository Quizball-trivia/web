"use client";

import { PostHogPageView } from "@/components/PostHogProvider";

/**
 * Public quiz routes do not need the authenticated app's query, player,
 * theme, socket, or toast providers. Keeping their client boundary lean cuts
 * the JavaScript shipped to organic-search visitors while preserving pageview
 * and scoped session-replay analytics.
 */
export function SeoProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PostHogPageView />
      {children}
    </>
  );
}
