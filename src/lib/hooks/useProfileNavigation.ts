'use client';

import { useRouter } from 'next/navigation';
import type { KeyboardEvent } from 'react';

const INTERACTIVE_CLASS =
  'cursor-pointer transition-colors hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30';

export interface ProfileNavTarget {
  /** True when the element should be interactive (real user, not AI/bot). */
  canViewProfile: boolean;
  /** Spread onto the clickable element (empty object when not interactive). */
  handlers: Record<string, unknown>;
  /** Interactive affordances (cursor + focus ring); '' when not interactive. */
  className: string;
}

type Router = ReturnType<typeof useRouter>;

/**
 * Build the "click this person → open their profile" props for one target.
 * Navigation is gated: AI/bot opponents (no real user id) stay non-interactive
 * so we never route to /profile/null. Pure (takes a router) so it works inside
 * a .map() as well as at the top level.
 */
export function buildProfileNavTarget(
  router: Router,
  userId: string | null | undefined,
  isAi = false,
): ProfileNavTarget {
  const canViewProfile = Boolean(userId) && !isAi;
  if (!canViewProfile) return { canViewProfile: false, handlers: {}, className: '' };

  const goToProfile = () => router.push(`/profile/${userId}`);
  return {
    canViewProfile: true,
    handlers: {
      role: 'button' as const,
      tabIndex: 0,
      onClick: goToProfile,
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goToProfile();
        }
      },
    },
    className: INTERACTIVE_CLASS,
  };
}

/** Top-level convenience wrapper (single target, not inside a loop). */
export function useProfileNavigation(userId: string | null | undefined, isAi = false): ProfileNavTarget {
  const router = useRouter();
  return buildProfileNavTarget(router, userId, isAi);
}
