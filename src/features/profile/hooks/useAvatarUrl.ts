import { useMemo } from 'react';
import { getDiceBearAvatarUrl, isGoogleAvatarUrl } from '@/lib/avatars';
import type { AvatarCustomization } from '@/types/game';

interface UseAvatarUrlParams {
  avatarUrl?: string | null;
  avatarCustomization?: AvatarCustomization;
  fallbackAvatar: string;
}

interface AvatarUrlResult {
  /** The base value for AvatarDisplay (avatarUrl -> customization.base -> fallback) */
  avatarBase: string;
  /** The resolved URL for the avatar picker (avatarUrl or derived from customization.base) */
  resolvedAvatarUrl: string | null;
  /** The Google avatar URL if avatarUrl is a Google avatar, null otherwise */
  googleAvatarUrl: string | null;
}

/**
 * Computes avatar URL values with proper fallback order:
 * 1. avatarUrl (if provided)
 * 2. player.avatarCustomization?.base (converted to DiceBear URL if not already a URL)
 * 3. fallbackAvatar
 */
export function useAvatarUrl({
  avatarUrl,
  avatarCustomization,
  fallbackAvatar,
}: UseAvatarUrlParams): AvatarUrlResult {
  return useMemo(() => {
    const baseValue = avatarCustomization?.base;

    // Derive avatar base for display (fallback order)
    const avatarBase = avatarUrl ?? baseValue ?? fallbackAvatar;

    // Derive the resolved URL from customization base
    const derivedUrl = baseValue
      ? /^https?:\/\//i.test(baseValue)
        ? baseValue
        : getDiceBearAvatarUrl(baseValue, 96)
      : null;

    // Final resolved URL (avatarUrl takes precedence)
    const resolvedAvatarUrl = avatarUrl ?? derivedUrl;

    // Check if the avatarUrl is a Google avatar
    const googleAvatarUrl = avatarUrl && isGoogleAvatarUrl(avatarUrl) ? avatarUrl : null;

    return {
      avatarBase,
      resolvedAvatarUrl,
      googleAvatarUrl,
    };
  }, [avatarUrl, avatarCustomization?.base, fallbackAvatar]);
}
