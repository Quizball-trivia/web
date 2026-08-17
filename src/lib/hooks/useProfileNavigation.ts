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

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Server-side display fallbacks that are NOT the row's nickname — linking to
// them would open whichever real user happens to own that name (review).
const DISPLAY_FALLBACKS = new Set(['player', 'opponent']);

/** Nickname-preferring profile handle; the UUID whenever the nickname cannot
 *  make a safe URL: empty, a dot segment ('.'/'..' normalize away), shaped
 *  like a UUID (would be routed as an id), or a known display fallback. */
export function profileHandle(userId: string | null | undefined, nickname?: string | null): string {
  const trimmed = nickname?.trim() ?? '';
  if (
    trimmed === '' || trimmed === '.' || trimmed === '..'
    || trimmed.length > 100 // resolver caps at 100; storage doesn't (identity names)
    || UUID_SHAPE.test(trimmed)
    || DISPLAY_FALLBACKS.has(trimmed.toLowerCase())
  ) return userId ?? '';
  return encodeURIComponent(trimmed);
}

export function buildProfileNavTarget(
  router: Router,
  userId: string | null | undefined,
  isAi = false,
  nickname?: string | null,
): ProfileNavTarget {
  const canViewProfile = Boolean(userId) && !isAi;
  if (!canViewProfile) return { canViewProfile: false, handlers: {}, className: '' };

  // Nicknames are unique (lower(nickname) unique index), so they make shareable
  // URLs — /profile/მახატა beats /profile/<uuid>. The id stays the fallback.
  const handle = profileHandle(userId, nickname);
  const goToProfile = () => router.push(`/profile/${handle}`);
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
export function useProfileNavigation(
  userId: string | null | undefined,
  isAi = false,
  nickname?: string | null,
): ProfileNavTarget {
  const router = useRouter();
  return buildProfileNavTarget(router, userId, isAi, nickname);
}
