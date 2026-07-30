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

function Dot({ status }: { status: StageStatus }) {
  if (status === 'done') {
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-brand-green text-white">
        <Check className="size-4" strokeWidth={3} />
      </span>
    );
  }
  if (status === 'active') {
    return (
      <motion.span
        className="flex size-7 items-center justify-center rounded-full bg-brand-gold"
        animate={{ boxShadow: ['0 0 0 0 rgba(255,215,0,0.5)', '0 0 0 8px rgba(255,215,0,0)'] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      >
        <span className="size-2 rounded-full bg-black" />
      </motion.span>
    );
  }
  return <span className="flex size-7 items-center justify-center rounded-full border-2 border-white/20 bg-surface-card-deep" />;
}

/** Friday → Saturday → Sunday stage rail, highlighting the current stage. */
export function ScheduleTimeline({
  phase,
  milestones,
  onLight = false,
}: {
  phase: LeaguePhase;
  milestones: Record<'entry' | 'qualifier' | 'playoffs', Milestone> | null;
  /** Rendered on a light (brand-yellow) card — flip the text to dark. */
  onLight?: boolean;
}) {
  const { t } = useLocale();
  const statuses = STATUS_BY_PHASE[phase];
  const stages: { title: string; when: string; m: Milestone | null }[] = [
    { title: t('weekendLeague.stageQualifying'), when: t('weekendLeague.qualifyingShort'), m: milestones?.entry ?? null },
    { title: t('weekendLeague.stageSaturday'), when: t('weekendLeague.qualifierShort'), m: milestones?.qualifier ?? null },
    { title: t('weekendLeague.stageFinal'), when: t('weekendLeague.playoffsShort'), m: milestones?.playoffs ?? null },
  ];

  return (
    <div className="flex items-start">
      {stages.map((stage, i) => {
        const status = statuses[i];
        const emphasized = status !== 'upcoming';
        return (
          <div key={stage.title} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 rounded-full ${i === 0 ? 'opacity-0' : statuses[i - 1] === 'done' ? 'bg-brand-green' : 'bg-white/12'}`} />
              <Dot status={status} />
              <span className={`h-0.5 flex-1 rounded-full ${i === stages.length - 1 ? 'opacity-0' : status === 'done' ? 'bg-brand-green' : 'bg-white/12'}`} />
            </div>
            <div className="mt-2 text-center">
              <div
                className={`font-poppins text-[11px] font-black uppercase tracking-wide ${
                  onLight
                    ? emphasized ? 'text-black' : 'text-black/40'
                    : emphasized ? 'text-white' : 'text-white/45'
                }`}
              >
                {stage.title}
              </div>
              <div
                className={`font-poppins text-[10px] font-semibold ${
                  onLight
                    ? emphasized ? 'text-black/70' : 'text-black/30'
                    : emphasized ? 'text-white/70' : 'text-white/30'
                }`}
              >
                {stage.when}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
