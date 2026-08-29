'use client';

import { motion } from 'motion/react';
import { Check, Eye, Users } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { colors } from '@/lib/colors';
import { poppins } from '../constants';
import { LeagueCountdown } from './LeagueCountdown';

/**
 * The Saturday check-in window. Registered players mark themselves ready in the
 * minutes before kickoff; the ready counter climbs as others check in. Miss the
 * window and you're out of this week's qualifier.
 */
export function CheckInPanel({
  stage = 'qualifier',
  checkedIn,
  ready,
  registered,
  closesAtMs,
  onCheckIn,
  onStart,
  spectator = false,
}: {
  /** Saturday qualifier vs Sunday final — the copy must say which one starts
   *  (the final's check-in card read "the qualifier starts…", Aug-24 report). */
  stage?: 'qualifier' | 'final';
  checkedIn: boolean;
  ready: number;
  registered: number;
  closesAtMs: number | null;
  onCheckIn: () => void;
  /** Prototype-only: skip the wait once ready. */
  onStart?: () => void;
  /** Read-only: countdown + ready meter, no button — what a watcher sees
   *  during the check-in window (they used to get a blank waiting card). */
  spectator?: boolean;
}) {
  const { t } = useLocale();
  const fin = stage === 'final';
  const pct = registered > 0 ? Math.round((ready / registered) * 100) : 0;

  return (
    <div
      className={`rounded-[24px] border-2 p-5 text-center ${
        checkedIn ? 'border-brand-green/45' : 'border-brand-yellow/40'
      }`}
    >
      {checkedIn ? (
        <>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-brand-green text-white"
          >
            <Check className="size-8" strokeWidth={3} />
          </motion.div>
          <div className="font-poppins text-2xl font-black uppercase text-white" style={poppins}>
            {t('weekendLeague.checkedIn')}
          </div>
          <p className="mx-auto mt-1 max-w-xs font-poppins text-[13px] font-semibold text-white/65">
            {t(fin ? 'weekendLeague.finalCheckedInBody' : 'weekendLeague.checkedInBody')}
          </p>
        </>
      ) : spectator ? (
        <>
          <div className="mb-2 flex justify-center">
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-poppins text-[11px] font-black uppercase tracking-widest text-white/70">
              <Eye className="size-3.5" /> {t('weekendLeague.gSpectator')}
            </span>
          </div>
          <div className="font-poppins text-2xl font-black uppercase text-white" style={poppins}>
            {t('weekendLeague.checkInTitle')}
          </div>
          <p className="mx-auto mt-1 max-w-sm font-poppins text-[13px] font-semibold text-white/65">
            {t(fin ? 'weekendLeague.finalSpectatorCheckinBody' : 'weekendLeague.spectatorCheckinBody')}
          </p>
        </>
      ) : (
        <>
          <div className="font-poppins text-2xl font-black uppercase text-white" style={poppins}>
            {t('weekendLeague.checkInTitle')}
          </div>
          <p className="mx-auto mt-1 max-w-sm font-poppins text-[13px] font-semibold text-white/65">
            {t(fin ? 'weekendLeague.finalCheckInBody' : 'weekendLeague.checkInBody')}
          </p>
        </>
      )}

      {closesAtMs != null && (
        <div className="mt-4">
          <div className="mb-2 font-poppins text-[11px] font-black uppercase tracking-widest text-white/50">
            {t('weekendLeague.checkInCloses')}
          </div>
          <div className="flex justify-center">
            <LeagueCountdown
              targetMs={closesAtMs}
              size="sm"
              plain
              accent={checkedIn ? 'text-brand-green-light' : 'text-brand-yellow'}
            />
          </div>
        </div>
      )}

      {!checkedIn && !spectator && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.02 }}
          onClick={onCheckIn}
          className="mx-auto mt-5 flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-2xl py-3.5 font-poppins text-lg font-black uppercase tracking-wide text-black"
          style={{ backgroundColor: colors.green.light }}
        >
          {t('weekendLeague.checkInCta')}
        </motion.button>
      )}

      {/* Ready counter — climbs as registered players check in. */}
      <div className="mx-auto mt-5 max-w-xs">
        <div className="h-2 overflow-hidden rounded-full bg-black/30">
          <motion.div
            className="h-full rounded-full bg-brand-green-light"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5 font-poppins text-[12px] font-bold uppercase tracking-wide text-white/70">
          <Users className="size-3.5" />
          <span className="tabular-nums">
            {t('weekendLeague.readyCount', {
              ready: ready.toLocaleString(),
              total: registered.toLocaleString(),
            })}
          </span>
        </div>
      </div>

      {checkedIn && onStart && (
        <button
          type="button"
          onClick={onStart}
          className="mx-auto mt-4 block font-poppins text-[12px] font-bold uppercase tracking-widest text-white/40 hover:text-white"
        >
          {t('weekendLeague.gStartNow')}
        </button>
      )}
    </div>
  );
}
