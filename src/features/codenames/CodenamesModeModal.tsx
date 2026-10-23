'use client';

/* eslint-disable @next/next/no-img-element -- the card icon is a static public asset. */

import { useState, useSyncExternalStore } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, ScrollText, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { useLocale } from '@/contexts/LocaleContext';
import { BoardPicker } from './BoardPicker';
import { readBoard, writeBoard } from './codenames.board';
import { codenamesCopy } from './codenames.copy';
import type { BoardKind } from './codenames.view';

const MODAL_BG = '#1F6B08'; // a deeper shade of the Play card's green so white text keeps contrast
const poppins = { fontFamily: 'var(--font-poppins)', fontWeight: 900 } as const;
const secondary = 'flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-white/10 px-2 uppercase text-white transition-colors hover:bg-white/15';
const noSubscription = () => () => {};

function CodenamesRulesModal({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const { locale } = useLocale();
  const c = codenamesCopy(locale).modal;
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="!flex max-h-[85vh] w-[92vw] max-w-md flex-col !gap-0 rounded-[24px] border-0 px-6 pb-6 pt-7 sm:px-7 [&>button]:hidden" style={{ backgroundColor: MODAL_BG }}>
        <div className="absolute right-5 top-5 z-30">
          <ModalCloseButton onClose={() => onOpenChange(false)} className="!static !size-9 rounded-lg [&>svg]:size-4" />
        </div>
        <DialogTitle className="pr-10 text-left text-2xl uppercase leading-[0.95] text-brand-yellow" style={poppins}>{c.rulesTitle}</DialogTitle>
        <ol data-codenames-rules className="mt-4 space-y-2.5 overflow-y-auto">
          {c.rulesList.map((rule, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl bg-black/25 px-3.5 py-2.5">
              <span className="mt-px w-4 shrink-0 text-center font-poppins text-sm font-black tabular-nums text-brand-yellow">{i + 1}</span>
              <p className="text-[13px] font-medium leading-snug text-white/90 sm:text-sm">{rule}</p>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Football Codenames from the Play screen (members; guests read the public page): pick the board for a friend room, or
 * open the daily board. No online matchmaking yet.
 */
export function CodenamesModeModal({ isOpen, onOpenChange, onPlayWithFriend, onDaily }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPlayWithFriend: (board: BoardKind) => void;
  onDaily: () => void;
}) {
  const { t, locale } = useLocale();
  const c = codenamesCopy(locale);
  const [rulesOpen, setRulesOpen] = useState(false);
  // The board the viewer picked last (here or on the Codenames screen), read after mount.
  const stored = useSyncExternalStore(noSubscription, readBoard, () => 'pictures' as const);
  const [picked, setPicked] = useState<BoardKind | null>(null);
  const board = picked ?? stored;
  const pick = (next: BoardKind) => { setPicked(next); writeBoard(next); };
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent data-codenames-modal className="!flex w-[92vw] max-w-md flex-col !gap-0 rounded-[24px] border-0 px-5 pb-5 pt-5 sm:px-6 [&>button]:hidden" style={{ backgroundColor: MODAL_BG }}>
        <div className="absolute right-4 top-4 z-30">
          <ModalCloseButton onClose={() => onOpenChange(false)} className="!static !size-9 rounded-lg [&>svg]:size-4" />
        </div>

        <div className="flex items-center gap-3 pr-10">
          <img src="/assets/codenames-card-icon.webp" alt="" className="h-14 w-14 shrink-0 object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.35)]" />
          <div className="min-w-0">
            <DialogTitle className="text-left text-2xl uppercase leading-[0.95] text-brand-yellow sm:text-[28px]" style={poppins}>{t('play.codenamesTitle')}</DialogTitle>
            <DialogDescription className="mt-1 text-left text-[12px] font-medium leading-snug text-white/80">{c.modal.tagline}</DialogDescription>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-1.5 font-poppins text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{c.modal.pickBoard}</p>
          <BoardPicker locale={locale} value={board} onChange={pick} />
        </div>

        <div className="mt-4">
          <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => onPlayWithFriend(board)} data-codenames-mode="friend"
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-brand-yellow uppercase text-black transition-colors hover:bg-brand-yellow-deep"
            style={{ fontSize: 'clamp(14px, 2.4vw, 17px)', ...poppins }}>
            <Users className="size-5" strokeWidth={2.5} />
            {t('friend.playWithFriend')}
          </motion.button>
          <button type="button" onClick={onDaily} data-codenames-mode="daily" className={`${secondary} mt-2.5 w-full`} style={{ fontSize: 'clamp(11px, 2vw, 13px)', ...poppins }}>
            <CalendarDays className="size-4 shrink-0" strokeWidth={2.5} />
            <span className="whitespace-nowrap leading-normal">{c.modal.daily}</span>
          </button>
          <p className="mt-2.5 text-center text-[11px] font-semibold text-white/60">{c.modal.onlineSoon}</p>
          <button type="button" onClick={() => setRulesOpen(true)}
            className="mx-auto mt-1 flex items-center justify-center gap-1.5 rounded-xl px-4 py-1.5 font-poppins text-[13px] font-bold uppercase tracking-wide text-white/85 transition-colors hover:bg-black/20 hover:text-white">
            <ScrollText className="size-4" strokeWidth={2.5} />
            {c.modal.rules}
          </button>
        </div>
      </DialogContent>
      <CodenamesRulesModal isOpen={rulesOpen} onOpenChange={setRulesOpen} />
    </Dialog>
  );
}
