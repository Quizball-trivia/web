'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { TierFrameAvatar } from '@/components/TierFrameAvatar';
import { tierFromRp } from '@/utils/rankedTier';
import { cn } from '@/lib/utils';
import type { AvatarCustomization } from '@/types/game';

interface MatchHudIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function MatchHudIconButton({
  children,
  className,
  type = 'button',
  ...props
}: MatchHudIconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'flex size-8 items-center justify-center rounded-full border border-brand-blue/55 bg-brand-blue/25 text-white shadow-[0_8px_26px_rgba(31,81,255,0.28)] backdrop-blur-md transition-colors hover:border-brand-blue/80 hover:bg-brand-blue/35 sm:size-10',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface MatchHudAvatarProps {
  customization?: AvatarCustomization | null;
  side: 'player' | 'opponent';
  flipped?: boolean;
  /** Pre-match ranked points used to pick the tier shield frame. Null RP falls
   *  back to the Academy frame (RP 0), matching the draft/halftime ban screens —
   *  the HUD avatar is always framed. */
  rankPoints?: number | null;
}

export function MatchHudAvatar({ customization = null, side, flipped = false, rankPoints = null }: MatchHudAvatarProps) {
  void side;

  // TierFrameAvatar is a FIFA-style CARD (taller than wide, fixed inline size),
  // not a circle — so we don't constrain it to a square slot. It renders at its
  // own `sm` size (44×62) and the header row sizes around it.
  return (
    <div className="relative flex shrink-0 items-center justify-center">
      <TierFrameAvatar
        tier={tierFromRp(rankPoints ?? 0)}
        avatarCustomization={customization ?? {}}
        size="sm"
        mirrorAvatar={flipped}
        className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
      />
    </div>
  );
}
