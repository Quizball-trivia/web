'use client';

import Link from 'next/link';
import { Ticket, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useLocale } from '@/contexts/LocaleContext';
import { colors } from '@/lib/colors';
import { LAUNCH_EDITION, poppins, QP_TARGET } from '../constants';
import type { LeaguePhase, Milestone } from '../types';
import { ScheduleTimeline } from './ScheduleTimeline';
import { LeagueCountdown } from './LeagueCountdown';
import { JoinLeagueButton } from './JoinLeagueButton';

/**
 * The league card: identity on the left, qualification status and the primary
 * action on the right, schedule rail across the bottom.
 *
 * The action follows qualification — below the QP target you are sent to ranked
 * to earn more; at the target you claim your entry here.
 */
export function LeagueHeader({
  phase,
  milestones,
  qp = LAUNCH_EDITION ? QP_TARGET : 105,
  hasEntered = false,
  registered,
  onEnter,
  onPlayRanked,
}: {
  phase: LeaguePhase;
  milestones: Record<'entry' | 'qualifier' | 'playoffs', Milestone> | null;
  qp?: number;
  hasEntered?: boolean;
  registered?: number;
  onEnter?: () => void;
  onPlayRanked?: () => void;
}) {
  const { t } = useLocale();

  const clamped = Math.max(0, Math.min(qp, QP_TARGET));
  const pct = Math.round((clamped / QP_TARGET) * 100);
  const remaining = Math.max(0, QP_TARGET - clamped);
  const isQualified = clamped >= QP_TARGET;

  const ctaClass =
    'flex h-11 w-full items-center justify-center gap-2 rounded-[10px] font-poppins text-[13px] font-black uppercase tracking-wide text-black transition-opacity hover:opacity-90';

  return (
    <header
      className="relative overflow-hidden rounded-[24px] border-2 border-brand-gold/25"
      style={{ backgroundColor: colors.blue.brand }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 120% at 88% 0%, rgba(255,215,0,0.14) 0%, transparent 62%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.18) 100%)',
        }}
      />

      <div className="relative flex flex-col items-center gap-5 p-5 text-center lg:p-6">
        {/* Identity */}
        <div className="min-w-0">
          <div className="font-poppins text-[11px] font-black uppercase tracking-[0.28em] text-brand-gold">
            {t('weekendLeague.kicker')}
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-2 font-poppins text-[1.75rem] font-black uppercase leading-none text-white sm:text-4xl"
            style={poppins}
          >
            {t('weekendLeague.title')}
          </motion.h1>
        </div>

        {/* Qualification status + action */}
        <div className="w-full max-w-[320px]">
          <div className="flex items-center justify-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand-yellow text-black">
              <Ticket className="size-4" />
            </div>
            <div
              className={`font-poppins text-[11px] font-black uppercase tracking-[0.16em] ${
                isQualified ? 'text-brand-green-light' : 'text-brand-gold'
              }`}
            >
              {isQualified ? t('weekendLeague.qualified') : t('weekendLeague.notQualified')}
            </div>
          </div>

          <div className="mt-3 text-center font-poppins text-xl font-black text-white" style={poppins}>
            {clamped}
            <span className="text-sm font-bold text-white/60"> / {QP_TARGET.toLocaleString()} QP</span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full rounded-full bg-brand-green-light transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-poppins text-[11px] font-black text-brand-green-light">{pct}%</span>
          </div>

          {!isQualified && (
            <div className="mt-1.5 text-center font-poppins text-[11px] font-bold uppercase tracking-wide text-white/60">
              {t('weekendLeague.qpNeeded', { count: remaining })}
            </div>
          )}

          <div className="mt-4">
            <div className="text-center font-poppins text-[10px] font-black uppercase tracking-[0.16em] text-white/60">
              {t('weekendLeague.startsIn')}
            </div>
            {milestones && (
              <div className="mt-2 flex justify-center">
                <LeagueCountdown targetMs={milestones.qualifier.targetMs} size="sm" accent="text-white" plain />
              </div>
            )}

            <div className="mt-3.5">
              {hasEntered || isQualified ? (
                <JoinLeagueButton joined={hasEntered} onJoin={onEnter} />
              ) : onPlayRanked ? (
                <button type="button" onClick={onPlayRanked} className={ctaClass} style={{ backgroundColor: colors.green.light }}>
                  {t('weekendLeague.playRanked')}
                </button>
              ) : (
                <Link href="/play" className={ctaClass} style={{ backgroundColor: colors.green.light }}>
                  {t('weekendLeague.playRanked')}
                </Link>
              )}
            </div>

            {registered != null && (
              <div className="mt-2.5 flex items-center justify-center gap-1.5 font-poppins text-[11px] font-semibold text-white/60">
                <Users className="size-3.5" />
                {t('weekendLeague.playersEntered', { count: registered.toLocaleString() })}
              </div>
            )}

          </div>
        </div>
      </div>

      <div className="relative px-4 pb-5 lg:px-6">
        <ScheduleTimeline phase={phase} milestones={milestones} />
      </div>
    </header>
  );
}

