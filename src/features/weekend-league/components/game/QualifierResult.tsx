'use client';

import { motion } from 'motion/react';
import { poppins, PLAYOFF_CUTOFF } from '../../constants';
import { buildLeaderboardAtRank } from '../../mock-data';
import type { QuizOutcome } from '../../types';
import { QualifierLeaderboard } from '../QualifierLeaderboard';

/** Post-qualifier results: your score, your final rank, and whether you advanced. */
export function QualifierResult({
  outcome,
  rank,
  onContinue,
}: {
  outcome: QuizOutcome;
  rank: number;
  onContinue: () => void;
}) {
  const qualified = rank <= PLAYOFF_CUTOFF;
  const leaderboard = buildLeaderboardAtRank(rank);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6 font-fun">
      <div className="text-center">
        <div className="font-poppins text-[11px] font-black uppercase tracking-[0.28em] text-brand-cyan">Qualifier complete</div>
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 15 }}
          className="mt-2 font-poppins text-5xl font-black tabular-nums text-brand-yellow"
          style={poppins}
        >
          {outcome.score} pts
        </motion.div>
        <div className="mt-1 font-poppins text-sm font-bold text-white/60">
          {outcome.correct}/{outcome.total} correct
        </div>
      </div>

      {/* Placement + qualification verdict */}
      <div
        className={`rounded-[24px] border-2 p-5 text-center ${
          qualified ? 'border-brand-green/40 bg-brand-green/10' : 'border-brand-red-soft/40 bg-brand-red-soft/10'
        }`}
      >
        <div className="font-poppins text-[11px] font-black uppercase tracking-widest text-white/50">You finished</div>
        <div className="mt-1 font-poppins text-4xl font-black uppercase text-white" style={poppins}>#{rank}</div>
        <div className={`mt-3 font-poppins text-lg font-black uppercase ${qualified ? 'text-brand-green' : 'text-brand-red-soft'}`}>
          {qualified ? '🎉 Through to the playoffs!' : 'Missed the top 24'}
        </div>
        <p className="mx-auto mt-1 max-w-xs font-poppins text-[13px] font-semibold text-white/60">
          {qualified
            ? `You're in the top ${PLAYOFF_CUTOFF}. Come back Sunday 14:00 for the knockout.`
            : `Only the top ${PLAYOFF_CUTOFF} advance. Enter again next week and go one better.`}
        </p>
      </div>

      <QualifierLeaderboard entries={leaderboard} yourRank={rank} limit={8} title="Where you landed" />

      <button
        type="button"
        onClick={onContinue}
        className="h-14 w-full rounded-2xl bg-brand-green font-poppins text-lg font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green/90"
      >
        Continue
      </button>
    </div>
  );
}
