'use client';

/** The "ივარჯიშე" tab (REQ.1.8): always reachable, free, opens the streak. */

import { useState } from 'react';
import { Flame, Timer } from 'lucide-react';
import { TD } from '../lib/copy';
import { getStreakRecord } from '../lib/state';
import { BsButton, SectionTitle } from '../shell/ui';
import { STREAK_QUESTION_MS } from './StreakRun';

export function PracticeScreen({ onStart }: { onStart: () => void }) {
  const [record] = useState(() => (typeof window === 'undefined' ? { best: 0, last: null, lastAt: null } : getStreakRecord()));
  return (
    <>
      <SectionTitle>{TD.menuSolo}</SectionTitle>
      <div className="flex flex-col gap-4 rounded-[12px] p-5" style={{ background: 'var(--bs-surface)', border: '1px solid var(--bs-frame)' }}>
        <div className="flex items-center gap-2">
          <Flame size={22} color="var(--bs-primary)" strokeWidth={2.4} />
          <span className="bs-headline">{TD.streakTitle}</span>
        </div>
        <p className="bs-text text-[14px] leading-[20px] text-[var(--bs-text-2)]">{TD.streakRules}</p>
        <span className="bs-body-medium inline-flex w-fit items-center gap-1.5 rounded-[12px] px-2.5 py-1 text-white" style={{ background: 'var(--bs-frame)' }}>
          <Timer size={14} />
          {TD.streakRulesTime(STREAK_QUESTION_MS / 1000)}
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: TD.streakBest, value: record.best },
            { label: TD.streakLast, value: record.last ?? '—' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-1 rounded-[12px] px-3.5 py-3" style={{ background: 'var(--bs-page)' }}>
              <span className="font-[Poppins] text-[22px] font-bold leading-none text-white">{s.value}</span>
              <span className="bs-text text-[11.5px] text-[var(--bs-text-2)]">{s.label}</span>
            </div>
          ))}
        </div>
        <BsButton onClick={onStart} className="rounded-[12px]">
          {TD.streakStart}
        </BsButton>
      </div>
    </>
  );
}
