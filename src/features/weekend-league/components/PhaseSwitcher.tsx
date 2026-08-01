'use client';

import { FlaskConical } from 'lucide-react';
import type { LeaguePhase } from '../types';

const PHASES: { key: LeaguePhase; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'entry_open', label: 'Entry open' },
  { key: 'qualifier_live', label: 'Qualifier live' },
  { key: 'qualifier_done', label: 'Qualifier done' },
  { key: 'playoffs_live', label: 'Playoffs live' },
  { key: 'completed', label: 'Completed' },
];

/**
 * Demo-only control to walk through every phase / scenario of the week. Not part
 * of the shipping product — it's how you preview the whole flow with mock data.
 */
export function PhaseSwitcher({
  phase,
  hasEntered,
  qualified,
  onPhase,
  onEntered,
  onQualified,
}: {
  phase: LeaguePhase;
  hasEntered: boolean;
  qualified: boolean;
  onPhase: (p: LeaguePhase) => void;
  onEntered: (v: boolean) => void;
  onQualified: (v: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-brand-purple/40 bg-brand-purple/[0.06] p-3">
      <div className="mb-2 flex items-center gap-1.5 font-poppins text-[10px] font-black uppercase tracking-widest text-brand-purple">
        <FlaskConical className="size-3.5" />
        Preview control · demo only
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PHASES.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onPhase(p.key)}
            className={`rounded-full px-3 py-1.5 font-poppins text-[11px] font-black uppercase tracking-wide transition-colors ${
              phase === p.key ? 'bg-brand-purple text-white' : 'bg-white/8 text-white/60 hover:bg-white/15'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Toggle label="Entered" value={hasEntered} onChange={onEntered} />
        <Toggle label="Qualified (top 24)" value={qualified} onChange={onQualified} />
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-poppins text-[11px] font-black uppercase tracking-wide transition-colors ${
        value ? 'bg-brand-green text-white' : 'bg-white/8 text-white/50 hover:bg-white/15'
      }`}
    >
      <span className={`size-2 rounded-full ${value ? 'bg-white' : 'bg-white/30'}`} />
      {label}
    </button>
  );
}
