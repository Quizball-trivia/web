"use client";

import { AvatarDisplay } from "@/components/AvatarDisplay";
import { randomBotAvatar } from "@/features/auction/data/botAvatars";
import { cn } from "@/lib/utils";
import type { AvatarCustomization } from "@/types/game";

interface AvatarSource {
  userId: string;
  avatarCustomization: AvatarCustomization | null;
  avatarUrl: string | null;
  isGuest: boolean;
}

/**
 * A player's avatar on duel screens: the one they built in the store, else their picture; a guest (or a member who
 * never picked one) gets a generic avatar seeded by their id (in the guest's jersey), the same for the whole match.
 */
export function seatAvatar(source: AvatarSource): AvatarCustomization {
  // A guest's stored avatar is only the jersey colour it was given: a generic face seeded by its id, in that jersey.
  if (source.isGuest) {
    const jersey = source.avatarCustomization?.jersey;
    return { ...randomBotAvatar(source.userId), ...(jersey ? { jersey } : {}) };
  }
  if (source.avatarCustomization) return source.avatarCustomization;
  if (source.avatarUrl) return { base: source.avatarUrl };
  return randomBotAvatar(source.userId);
}

export function DuelAvatar({ customization, size, className }: {
  customization: AvatarCustomization;
  size: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex shrink-0", className)}>
      <AvatarDisplay customization={customization} size={size} />
    </span>
  );
}
