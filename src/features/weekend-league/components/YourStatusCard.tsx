'use client';

import { poppins } from '../constants';
import type { LeaguePhase } from '../types';

type Tone = 'neutral' | 'green' | 'gold' | 'red' | 'cyan';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'border-white/10 bg-surface-card-deep',
  green: 'border-brand-green/40 bg-brand-green/10',
  gold: 'border-brand-gold/40 bg-brand-gold/10',
  red: 'border-brand-red-soft/40 bg-brand-red-soft/10',
  cyan: 'border-brand-cyan/40 bg-brand-cyan/10',
};

const TONE_ACCENT: Record<Tone, string> = {
  neutral: 'text-white',
  green: 'text-brand-green',
  gold: 'text-brand-gold',
  red: 'text-brand-red-soft',
  cyan: 'text-brand-cyan',
};

function resolve(
  phase: LeaguePhase,
  hasEntered: boolean,
  qualified: boolean,
  yourRank: number,
  championName: string | null,
): { emoji: string; headline: string; sub: string; tone: Tone } {
  switch (phase) {
    case 'upcoming':
      return { emoji: '📅', headline: 'Get ready', sub: 'Entry opens Friday — claim your spot to compete for prizes.', tone: 'neutral' };
    case 'entry_open':
      return hasEntered
        ? { emoji: '✅', headline: "You're entered", sub: 'Qualifier starts Saturday 14:00. Be there — it starts for everyone at once.', tone: 'green' }
        : { emoji: '🎟️', headline: "Don't miss out", sub: 'Claim your free entry before Saturday 14:00.', tone: 'gold' };
    case 'qualifier_live':
      return hasEntered
        ? { emoji: '🔴', headline: 'Qualifier is live', sub: 'Play now to set your score and climb the leaderboard.', tone: 'cyan' }
        : { emoji: '⌛', headline: "You didn't enter this week", sub: 'Entry closed at kickoff. Come back next Friday to claim your spot.', tone: 'neutral' };
    case 'qualifier_done':
      return qualified
        ? { emoji: '🎉', headline: `You qualified — #${yourRank}`, sub: 'You made the top 24. Playoffs are Sunday 14:00.', tone: 'gold' }
        : { emoji: '😔', headline: `So close — finished #${yourRank}`, sub: 'Only the top 24 advance. Come back next week and go again.', tone: 'red' };
    case 'playoffs_live':
      return qualified
        ? { emoji: '🥊', headline: "You're in the playoffs", sub: 'Your knockout match is coming up. Win to advance.', tone: 'cyan' }
        : { emoji: '👀', headline: 'Playoffs are live', sub: 'Watch the top 24 battle it out for the title.', tone: 'neutral' };
    case 'completed':
      return qualified
        ? { emoji: '🏆', headline: "You're the champion!", sub: 'You won the Weekend League. Prizes are on the way.', tone: 'gold' }
        : { emoji: '🏁', headline: 'Weekend wrapped', sub: `Champion: ${championName ?? '—'}. You finished #${yourRank}.`, tone: 'neutral' };
  }
}

/** One-line "where do I stand" card, phase- and result-aware. */
export function YourStatusCard({
  phase,
  hasEntered,
  qualified,
  yourRank,
  championName,
}: {
  phase: LeaguePhase;
  hasEntered: boolean;
  qualified: boolean;
  yourRank: number;
  championName: string | null;
}) {
  const { emoji, headline, sub, tone } = resolve(phase, hasEntered, qualified, yourRank, championName);
  return (
    <div className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 ${TONE_CLASS[tone]}`}>
      <span className="text-2xl leading-none">{emoji}</span>
      <div className="min-w-0">
        <div className={`font-poppins text-base font-black uppercase ${TONE_ACCENT[tone]}`} style={poppins}>{headline}</div>
        <div className="mt-0.5 font-poppins text-[12px] font-semibold leading-snug text-white/60">{sub}</div>
      </div>
    </div>
  );
}
