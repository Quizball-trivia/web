'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Dumbbell, ScrollText, Swords , Users } from 'lucide-react';
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
import { AuctionRulesModal } from './AuctionRulesModal';

interface AuctionModeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reserved for when Create Room ships. */
  onCreateRoom?: () => void;
  onFindOnline: () => void;
  /** Guided training auction (scripted, vs bots): members play it in place, guests on the public Auction page. */
  onTraining?: () => void;
  /** Friend room (link or code); open to guests once guest lobbies ship. */
  onPlayWithFriend?: () => void;
}

/** Auction mode dialog — icon hero on top → title → rules → yellow CTA. */
export function AuctionModeModal({ isOpen, onOpenChange, onFindOnline, onTraining, onPlayWithFriend }: AuctionModeModalProps) {
  const { t } = useLocale();
  const [rulesOpen, setRulesOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-md w-[92vw] rounded-[24px] border-0',
          '!flex flex-col !gap-0 px-5 pt-5 pb-5 sm:px-6',
          '[&>button]:hidden',
        )}
        style={{ backgroundColor: AUCTION_PURPLE }}
      >
        <div className="absolute top-4 right-4 z-30">
          <ModalCloseButton onClose={() => onOpenChange(false)} className="!static !size-9 rounded-lg [&>svg]:size-4" />
        </div>

        {/* Compact header (same shape as the Tic Tac Toe dialog): icon beside
            the title, description underneath. */}
        <div className="flex items-center gap-3 pr-10">
          <Image
            src="/assets/auction-card-icon.webp"
            alt=""
            width={320}
            height={320}
            className="h-14 w-14 shrink-0 object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.35)]"
          />
          <div className="min-w-0">
            <DialogTitle
              className="text-left text-2xl uppercase leading-[0.95] text-brand-yellow sm:text-[28px]"
              style={poppins}
            >
              {t('play.auctionTitle')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-left text-[12px] font-medium leading-snug text-white/80">
              {t('play.auctionRulesDescription')}
            </DialogDescription>
          </div>
        </div>

        {/* Primary CTA — yellow swords button. Wrapped so the dialog's
            `[&>button]:hidden` (which hides shadcn's built-in close) doesn't
            also hide our CTA. */}
        <div className="mt-4">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onFindOnline}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-brand-yellow uppercase text-black transition-colors hover:bg-brand-yellow-deep"
            style={{ fontSize: 'clamp(14px, 2.4vw, 17px)', ...poppins }}
          >
            <Swords className="size-5" strokeWidth={2.5} />
            {t('play.auctionFindOpponents')}
          </motion.button>

          {/* Secondary actions share one row. */}
          {(onPlayWithFriend || onTraining) && (
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              {onPlayWithFriend && (
                <button
                  type="button"
                  onClick={onPlayWithFriend}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-white/10 px-2 uppercase text-white transition-colors hover:bg-white/15"
                  style={{ fontSize: 'clamp(11px, 2vw, 13px)', ...poppins }}
                >
                  <Users className="size-4 shrink-0" strokeWidth={2.5} />
                  <span className="whitespace-nowrap leading-normal">{t('friend.playWithFriend')}</span>
                </button>
              )}
              {/* Training — the scripted tutorial auction (no coins, no opponents). */}
              {onTraining && (
                <button
                  type="button"
                  onClick={onTraining}
                  className={cn(
                    'flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-white/10 px-2 uppercase text-white transition-colors hover:bg-white/15',
                    !onPlayWithFriend && 'col-span-2',
                  )}
                  style={{ fontSize: 'clamp(11px, 2vw, 13px)', ...poppins }}
                >
                  <Dumbbell className="size-4 shrink-0" strokeWidth={2.5} />
                  <span className="whitespace-nowrap leading-normal">{t('play.guestDemoCta')}</span>
                </button>
              )}
            </div>
          )}

          {/* Secondary: the full how-it-works list in its own modal. */}
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="mx-auto mt-2 flex items-center justify-center gap-1.5 rounded-xl px-4 py-1.5 font-poppins text-[13px] font-bold uppercase tracking-wide text-white/85 transition-colors hover:bg-black/20 hover:text-white"
          >
            <ScrollText className="size-4" strokeWidth={2.5} />
            {t('play.auctionRulesButton')}
          </button>
        </div>
      </DialogContent>

      <AuctionRulesModal isOpen={rulesOpen} onOpenChange={setRulesOpen} />
    </Dialog>
  );
}
