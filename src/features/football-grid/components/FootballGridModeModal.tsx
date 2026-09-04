'use client';

/* eslint-disable @next/next/no-img-element -- icon comes from the reviewed grid CDN registry. */

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Bot, ScrollText, Swords } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { footballGridAssetUrl } from '@/lib/football-grid/assets';

const GRID_CARD_BG = '#C13333'; // slightly deeper than the play-hub card red so white text keeps contrast
const poppins = { fontFamily: 'var(--font-poppins)', fontWeight: 900 } as const;

const RULE_KEYS = [
  'play.gridRule1',
  'play.gridRule2',
  'play.gridRule3',
  'play.gridRule4',
  'play.gridRule5',
  'play.gridRule6',
  'play.gridRule7',
] as const;

function FootballGridRulesModal({
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
        style={{ backgroundColor: GRID_CARD_BG }}
      >
        <div className="absolute top-5 right-5 z-30">
          <ModalCloseButton
            onClose={() => onOpenChange(false)}
            className="!static !size-9 rounded-lg [&>svg]:size-4"
          />
        </div>

        <DialogTitle
          className="pr-10 text-left text-2xl uppercase leading-[0.95] text-brand-yellow"
          style={poppins}
        >
          {t('play.gridRulesTitle')}
        </DialogTitle>

        <ol className="mt-4 space-y-2.5 overflow-y-auto">
          {RULE_KEYS.map((key, i) => (
            <li key={key} className="flex items-start gap-3 rounded-xl bg-black/25 px-3.5 py-2.5">
              <span className="mt-px w-4 shrink-0 text-center font-poppins text-sm font-black tabular-nums text-brand-yellow">
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

// Netherlands is published server-side but has too few boards to feel fresh;
// it joins the picker after the club-criteria backfill.
export const GRID_PACKS = [
  { key: 'european', flag: '🌍' },
  { key: 'england', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { key: 'spain', flag: '🇪🇸' },
  { key: 'italy', flag: '🇮🇹' },
  { key: 'germany', flag: '🇩🇪' },
  { key: 'france', flag: '🇫🇷' },
  { key: 'brazil', flag: '🇧🇷' },
  { key: 'turkey', flag: '🇹🇷' },
  { key: 'argentina', flag: '🇦🇷' },
  { key: 'georgia', flag: '🇬🇪' },
] as const;
export type GridPackKey = (typeof GRID_PACKS)[number]['key'];
const PACK_STORAGE_KEY = 'qb-grid-pack';

export function readStoredGridPack(): GridPackKey {
  if (typeof window === 'undefined') return 'european';
  // Storage access itself throws in sandboxed/blocked contexts, not just the
  // write — an unguarded read here crashes the whole play hub.
  try {
    const stored = window.localStorage.getItem(PACK_STORAGE_KEY);
    return GRID_PACKS.some((pack) => pack.key === stored) ? stored as GridPackKey : 'european';
  } catch {
    return 'european';
  }
}

/** Grid mode dialog — icon hero → title → pack picker → CTA, auction-style. */
export function FootballGridModeModal({
  isOpen,
  onOpenChange,
  onFindOnline,
  demoHref,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onFindOnline: (pack: GridPackKey) => void;
  /** Guest mode: when set, a "try the demo" link renders under the online CTA
   *  (no opponents, no coins) while onFindOnline opens the sign-in dialog. */
  demoHref?: string;
}) {
  const { t } = useLocale();
  const [rulesOpen, setRulesOpen] = useState(false);
  // Lazy initializer instead of an effect: the modal only mounts on the client
  // (dialog content), so there is no hydration mismatch, and setState-in-effect
  // both lints and costs an extra render.
  const [pack, setPack] = useState<GridPackKey>(readStoredGridPack);
  const choosePack = (next: GridPackKey) => {
    setPack(next);
    try { window.localStorage.setItem(PACK_STORAGE_KEY, next); } catch { /* storage may be blocked */ }
  };
  const iconSrc = footballGridAssetUrl('/assets/football-grid/card-icon.png');
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-md w-[92vw] rounded-[24px] border-0',
          '!flex flex-col !gap-0 px-6 pt-8 pb-6 sm:px-8',
          '[&>button]:hidden',
        )}
        style={{ backgroundColor: GRID_CARD_BG }}
      >
        <div className="absolute top-5 right-5 z-30">
          <ModalCloseButton onClose={() => onOpenChange(false)} className="!static" />
        </div>

        {iconSrc && (
          <div className="mb-2 flex justify-center">
            <img
              src={iconSrc}
              alt=""
              className="h-28 w-auto object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.35)] sm:h-32"
            />
          </div>
        )}

        <DialogTitle
          className="text-center text-3xl sm:text-4xl uppercase text-brand-yellow leading-[0.95]"
          style={poppins}
        >
          {t('play.footballGridTitle')}
        </DialogTitle>

        <DialogDescription className="mx-auto mt-3 mb-4 max-w-[22rem] text-center text-[13px] sm:text-sm font-medium leading-snug text-white/85">
          {t('play.gridRulesDescription')}
        </DialogDescription>

        {/* Pack picker — choose which league you play on (Box2Box-style). */}
        <div className="mb-5">
          <p className="mb-2 text-center font-poppins text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
            {t('play.gridPackPickerTitle')}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {GRID_PACKS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                aria-pressed={pack === entry.key}
                onClick={() => choosePack(entry.key)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-2.5 transition-colors',
                  pack === entry.key
                    ? 'border-brand-yellow bg-black/30'
                    : 'border-white/15 bg-black/15 hover:border-white/35',
                )}
              >
                <span aria-hidden="true" className="text-xl leading-none">{entry.flag}</span>
                <span className="font-poppins text-[10px] font-black uppercase leading-tight text-white">
                  {t(`play.gridPack_${entry.key}`)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => onFindOnline(pack)}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-brand-yellow uppercase text-black transition-colors hover:bg-brand-yellow-deep"
            style={{ fontSize: 'clamp(15px, 2.4vw, 18px)', ...poppins }}
          >
            <Swords className="size-5" strokeWidth={2.5} />
            {t('play.gridFindOpponents')}
          </motion.button>

          {/* Guest demo — play vs AI, no coins, no opponents. */}
          {demoHref && (
            <Link
              href={demoHref}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/10 uppercase text-white transition-colors hover:bg-white/15"
              style={{ fontSize: 'clamp(14px, 2.2vw, 16px)', ...poppins }}
            >
              <Bot className="size-5" strokeWidth={2.5} />
              {t('play.guestDemoCta')}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="mx-auto mt-3 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 font-poppins text-sm font-bold uppercase tracking-wide text-white/85 transition-colors hover:bg-black/20 hover:text-white"
          >
            <ScrollText className="size-4" strokeWidth={2.5} />
            {t('play.gridRulesButton')}
          </button>
        </div>
      </DialogContent>

      <FootballGridRulesModal isOpen={rulesOpen} onOpenChange={setRulesOpen} />
    </Dialog>
  );
}
