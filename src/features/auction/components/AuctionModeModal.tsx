'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { Swords } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { poppins, AUCTION_PURPLE } from '../constants/auction.constants';

interface AuctionModeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reserved for when Create Room ships. */
  onCreateRoom?: () => void;
  onFindOnline: () => void;
}

/** Auction mode dialog — icon hero on top → title → rules → yellow CTA. */
export function AuctionModeModal({ isOpen, onOpenChange, onFindOnline }: AuctionModeModalProps) {
  const { t } = useLocale();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-md w-[92vw] rounded-[24px] border-0',
          '!flex flex-col !gap-0 px-6 pt-8 pb-6 sm:px-8',
          '[&>button]:hidden',
        )}
        style={{ backgroundColor: AUCTION_PURPLE }}
      >
        <div className="absolute top-5 right-5 z-30">
          <ModalCloseButton onClose={() => onOpenChange(false)} className="!static" />
        </div>

        {/* Icon hero */}
        <div className="mb-2 flex justify-center">
          <Image
            src="/assets/auction-card-icon.webp"
            alt=""
            width={320}
            height={320}
            className="h-28 w-auto object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.35)] sm:h-32"
          />
        </div>

        {/* Title */}
        <DialogTitle
          className="text-center text-3xl sm:text-4xl uppercase text-brand-yellow leading-[0.95]"
          style={poppins}
        >
          {t('play.auctionTitle')}
        </DialogTitle>

        {/* Rules description */}
        <DialogDescription className="mx-auto mt-3 mb-5 max-w-[22rem] text-center text-[13px] sm:text-sm font-medium leading-snug text-white/85">
          {t('play.auctionRulesDescription')}
        </DialogDescription>

        {/* Primary CTA — yellow swords button. Wrapped so the dialog's
            `[&>button]:hidden` (which hides shadcn's built-in close) doesn't
            also hide our CTA. */}
        <div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onFindOnline}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-brand-yellow uppercase text-black transition-colors hover:bg-brand-yellow-deep"
            style={{ fontSize: 'clamp(15px, 2.4vw, 18px)', ...poppins }}
          >
            <Swords className="size-5" strokeWidth={2.5} />
            {t('play.auctionFindOpponents')}
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
