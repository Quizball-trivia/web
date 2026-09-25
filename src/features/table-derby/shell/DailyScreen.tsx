'use client';

import { LogicGlyph, OrderGlyph, RoadGlyph } from '../components/brand';
import type { TdDailyType } from '../components/DailyGames';
import { TD } from '../lib/copy';
import { SectionTitle } from './ui';

export type DailyKey = TdDailyType;

const DAILY: { key: DailyKey; name: string }[] = [
  { key: 'footballLogic', name: TD.dailyFl },
  { key: 'putInOrder', name: TD.dailyPio },
  { key: 'careerPath', name: TD.dailyCp },
];

function DailyIcon({ k }: { k: DailyKey }) {
  if (k === 'footballLogic') return <LogicGlyph size={40} />;
  return k === 'putInOrder' ? <OrderGlyph size={40} /> : <RoadGlyph size={40} />;
}

export function DailyCards({ onOpen, done }: { onOpen: (k: DailyKey) => void; done: Partial<Record<DailyKey, string>> }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 md:gap-4">
      {DAILY.map((c) => {
        const result = done[c.key];
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onOpen(c.key)}
            className="flex flex-col items-center gap-2 rounded-[12px] px-2 py-3.5 text-center md:py-5"
            style={{
              background: 'var(--bs-surface)',
              boxShadow: result ? 'inset 0 0 0 1.5px var(--bs-new)' : undefined,
            }}
          >
            <DailyIcon k={c.key} />
            <span className="bs-text text-[11px] font-bold leading-tight text-[var(--bs-text)] md:text-[13px]">{c.name}</span>
            <span className="bs-text text-[10px]" style={{ color: result ? 'var(--bs-new)' : 'var(--bs-text-3)' }}>
              {result ? `✓ ${result}` : TD.dailyOpen}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function DailyScreen({ onOpen, done }: { onOpen: (k: DailyKey) => void; done: Partial<Record<DailyKey, string>> }) {
  return (
    <>
      <SectionTitle>{TD.tabDaily}</SectionTitle>
      <p className="bs-text -mt-2 text-[12px] text-[var(--bs-text-3)]">{TD.dailySub}</p>
      <DailyCards onOpen={onOpen} done={done} />
    </>
  );
}
