'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { poppins, AUCTION_PURPLE } from '../constants/auction.constants';

const RULE_KEYS = [
  'play.auctionRule1',
  'play.auctionRule2',
  'play.auctionRule3',
  'play.auctionRule4',
  'play.auctionRule5',
  'play.auctionRule6',
  'play.auctionRule7',
] as const;

/** Full "how it works" list for the auction — opened from the mode modal. */
export function AuctionRulesModal({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLocale();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-md w-[92vw] rounded-[24px] border-0',
          '!flex max-h-[85vh] flex-col !gap-0 px-6 pt-7 pb-6 sm:px-7',
          '[&>button]:hidden',
        )}
        style={{ backgroundColor: AUCTION_PURPLE }}
      >
        <div className="absolute top-5 right-5 z-30">
          {/* Compact close: the rules list is dense text, so the standard
              48px X reads oversized here (owner call, 2026-08-26). */}
          <ModalCloseButton
            onClose={() => onOpenChange(false)}
            className="!static !size-9 rounded-lg [&>svg]:size-4"
          />
        </div>

        <DialogTitle
          className="pr-10 text-left text-2xl uppercase leading-[0.95] text-brand-yellow"
          style={poppins}
        >
          {t('play.auctionRulesTitle')}
        </DialogTitle>

        <ol className="mt-4 space-y-2.5 overflow-y-auto">
          {RULE_KEYS.map((key, i) => (
            <li key={key} className="flex items-start gap-3 rounded-xl bg-black/25 px-3.5 py-2.5">
              <span
                className="mt-px w-4 shrink-0 text-center font-poppins text-sm font-black tabular-nums text-brand-yellow"
              >
                {i + 1}
              </span>
              <p className="text-[13px] font-medium leading-snug text-white/90 sm:text-sm">
                {t(key)}
              </p>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
