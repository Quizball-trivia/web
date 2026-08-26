'use client';

import { X } from 'lucide-react';

interface AuctionLeaveControlProps {
  ariaLabel: string;
  onClick: () => void;
}

/** Mobile-safe floating leave control shared by the live match and dev harness. */
export function AuctionLeaveControl({ ariaLabel, onClick }: AuctionLeaveControlProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="fixed left-[calc(env(safe-area-inset-left)+0.75rem)] top-[calc(env(safe-area-inset-top)+0.25rem)] z-[60] flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:border-white/30 hover:bg-black/65 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow sm:left-3 sm:top-3"
    >
      <X className="size-5" aria-hidden="true" />
    </button>
  );
}
