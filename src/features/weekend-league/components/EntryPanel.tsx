'use client';

import { Check, Lock, Ticket, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useLocale } from '@/contexts/LocaleContext';
import { colors } from '@/lib/colors';
import { poppins } from '../constants';
import { LeagueCountdown } from './LeagueCountdown';

type EntryMode = 'locked' | 'open' | 'entered';

/** The weekly-entry claim card. One free entry per week; closes Friday midnight. */
export function EntryPanel({
  mode,
  countdownTarget,
  countdownCaption,
  registered,
  onEnter,
  flush = false,
}: {
  mode: EntryMode;
  countdownTarget: number | null;
  countdownCaption: string;
  registered: number;
  onEnter: () => void;
  /** Rendered inside the league header card: square the top, keep the bottom radius. */
  flush?: boolean;
}) {
  const { t } = useLocale();
  const registeredRow = (
    <div className="flex items-center justify-center gap-1.5 font-poppins text-[12px] font-semibold text-white/55">
      <Users className="size-3.5" />
      {t('weekendLeague.playersEntered', { count: registered.toLocaleString() })}
    </div>
  );

  if (mode === 'entered') {
    return (
      <div className={`border-2 border-brand-green/40 bg-brand-green/10 p-5 text-center ${flush ? 'rounded-b-[22px] border-x-0 border-b-0 border-t' : 'rounded-[24px]'}`}>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-brand-green text-white"
        >
          <Check className="size-8" strokeWidth={3} />
        </motion.div>
        <div className="font-poppins text-2xl font-black uppercase text-white" style={poppins}>{t('weekendLeague.enteredTitle')}</div>
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
        <div className="font-poppins text-lg font-black uppercase text-white">{t('weekendLeague.entryClosedTitle')}</div>
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
          {t('weekendLeague.entryClosedCta')}
        </button>
      </div>
    );
  }

  // open
  return (
    <div
      className={`relative overflow-hidden p-5 text-center ${flush ? 'rounded-b-[22px]' : 'rounded-[24px]'}`}
      style={{ backgroundColor: colors.blue.brand }}
    >
      <div
        className="mx-auto mb-4 inline-block rounded-full px-4 py-1.5 font-poppins text-[11px] font-black uppercase tracking-[0.18em] text-black"
        style={{ backgroundColor: '#FF6C0A' }}
      >
        {t('weekendLeague.dontMissOut')}
      </div>

      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand-yellow text-black">
        <Ticket className="size-6" />
      </div>
      <div className="font-poppins text-2xl font-black uppercase text-white" style={poppins}>{t('weekendLeague.claimTitle')}</div>
      <p className="mt-1 font-poppins text-[13px] font-semibold text-white/75">{t('weekendLeague.claimSubtitle')}</p>

      {countdownTarget != null && (
        <div className="mt-4">
          <div className="mb-2 font-poppins text-[11px] font-black uppercase tracking-widest text-white/60">{t('weekendLeague.qualifierKicksOff')}</div>
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
        {t('weekendLeague.claimCta')}
      </motion.button>

      <div className="mt-4">{registeredRow}</div>
    </div>
  );
}
