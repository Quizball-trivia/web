'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Ticket, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useLocale } from '@/contexts/LocaleContext';
import { colors } from '@/lib/colors';
import { LAUNCH_EDITION, poppins, QP_TARGET } from '../constants';
import type { LeaguePhase, Milestone } from '../types';
import { ScheduleTimeline } from './ScheduleTimeline';
import { LeagueCountdown } from './LeagueCountdown';
import { JoinLeagueButton } from './JoinLeagueButton';
import { DropInBadge } from '@/features/auction/components/shared/DropInBadge';

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
  qpTarget = QP_TARGET,
  qpQualified,
  canEnter = true,
  hasEntered = false,
  registered,
  result,
  onEnter,
  onPlayRanked,
}: {
  phase: LeaguePhase;
  milestones: Record<'entry' | 'qualifier' | 'playoffs', Milestone> | null;
  qp?: number;
  /** Tournament-configured QP requirement (defaults to the prototype constant). */
  qpTarget?: number;
  /** Server's word on entry eligibility; overrides the local qp>=target guess. */
  qpQualified?: boolean;
  /** Entry window is open right now — off, the claim CTA renders locked. */
  canEnter?: boolean;
  hasEntered?: boolean;
  registered?: number;
  /** Set once the Saturday qualifier is done — switches the card to the result
      state. `rank` ≤ 0 means the rank isn't known (live mode without standings). */
  result?: { qualified: boolean; rank: number; cutoff: number } | null;
  onEnter?: () => void;
  onPlayRanked?: () => void;
}) {
  const { t } = useLocale();

  // ── The join moment ──
  // Entering SPENDS the QP balance on the ticket: the bar drains to zero and
  // the number rolls down with it, the section collapses away (the joined
  // card doesn't show QP at all), and the card flips blue → gold. A card
  // that MOUNTS already-entered (reload) skips the ceremony.
  // Render-time adjustment (no effect setState): detect the not-entered →
  // entered flip during render, start the ceremony, and let a timer settle it.
  const [vanishing, setVanishing] = useState(false);
  const [drained, setDrained] = useState(hasEntered);
  const [seenEntered, setSeenEntered] = useState(hasEntered);
  if (hasEntered !== seenEntered) {
    setSeenEntered(hasEntered);
    if (hasEntered) setVanishing(true);
    else { setVanishing(false); setDrained(false); }
  }
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!vanishing) return;
    settleTimerRef.current = setTimeout(() => { setVanishing(false); setDrained(true); }, 1_150);
    return () => { if (settleTimerRef.current) clearTimeout(settleTimerRef.current); };
  }, [vanishing]);
  const gold = hasEntered;
  const showQp = !drained && !(hasEntered && !vanishing);

  const clamped = Math.max(0, Math.min(qp, qpTarget));
  const pct = qpTarget <= 0 ? 100 : Math.round((clamped / qpTarget) * 100);
  const remaining = Math.max(0, qpTarget - clamped);
  const isQualified = qpQualified ?? clamped >= qpTarget;

  const ctaClass =
    'flex h-11 w-full items-center justify-center gap-2 rounded-[10px] font-poppins text-[13px] font-black uppercase tracking-wide text-black transition-opacity hover:opacity-90';

  // Once the qualifier is decided the card reports the outcome instead of QP
  // progress: brand-yellow when you're through, dark when you missed out.
  if (result) {
    const dark = !result.qualified;
    return (
      <header
        className="relative overflow-visible rounded-[24px] border-2"
        style={{
          backgroundColor: dark ? 'transparent' : colors.blue.brand,
          borderColor: dark ? 'rgba(255,255,255,0.12)' : 'transparent',
        }}
      >
        {/* Corner badge — drops in and lands tilted, like the auction deal badge. */}
        <div className="pointer-events-none absolute -top-3 left-5 z-30">
          <DropInBadge
            from={-160}
            landingRotate={-5}
            style={{ backgroundColor: '#FF6C0A' }}
            className="whitespace-nowrap rounded-lg px-3 py-1.5 font-poppins text-sm font-black uppercase tracking-wide text-white shadow-[0_4px_14px_rgba(0,0,0,0.5)]"
          >
            {t(result.qualified ? 'weekendLeague.qBadge' : 'weekendLeague.missedBadge')}
          </DropInBadge>
        </div>

        <div className="px-5 pb-5 pt-7 text-center">
          <div className="font-poppins text-[11px] font-black uppercase tracking-[0.28em] text-brand-gold">
            {t('weekendLeague.kicker')}
          </div>
          <h1
            className="mt-1.5 font-poppins text-[1.6rem] font-black uppercase leading-none text-white sm:text-3xl"
            style={poppins}
          >
            {t('weekendLeague.title')}
          </h1>

          <div
            className="mt-4 font-poppins text-2xl font-black uppercase text-white sm:text-3xl"
            style={poppins}
          >
            {result.rank > 0
              ? t(result.qualified ? 'weekendLeague.qHeadline' : 'weekendLeague.missedHeadline', {
                  rank: result.rank,
                })
              : t(result.qualified ? 'weekendLeague.qHeadlineNoRank' : 'weekendLeague.missedHeadlineNoRank')}
          </div>
          <p className="mx-auto mt-2 max-w-sm font-poppins text-[14px] font-semibold leading-snug text-white/75">
            {t(result.qualified ? 'weekendLeague.qBody' : 'weekendLeague.missedBody', {
              cutoff: result.cutoff,
            })}
          </p>

          {/* Countdown to Sunday — only meaningful if you're still in it. */}
          {result.qualified && milestones && (
            <div className="mt-4">
              <div className="font-poppins text-[12px] font-black uppercase tracking-[0.16em] text-white/70">
                {t('weekendLeague.startsIn')}
              </div>
              <div className="mt-1.5 flex justify-center">
                <LeagueCountdown
                  targetMs={milestones.playoffs.targetMs}
                  size="sm"
                  accent="text-white"
                  labelClass="text-white/70"
                  plain
                />
              </div>
            </div>
          )}
        </div>

        <div className="relative px-4 pb-5 pt-2 lg:px-6">
          <ScheduleTimeline phase={phase} milestones={milestones} />
        </div>
      </header>
    );
  }

  return (
    <motion.header
      className="relative overflow-hidden rounded-[24px] border-2 border-brand-gold/25"
      initial={false}
      animate={{ backgroundColor: gold ? colors.gold.warm : colors.blue.brand }}
      transition={{ duration: 0.8, ease: 'easeInOut', delay: gold && vanishing ? 0.45 : 0 }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: gold
            ? 'radial-gradient(70% 120% at 50% 0%, rgba(255,255,255,0.28) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0.10) 100%)'
            : 'radial-gradient(70% 120% at 88% 0%, rgba(255,215,0,0.14) 0%, transparent 62%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.18) 100%)',
        }}
      />
      {/* One-time celebratory flash as the card turns gold. */}
      <AnimatePresence>
        {gold && vanishing && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0] }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5, duration: 0.9, times: [0, 0.35, 1] }}
            style={{ background: 'radial-gradient(60% 60% at 50% 40%, rgba(255,255,255,0.9) 0%, transparent 70%)' }}
          />
        )}
      </AnimatePresence>

      <div className="relative flex flex-col items-center gap-5 p-5 text-center lg:p-6">
        {/* Identity */}
        <div className="min-w-0">
          <div className={`font-poppins text-[11px] font-black uppercase tracking-[0.28em] transition-colors duration-700 ${gold ? 'text-black/55' : 'text-brand-gold'}`}>
            {t('weekendLeague.kicker')}
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`mt-2 font-poppins text-[1.75rem] font-black uppercase leading-none transition-colors duration-700 sm:text-4xl ${gold ? 'text-black/90' : 'text-white'}`}
            style={poppins}
          >
            {t('weekendLeague.title')}
          </motion.h1>
        </div>

        {/* Qualification status + action */}
        <div className="w-full max-w-[320px]">
          <div className="flex items-center justify-center gap-2">
            <motion.div
              className={`flex size-8 items-center justify-center rounded-lg ${gold ? 'bg-black/85 text-brand-gold' : 'bg-brand-yellow text-black'}`}
              animate={gold && vanishing ? { rotate: [0, -12, 8, 0], scale: [1, 1.25, 1] } : {}}
              transition={{ delay: 0.55, duration: 0.6 }}
            >
              <Ticket className="size-4" />
            </motion.div>
            <div
              className={`font-poppins text-[11px] font-black uppercase tracking-[0.16em] transition-colors duration-700 ${
                gold ? 'text-black/80' : isQualified ? 'text-brand-green-light' : 'text-brand-gold'
              }`}
            >
              {gold ? t('weekendLeague.joinedCta') : isQualified ? t('weekendLeague.qualified') : t('weekendLeague.notQualified')}
            </div>
          </div>

          {/* The QP balance is SPENT on entry: drain to zero, then collapse. */}
          <AnimatePresence initial={false}>
            {showQp && (
              <motion.div
                key="qp"
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.35, ease: 'easeIn' }}
                className="overflow-hidden"
              >
                <div className="mt-3 text-center font-poppins text-xl font-black text-white" style={poppins}>
                  <QpDrainNumber value={clamped} draining={vanishing} />
                  <span className="text-sm font-bold text-white/60"> / {qpTarget.toLocaleString()} QP</span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/30">
                    <motion.div
                      className="h-full rounded-full"
                      initial={false}
                      animate={{
                        width: vanishing ? '0%' : `${pct}%`,
                        backgroundColor: vanishing ? colors.gold.base : '#85E000',
                      }}
                      transition={{ duration: vanishing ? 0.8 : 0.5, ease: 'easeInOut' }}
                    />
                  </div>
                  <span className={`font-poppins text-[11px] font-black ${vanishing ? 'text-brand-gold' : 'text-brand-green-light'}`}>
                    {vanishing ? '' : `${pct}%`}
                  </span>
                </div>

                {!isQualified && (
                  <div className="mt-1.5 text-center font-poppins text-[11px] font-bold uppercase tracking-wide text-white/60">
                    {t('weekendLeague.qpNeeded', { count: remaining })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4">
            <div className={`text-center font-poppins text-[10px] font-black uppercase tracking-[0.16em] transition-colors duration-700 ${gold ? 'text-black/55' : 'text-white/60'}`}>
              {t('weekendLeague.startsIn')}
            </div>
            {milestones && (
              <div className="mt-2 flex justify-center">
                <LeagueCountdown
                  targetMs={milestones.qualifier.targetMs}
                  size="sm"
                  accent={gold ? 'text-black/90' : 'text-white'}
                  labelClass={gold ? 'text-black/55' : 'text-white/70'}
                  plain
                />
              </div>
            )}

            <div className="mt-3.5">
              {hasEntered ? (
                <JoinLeagueButton joined onJoin={onEnter} onGold={gold} />
              ) : isQualified && !canEnter ? (
                <button
                  type="button"
                  disabled
                  className="flex h-11 w-full cursor-not-allowed items-center justify-center rounded-[10px] bg-white/10 font-poppins text-[13px] font-black uppercase tracking-wide text-white/40"
                >
                  {t('weekendLeague.entryClosedTitle')}
                </button>
              ) : isQualified ? (
                <JoinLeagueButton joined={false} onJoin={onEnter} />
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
              <div className={`mt-2.5 flex items-center justify-center gap-1.5 font-poppins text-[11px] font-semibold transition-colors duration-700 ${gold ? 'text-black/60' : 'text-white/60'}`}>
                <Users className="size-3.5" />
                {t('weekendLeague.playersEntered', { count: registered.toLocaleString() })}
              </div>
            )}

          </div>
        </div>
      </div>

      <div className="relative px-4 pb-5 lg:px-6">
        <ScheduleTimeline phase={phase} milestones={milestones} onGold={gold} />
      </div>
    </motion.header>
  );
}

/** Rolls the balance down to zero while the ticket is being punched. */
function QpDrainNumber({ value, draining }: { value: number; draining: boolean }) {
  const [shown, setShown] = useState(value);
  const [tracked, setTracked] = useState(value);
  // Render-time adjustment: follow the live balance whenever no drain is
  // playing (no effect round-trip).
  if (!draining && tracked !== value) {
    setTracked(value);
    setShown(value);
  }
  useEffect(() => {
    if (!draining) return;
    const start = performance.now();
    const durationMs = 800;
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setShown(Math.round(value * (1 - progress)));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [draining, value]);
  return <>{shown}</>;
}

