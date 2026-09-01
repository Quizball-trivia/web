'use client';

/**
 * Shared presentational bits for the Guess the Goal screens (demo + live).
 * Pure UI: contains no goal data and no answers, so the live route's bundle
 * stays clean of the demo's client-side answer set.
 */

import type { CSSProperties } from 'react';
import type { TacticsStepKind } from '../lib/tacticsEngine';
import { useMiniLocale } from '../lib/i18n';

export type GgtOptionState = 'idle' | 'locked' | 'correct' | 'wrong' | 'dim';

/** Ranked-match answer card look (PossessionQuestionPanel). */
export function ggtOptionStyle(state: GgtOptionState): CSSProperties {
  return {
    backgroundColor:
      state === 'correct' ? '#38B60E' : state === 'locked' ? 'rgba(255,229,0,0.14)' : 'transparent',
    border:
      state === 'correct'
        ? '2px solid transparent'
        : state === 'wrong'
          ? '2px solid #FB3101'
          : '2px solid #FFE500',
    color: state === 'wrong' ? '#FB3101' : '#FFFFFF',
    boxShadow:
      state === 'correct'
        ? '0 1.76px 6.334px 1.32px rgba(56,182,14,0.25)'
        : state === 'wrong'
          ? '0 1.76px 6.334px 1.32px rgba(251,49,1,0.25)'
          : state === 'locked'
            ? '0 0 10px 2px rgba(255,229,0,0.45)'
            : '0 0 6.334px 1.32px rgba(255,229,0,0.25)',
    opacity: state === 'dim' ? 0.4 : 1,
  };
}

export const GGT_OPTION_CLASS =
  'flex min-h-[52px] items-center justify-center rounded-[16px] px-4 py-2.5 text-center font-poppins text-[13px] font-bold uppercase leading-[1.15] transition-shadow duration-150 sm:min-h-[56px] sm:text-sm';

/** Bilingual inline (NOT the mini-games dict — 'Run'/'Pass' collide with other
 *  games' entries there). */
export const GGT_ACTION_META: Record<
  TacticsStepKind,
  { label: { en: string; ka: string }; color: string }
> = {
  carry: { label: { en: 'Dribble', ka: 'დრიბლინგი' }, color: '#1c2b21' },
  run: { label: { en: 'Run', ka: 'შერბენა' }, color: '#1c2b21' },
  pass: { label: { en: 'Pass', ka: 'პასი' }, color: '#ffffff' },
  shot: { label: { en: 'Shot!', ka: 'დარტყმა!' }, color: '#FFE500' },
};

export function GgtActionGlyph({ kind, color }: { kind: TacticsStepKind; color: string }) {
  if (kind === 'pass') {
    return (
      <svg width="26" height="8" viewBox="0 0 26 8">
        <path d="M1 4h19" stroke={color} strokeWidth="1.2" />
        <circle cx="22.5" cy="4" r="2.6" fill="none" stroke={color} strokeWidth="1.2" />
      </svg>
    );
  }
  if (kind === 'run') {
    return (
      <svg width="26" height="8" viewBox="0 0 26 8">
        <path d="M1 4h20" stroke={color} strokeWidth="1.6" strokeDasharray="3 3" />
        <path d="M18 1l6 3-6 3z" fill={color} />
      </svg>
    );
  }
  return (
    <svg width="26" height="8" viewBox="0 0 26 8">
      <path d="M1 4h20" stroke={color} strokeWidth="2.4" />
      <path d="M18 1l6 3-6 3z" fill={color} />
    </svg>
  );
}

export function GgtLegend() {
  const locale = useMiniLocale();
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 font-poppins text-[9px] font-bold uppercase tracking-wider">
      {(['carry', 'run', 'pass', 'shot'] as const).map((kind) => (
        <span
          key={kind}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ backgroundColor: '#38B60E', color: '#0b2405' }}
        >
          <GgtActionGlyph kind={kind} color={GGT_ACTION_META[kind].color} />
          {GGT_ACTION_META[kind].label[locale].replace('!', '')}
        </span>
      ))}
    </div>
  );
}
