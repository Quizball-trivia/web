'use client';

import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useLocale } from '@/contexts/LocaleContext';
import type { LeaguePhase, Milestone } from '../types';

type StageStatus = 'done' | 'active' | 'upcoming';

const STATUS_BY_PHASE: Record<LeaguePhase, [StageStatus, StageStatus, StageStatus]> = {
  upcoming: ['upcoming', 'upcoming', 'upcoming'],
  entry_open: ['active', 'upcoming', 'upcoming'],
  qualifier_live: ['done', 'active', 'upcoming'],
  qualifier_done: ['done', 'done', 'upcoming'],
  playoffs_live: ['done', 'done', 'active'],
  completed: ['done', 'done', 'done'],
};

function Dot({ status, onGold }: { status: StageStatus; onGold: boolean }) {
  if (status === 'done') {
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-brand-green text-white">
        <Check className="size-4" strokeWidth={3} />
      </span>
    );
  }
  if (status === 'active') {
    // Gold on gold disappears — the active stage flips to brand blue there.
    return (
      <motion.span
        className={`flex size-7 items-center justify-center rounded-full ${onGold ? 'bg-brand-blue' : 'bg-brand-gold'}`}
        animate={{
          boxShadow: onGold
            ? ['0 0 0 0 rgba(45,66,255,0.45)', '0 0 0 8px rgba(45,66,255,0)']
            : ['0 0 0 0 rgba(255,215,0,0.5)', '0 0 0 8px rgba(255,215,0,0)'],
        }}
        transition={{ duration: 1.4, repeat: Infinity }}
      >
        <span className={`size-2 rounded-full ${onGold ? 'bg-white' : 'bg-black'}`} />
      </motion.span>
    );
  }
  return <span className="flex size-7 items-center justify-center rounded-full border-2 border-white/20 bg-surface-card-deep" />;
}

/** Friday → Saturday → Sunday stage rail, highlighting the current stage. */
export function ScheduleTimeline({
  phase,
  milestones,
  onGold = false,
}: {
  phase: LeaguePhase;
  milestones: Record<'entry' | 'qualifier' | 'playoffs', Milestone> | null;
  /** Rendered on the gold (entered) card — dark text/connector variants. */
  onGold?: boolean;
}) {
  const { t, locale } = useLocale();

  const statuses = STATUS_BY_PHASE[phase];
  // Real dates, not the static schedule strings: the hardcoded
  // "qualifyingShort" said "Mon 12:00" while entry actually closes Friday
  // 24:00 (owner reports 2026-08-28) — milestones carry the tournament's own
  // timestamps, so format those and keep the strings only as a null fallback.
  const when = (m: Milestone | null, fallback: string) =>
    m ? formatStageWhen(m.targetMs, m.timeLabel, locale) : fallback;
  const stages: { title: string; when: string; m: Milestone | null }[] = [
    { title: t('weekendLeague.stageQualifying'), when: when(milestones?.entry ?? null, t('weekendLeague.qualifyingShort')), m: milestones?.entry ?? null },
    { title: t('weekendLeague.stageSaturday'), when: when(milestones?.qualifier ?? null, t('weekendLeague.qualifierShort')), m: milestones?.qualifier ?? null },
    { title: t('weekendLeague.stageFinal'), when: when(milestones?.playoffs ?? null, t('weekendLeague.playoffsShort')), m: milestones?.playoffs ?? null },
  ];

  return (
    <div className="flex items-start">
      {stages.map((stage, i) => {
        const status = statuses[i];
        const emphasized = status !== 'upcoming';
        return (
          <div key={stage.title} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 rounded-full ${i === 0 ? 'opacity-0' : statuses[i - 1] === 'done' ? 'bg-brand-green' : onGold ? 'bg-black/15' : 'bg-white/12'}`} />
              <Dot status={status} onGold={onGold} />
              <span className={`h-0.5 flex-1 rounded-full ${i === stages.length - 1 ? 'opacity-0' : status === 'done' ? 'bg-brand-green' : onGold ? 'bg-black/15' : 'bg-white/12'}`} />
            </div>
            <div className="mt-2 text-center">
              <div className={`font-poppins text-[11px] font-black uppercase tracking-wide ${emphasized ? (onGold ? 'text-black/85' : 'text-white') : onGold ? 'text-black/40' : 'text-white/45'}`}>
                {stage.title}
              </div>
              <div className={`font-poppins text-[10px] font-semibold ${emphasized ? (onGold ? 'text-black/60' : 'text-white/70') : onGold ? 'text-black/30' : 'text-white/30'}`}>
                {stage.when}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * "პარ. 24:00" / "Fri 12:00" for a milestone. A midnight deadline is
 * "Friday 24:00" to a player, not "Saturday 00:00", so an exact-midnight
 * timestamp borrows the previous day's weekday. Exported for tests.
 */
// Explicit weekday names instead of Intl: a runtime without Georgian ICU data
// (server rendering, slim Node builds) silently falls back to English, which
// put "Fri. 24:00" on the Georgian page (owner report 2026-08-29). Georgia is
// fixed UTC+4, so the weekday is plain arithmetic.
const GE_OFFSET_MS = 4 * 60 * 60 * 1000;
const WEEKDAYS: Record<string, readonly string[]> = {
  ka: ['კვ.', 'ორშ.', 'სამ.', 'ოთხ.', 'ხუთ.', 'პარ.', 'შაბ.'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export function formatStageWhen(targetMs: number, timeLabel: string, locale: string): string {
  const midnight = timeLabel === '00:00';
  const dayIndex = new Date((midnight ? targetMs - 1 : targetMs) + GE_OFFSET_MS).getUTCDay();
  const day = (WEEKDAYS[locale] ?? WEEKDAYS.en)[dayIndex];
  return `${day} ${midnight ? '24:00' : timeLabel}`;
}
