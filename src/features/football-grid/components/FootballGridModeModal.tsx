'use client';

/* eslint-disable @next/next/no-img-element -- icon comes from the reviewed grid CDN registry. */

import { BrandIcon } from '@/components/brand/BrandIcon';
import { useState } from 'react';
import { motion } from 'motion/react';
import { ScrollText, Swords, Dumbbell, Users } from 'lucide-react';
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
  onTraining,
  onPlayWithFriend,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onFindOnline: (pack: GridPackKey) => void;
  /** Guided training board (scripted, vs CoachBot): members play it in place, guests on the public Tic Tac Toe page. */
  onTraining?: () => void;
  /** Friend room (link or code); open to guests once guest lobbies ship. */
  onPlayWithFriend?: () => void;
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
          '!flex flex-col !gap-0 px-5 pt-5 pb-5 sm:px-6',
          '[&>button]:hidden',
        )}
        style={{ backgroundColor: GRID_CARD_BG }}
      >
        <div className="absolute top-4 right-4 z-30">
          <ModalCloseButton onClose={() => onOpenChange(false)} className="!static !size-9 rounded-lg [&>svg]:size-4" />
        </div>

        {/* Compact header: icon beside the title instead of a stacked hero, so
            the league picker and every action stay on one phone screen. */}
        <div className="flex items-center gap-3 pr-10">
          {iconSrc && (
            <img
              src={iconSrc}
              alt=""
              className="h-14 w-14 shrink-0 object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.35)]"
            />
          )}
          <div className="min-w-0">
            <DialogTitle
              className="text-left text-2xl uppercase leading-[0.95] text-brand-yellow sm:text-[28px]"
              style={poppins}
            >
              {t('play.footballGridTitle')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-left text-[12px] font-medium leading-snug text-white/80">
              {t('play.gridRulesDescription')}
            </DialogDescription>
          </div>
        </div>

        {/* Pack picker — every league visible, two rows of five. */}
        <div className="mt-4">
          <p className="mb-1.5 font-poppins text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
            {t('play.gridPackPickerTitle')}
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {GRID_PACKS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                aria-pressed={pack === entry.key}
                onClick={() => choosePack(entry.key)}
                className={cn(
                  'flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl border-2 px-1 py-1.5 transition-colors',
                  pack === entry.key
                    ? 'border-brand-yellow bg-black/30'
                    : 'border-white/15 bg-black/15 hover:border-white/35',
                )}
              >
                {entry.key === 'european' ? <BrandIcon name="globe" className="size-5" /> : <span aria-hidden="true" className="text-lg leading-none">{entry.flag}</span>}
                <span className="line-clamp-2 break-words text-center font-poppins text-[9px] font-black uppercase leading-[1.1] text-white">
                  {t(`play.gridPack_${entry.key}`)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => onFindOnline(pack)}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-brand-yellow uppercase text-black transition-colors hover:bg-brand-yellow-deep"
            style={{ fontSize: 'clamp(14px, 2.4vw, 17px)', ...poppins }}
          >
            <Swords className="size-5" strokeWidth={2.5} />
            {t('play.gridFindOpponents')}
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
              {/* Training — the scripted tutorial board (no coins, no opponents). */}
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

          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="mx-auto mt-2 flex items-center justify-center gap-1.5 rounded-xl px-4 py-1.5 font-poppins text-[13px] font-bold uppercase tracking-wide text-white/85 transition-colors hover:bg-black/20 hover:text-white"
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
