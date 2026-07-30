import type { PrizeAccent } from './types';

// Shared Poppins inline style (matches the rest of the app's numeric/headline text).
export const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

// Weekend League cutoff: the top N of the qualifier advance to Sunday's playoffs.
export const PLAYOFF_CUTOFF = 24;

/**
 * QP needed in the Mon–Fri window to earn a ticket: 25 QP per ranked win, 10 per
 * loss. 200 QP is ~8 wins, ~12 games at the observed win rate, or 20 games on a
 * losing week — which qualified 43% of active players in Season 2 data.
 */
export const QP_TARGET = 200;

/**
 * First edition: entry is open to everyone regardless of rank or QP, so the rail
 * shows a full bar and a free-entry note instead of live progress. Set to false
 * once QP starts accruing on the following Monday.
 */
export const LAUNCH_EDITION = true;

// Gameplay timings (mock quiz).
export const KICKOFF_SECONDS = 10; // pre-match "everyone starts together" countdown
export const QUESTION_SECONDS = 12; // per-question answer window
export const QUIZ_LENGTH = 6; // questions per match
export const POINTS_PER_CORRECT = 100; // + seconds-remaining speed bonus

// Georgian time is UTC+4, no DST.
export const GE_UTC_OFFSET_MIN = 4 * 60;

// Accent → token class strings, so prize tiers / bracket states read consistently.
export const ACCENT_TEXT: Record<PrizeAccent, string> = {
  gold: 'text-brand-gold',
  silver: 'text-brand-slate-light',
  bronze: 'text-brand-orange',
  blue: 'text-brand-cyan',
  green: 'text-brand-green',
};

export const ACCENT_BORDER: Record<PrizeAccent, string> = {
  gold: 'border-brand-gold/40',
  silver: 'border-brand-slate-light/40',
  bronze: 'border-brand-orange/40',
  blue: 'border-brand-cyan/40',
  green: 'border-brand-green/40',
};

export const ACCENT_BG: Record<PrizeAccent, string> = {
  gold: 'bg-brand-gold/10',
  silver: 'bg-brand-slate-light/10',
  bronze: 'bg-brand-orange/10',
  blue: 'bg-brand-cyan/10',
  green: 'bg-brand-green/10',
};

/**
 * Epoch ms of the next occurrence of a given Georgian-time weekday + hour.
 * weekday: 0=Sun … 6=Sat. Computed in UTC so it is independent of the viewer's
 * timezone. Client-only (uses Date.now()); guard SSR at the call site.
 */
export function nextGeorgianOccurrence(weekday: number, hour: number, nowMs: number): number {
  const geNowMs = nowMs + GE_UTC_OFFSET_MIN * 60_000;
  const d = new Date(geNowMs);
  const daysAhead = (weekday - d.getUTCDay() + 7) % 7;
  let geTargetMs = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + daysAhead,
    hour,
    0,
    0,
  );
  if (geTargetMs <= geNowMs) geTargetMs += 7 * 24 * 60 * 60_000;
  return geTargetMs - GE_UTC_OFFSET_MIN * 60_000;
}
