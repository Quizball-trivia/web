'use client';

import { motion } from 'motion/react';
import { Swords } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';

interface AuctionModeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reserved for when Create Room ships — currently the option is disabled ("Soon"). */
  onCreateRoom?: () => void;
  onFindOnline: () => void;
}

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

export function AuctionModeModal({
  isOpen,
  onOpenChange,
  onFindOnline,
}: AuctionModeModalProps) {
  const { t } = useLocale();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-md w-[95vw] rounded-[24px] border-0',
          'p-6 sm:p-8',
          '[&>button]:hidden',
        )}
        style={{ backgroundColor: '#6B2FB3' }}
      >
        <div className="absolute top-5 right-5 z-30">
          <ModalCloseButton onClose={() => onOpenChange(false)} className="!static" />
        </div>

        <DialogHeader>
          <DialogTitle
            className="text-center text-2xl sm:text-3xl uppercase text-white"
            style={poppins}
          >
            <span className="text-brand-yellow">{t('play.auctionTitle')}</span>
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-white/90 mt-1">
            {t('play.auctionModalDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onFindOnline}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-[28px] bg-brand-yellow px-6 font-poppins text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-brand-yellow-deep"
            style={poppins}
          >
            <Swords className="size-5" strokeWidth={2.5} />
            {t('play.auctionFindOpponents')}
          </motion.button>

          {/* Create Room — not available yet ("Soon"). Styled like the
              Friendly modal's black "+" CTA but rendered disabled. */}
          <button
            type="button"
            disabled
            aria-disabled
            className={cn(
              'relative flex h-16 w-full items-center justify-center gap-3',
              'rounded-2xl bg-black uppercase leading-none text-white/70',
              'cursor-not-allowed opacity-60',
            )}
            style={{ fontSize: 'clamp(15px, 2vw, 18px)', ...poppins }}
          >
            <span aria-hidden className="font-poppins leading-none text-brand-yellow/70" style={{ fontSize: 'clamp(26px, 3.4vw, 34px)' }}>
              +
            </span>
            {t('play.auctionCreateRoom')}
            <span
              className="absolute right-4 rounded-full bg-brand-yellow px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-black"
              style={poppins}
            >
              {t('play.auctionCreateRoomSoon')}
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
