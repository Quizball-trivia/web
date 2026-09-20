'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { ScrollText, User, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';

const CARD_BG = '#1238C9'; // brand blue, a step deeper so the yellow CTA and white copy hold contrast
const poppins = { fontFamily: 'var(--font-poppins)', fontWeight: 900 } as const;
const RULE_KEYS = ['play.missingXiRule1', 'play.missingXiRule2', 'play.missingXiRule3', 'play.missingXiRule4', 'play.missingXiRule5'] as const;

function MissingXiRulesModal({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useLocale();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('max-w-md w-[92vw] rounded-[24px] border-0', '!flex max-h-[85vh] flex-col !gap-0 px-6 pt-7 pb-6 sm:px-7', '[&>button]:hidden')}
        style={{ backgroundColor: CARD_BG }}
      >
        <div className="absolute top-5 right-5 z-30">
          <ModalCloseButton onClose={() => onOpenChange(false)} className="!static !size-9 rounded-lg [&>svg]:size-4" />
        </div>
        <DialogTitle className="pr-10 text-left text-2xl uppercase leading-[0.95] text-brand-yellow" style={poppins}>
          {t('play.missingXiRulesTitle')}
        </DialogTitle>
        <ol className="mt-4 space-y-2.5 overflow-y-auto">
          {RULE_KEYS.map((key, i) => (
            <li key={key} className="flex items-start gap-3 rounded-xl bg-black/25 px-3.5 py-2.5">
              <span className="mt-px w-4 shrink-0 text-center font-poppins text-sm font-black tabular-nums text-brand-yellow">{i + 1}</span>
              <p className="text-[13px] font-medium leading-snug text-white/90 sm:text-sm">{t(key)}</p>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}

/** Missing XI entry dialog: art hero → title → Solo CTA → Multiplayer (coming soon) → rules. */
export function MissingXiModeModal({
  isOpen,
  onOpenChange,
  onPlaySolo,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaySolo: () => void;
}) {
  const { t } = useLocale();
  const [rulesOpen, setRulesOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('max-w-md w-[92vw] rounded-[24px] border-0', '!flex flex-col !gap-0 px-6 pt-8 pb-6 sm:px-8', '[&>button]:hidden')}
        style={{ backgroundColor: CARD_BG }}
      >
        <div className="absolute top-5 right-5 z-30">
          <ModalCloseButton onClose={() => onOpenChange(false)} className="!static" />
        </div>
        <div className="mb-3 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- local artwork */}
          <img
            src="/assets/demos/game-modes/lab-missing-xi.webp"
            alt=""
            className="h-32 w-56 rounded-2xl object-cover drop-shadow-[0_6px_24px_rgba(0,0,0,0.35)] sm:h-36 sm:w-64"
          />
        </div>
        <DialogTitle className="text-center text-3xl uppercase leading-[0.95] text-brand-yellow sm:text-4xl" style={poppins}>
          {t('play.missingXiTitle')}
        </DialogTitle>
        <DialogDescription className="mx-auto mt-3 mb-5 max-w-[22rem] text-center text-[13px] font-medium leading-snug text-white/85 sm:text-sm">
          {t('play.missingXiDescription')}
        </DialogDescription>
        <div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onPlaySolo}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-brand-yellow uppercase text-black transition-colors hover:bg-brand-yellow-deep"
            style={{ fontSize: 'clamp(15px, 2.4vw, 18px)', ...poppins }}
          >
            <User className="size-5" strokeWidth={2.5} />
            {t('play.missingXiSolo')}
          </motion.button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="mt-3 flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-white/10 uppercase text-white/45"
            style={{ fontSize: 'clamp(14px, 2.2vw, 16px)', ...poppins }}
          >
            <Users className="size-5" strokeWidth={2.5} />
            {t('play.missingXiMultiplayer')}
            <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 font-poppins text-[10px] font-bold tracking-wide text-white/70">
              {t('play.comingSoon')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="mx-auto mt-3 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 font-poppins text-sm font-bold uppercase tracking-wide text-white/85 transition-colors hover:bg-black/20 hover:text-white"
          >
            <ScrollText className="size-4" strokeWidth={2.5} />
            {t('play.missingXiRulesButton')}
          </button>
        </div>
      </DialogContent>
      <MissingXiRulesModal isOpen={rulesOpen} onOpenChange={setRulesOpen} />
    </Dialog>
  );
}
