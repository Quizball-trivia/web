'use client';

import { WifiOff } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

/** Persistent seat-level state while a human is inside the reconnect window. */
export function DisconnectedPitchOverlay({ playerName }: { playerName: string }) {
  const { t } = useLocale();

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-surface-page/75 px-3 text-center backdrop-blur-[2px]"
    >
      <div className="flex max-w-full flex-col items-center">
        <span className="flex size-10 items-center justify-center rounded-full border-2 border-brand-red/70 bg-black/45 text-brand-red shadow-[0_8px_20px_rgba(0,0,0,0.35)] md:size-12">
          <WifiOff className="size-5 md:size-6" aria-hidden="true" />
        </span>
        <span className="mt-2 max-w-full truncate font-poppins text-xs font-black uppercase text-white md:text-sm">
          {playerName}
        </span>
        <span className="mt-0.5 font-poppins text-[10px] font-black uppercase tracking-[0.16em] text-brand-red md:text-xs">
          {t('auctionGame.disconnected')}
        </span>
      </div>
    </div>
  );
}
