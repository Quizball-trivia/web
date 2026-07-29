'use client';

import { Check, Lock, Ticket, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { poppins } from '../constants';
import { LeagueCountdown } from './LeagueCountdown';

type EntryMode = 'locked' | 'open' | 'entered';

/** The weekly-entry claim card. One free entry per week; opens Friday night. */
export function EntryPanel({
  mode,
  countdownTarget,
  countdownCaption,
  registered,
  onEnter,
}: {
  mode: EntryMode;
  countdownTarget: number | null;
  countdownCaption: string;
  registered: number;
  onEnter: () => void;
}) {
  const registeredRow = (
    <div className="flex items-center justify-center gap-1.5 font-poppins text-[12px] font-semibold text-white/55">
      <Users className="size-3.5" />
      {registered.toLocaleString()} players entered this week
    </div>
  );

  if (mode === 'entered') {
    return (
      <div className="rounded-[24px] border-2 border-brand-green/40 bg-brand-green/10 p-5 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-brand-green text-white"
        >
          <Check className="size-8" strokeWidth={3} />
        </motion.div>
        <div className="font-poppins text-2xl font-black uppercase text-white" style={poppins}>You&apos;re in!</div>
        <p className="mt-1 font-poppins text-[13px] font-semibold text-white/70">{countdownCaption}</p>
        {countdownTarget != null && (
          <div className="mt-4 flex justify-center">
            <LeagueCountdown targetMs={countdownTarget} size="sm" accent="text-brand-green" />
          </div>
        )}
        <div className="mt-4">{registeredRow}</div>
      </div>
    );
  }

  if (mode === 'locked') {
    return (
      <div className="rounded-[24px] border-2 border-white/10 bg-surface-card-deep p-5 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-white/8 text-white/60">
          <Lock className="size-6" />
        </div>
        <div className="font-poppins text-lg font-black uppercase text-white">Entry opens Friday</div>
        <p className="mt-1 font-poppins text-[13px] font-semibold text-white/60">{countdownCaption}</p>
        {countdownTarget != null && (
          <div className="mt-4 flex justify-center">
            <LeagueCountdown targetMs={countdownTarget} />
          </div>
        )}
        <button
          type="button"
          disabled
          className="mt-5 h-13 w-full cursor-not-allowed rounded-2xl bg-white/8 py-3.5 font-poppins text-base font-black uppercase tracking-wide text-white/40"
        >
          Opens Friday 21:00
        </button>
      </div>
    );
  }

  // open
  return (
    <div className="rounded-[24px] border-2 border-brand-yellow/30 bg-gradient-to-b from-brand-yellow/[0.08] to-transparent p-5 text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand-yellow text-black">
        <Ticket className="size-6" />
      </div>
      <div className="font-poppins text-2xl font-black uppercase text-white" style={poppins}>Claim your entry</div>
      <p className="mt-1 font-poppins text-[13px] font-semibold text-white/60">Free · one entry per week</p>

      {countdownTarget != null && (
        <div className="mt-4">
          <div className="mb-2 font-poppins text-[11px] font-black uppercase tracking-widest text-white/40">Qualifier kicks off in</div>
          <div className="flex justify-center">
            <LeagueCountdown targetMs={countdownTarget} />
          </div>
        </div>
      )}

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onEnter}
        className="mt-5 h-14 w-full rounded-2xl bg-brand-green py-3.5 font-poppins text-lg font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green/90"
      >
        Claim free entry
      </motion.button>

      <div className="mt-4">{registeredRow}</div>
    </div>
  );
}
