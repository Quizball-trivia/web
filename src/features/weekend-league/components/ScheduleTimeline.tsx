'use client';

import { Check } from 'lucide-react';
import { motion } from 'motion/react';
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
        className="flex size-7 items-center justify-center rounded-full bg-brand-cyan"
        animate={{ boxShadow: ['0 0 0 0 rgba(28,176,246,0.5)', '0 0 0 8px rgba(28,176,246,0)'] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      >
        <span className="size-2 rounded-full bg-white" />
      </motion.span>
    );
  }
  return <span className="flex size-7 items-center justify-center rounded-full border-2 border-white/20 bg-surface-card-deep" />;
}

/** Friday → Saturday → Sunday stage rail, highlighting the current stage. */
export function ScheduleTimeline({
  phase,
  milestones,
}: {
  phase: LeaguePhase;
  milestones: Record<'entry' | 'qualifier' | 'playoffs', Milestone> | null;
}) {
  const statuses = STATUS_BY_PHASE[phase];
  const stages: { title: string; m: Milestone | null }[] = [
    { title: 'Entry', m: milestones?.entry ?? null },
    { title: 'Qualifier', m: milestones?.qualifier ?? null },
    { title: 'Playoffs', m: milestones?.playoffs ?? null },
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
              <div className={`font-poppins text-[11px] font-black uppercase tracking-wide ${emphasized ? 'text-white' : 'text-white/45'}`}>
                {stage.title}
              </div>
              <div className={`font-poppins text-[10px] font-semibold ${emphasized ? 'text-white/70' : 'text-white/30'}`}>
                {stage.m ? `${stage.m.dayLabel.slice(0, 3)} ${stage.m.timeLabel}` : '—'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
