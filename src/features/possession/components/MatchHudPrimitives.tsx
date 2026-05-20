'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AvatarDisplay } from '@/components/AvatarDisplay';
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
}

export function MatchHudAvatar({ customization = null, side, flipped = false }: MatchHudAvatarProps) {
  void side;

  return (
    <div className="relative flex size-10 shrink-0 items-center justify-center sm:size-12">
      <AvatarDisplay
        customization={customization ?? {}}
        size="xs"
        className={cn('size-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]', flipped && '-scale-x-100')}
      />
    </div>
  );
}
