'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, TrendingUp } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { ODDS_QUESTIONS } from '../data/oddsBoard';
import { impliedPct, formatOdds, money } from '../lib/odds';

const STAKES = [25, 50, 100];

export function OddsBoard() {
  const [points, setPoints] = useState(500);
  const [qi, setQi] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [stake, setStake] = useState(50);
  const [revealed, setRevealed] = useState(false);

  const q = ODDS_QUESTIONS[qi % ODDS_QUESTIONS.length];
  const won = revealed && pick === q.answer;
  const payout = pick !== null ? Math.round(stake * q.options[pick].odds) : 0;

  const place = () => {
    if (pick === null || revealed || stake > points) return;
    setPoints((p) => p - stake + (pick === q.answer ? Math.round(stake * q.options[pick].odds) : 0));
    setRevealed(true);
  };

  const next = () => {
    setQi((v) => v + 1);
    setPick(null);
    setRevealed(false);
    setStake(50);
  };

  return (
    <MiniGameShell
      title="Odds Board"
      subtitle="Every answer is a market — back your call"
      accent="#1CB0F6"
      headerRight={<StatPill label="Points" value={points.toLocaleString()} color="#1CB0F6" />}
    >
      <div className="mt-2 rounded-2xl border border-white/[0.08] bg-surface-card/60 p-4">
        <div className="mb-1 font-poppins text-[10px] font-black uppercase tracking-wider text-brand-cyan">Market {qi % ODDS_QUESTIONS.length + 1}</div>
        <p className="font-poppins text-base font-bold leading-snug text-white">{q.q}</p>
      </div>

      {/* Priced answers */}
      <div className="mt-3 space-y-2">
        {q.options.map((o, i) => {
          const isPick = pick === i;
          const isAnswer = i === q.answer;
          const state = !revealed ? (isPick ? 'picked' : 'idle') : isAnswer ? 'correct' : isPick ? 'wrong' : 'dim';
          return (
            <button
              key={i}
              type="button"
              disabled={revealed}
              onClick={() => setPick(i)}
              className={`flex w-full items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left transition-colors ${
                state === 'idle'
                  ? 'border-white/10 bg-white/[0.03] hover:border-brand-cyan/50'
                  : state === 'picked'
                    ? 'border-brand-cyan bg-brand-cyan/10'
                    : state === 'correct'
                      ? 'border-brand-green bg-brand-green/15'
                      : state === 'wrong'
                        ? 'border-brand-red bg-brand-red/15'
                        : 'border-white/5 bg-white/[0.02] opacity-45'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-poppins text-sm font-black text-white">{o.text}</div>
                <div className="font-poppins text-[10px] font-semibold text-white/40">{impliedPct(o.odds)}% implied</div>
              </div>
              {state === 'correct' && <Check className="size-4 shrink-0 text-brand-green" />}
              {state === 'wrong' && <X className="size-4 shrink-0 text-brand-red" />}
              <span
                className={`shrink-0 rounded-lg px-2.5 py-1.5 font-poppins text-base font-black tabular-nums ${
                  o.odds >= 5 ? 'bg-brand-orange/15 text-brand-orange' : o.odds >= 2.5 ? 'bg-brand-cyan/15 text-brand-cyan' : 'bg-white/[0.06] text-white/70'
                }`}
              >
                {formatOdds(o.odds)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stake / result */}
      <div className="mt-4 flex-1">
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div key="stake" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-poppins text-xs font-black uppercase tracking-wide text-white/50">Your stake</span>
                {pick !== null && (
                  <span className="font-poppins text-xs font-bold text-white/50">
                    returns <span className="font-black text-brand-cyan">{money(payout)}</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {STAKES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStake(s)}
                    disabled={s > points}
                    className={`rounded-2xl border-2 py-3 font-poppins text-lg font-black tabular-nums transition-colors disabled:opacity-30 ${
                      stake === s ? 'border-brand-cyan bg-brand-cyan/10 text-brand-cyan' : 'border-white/10 bg-white/[0.03] text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={place}
                disabled={pick === null || stake > points}
                className="h-14 w-full rounded-2xl bg-brand-cyan font-poppins text-lg font-black uppercase tracking-wide text-white transition-opacity disabled:opacity-35"
              >
                {pick === null ? 'Pick an answer to back' : `Place ${money(stake)} on ${q.options[pick].text}`}
              </button>
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2 py-2 text-center">
              <div className="text-4xl">{won ? '💰' : '❌'}</div>
              <div className="font-poppins text-xl font-black uppercase" style={{ color: won ? '#58CC02' : '#FB3101' }}>
                {won ? `Won ${money(payout)}!` : `Lost ${money(stake)}`}
              </div>
              {won && pick !== null && q.options[pick].odds >= 4 && (
                <div className="flex items-center gap-1 font-poppins text-xs font-black uppercase text-brand-orange">
                  <TrendingUp className="size-3.5" /> Big-odds call!
                </div>
              )}
              {!won && (
                <p className="font-poppins text-xs font-semibold text-white/50">
                  Right answer: <span className="font-black text-white">{q.options[q.answer].text}</span> @ {formatOdds(q.options[q.answer].odds)}
                </p>
              )}
              <button type="button" onClick={next} className="mt-2 h-14 w-full rounded-2xl bg-brand-cyan font-poppins text-lg font-black uppercase tracking-wide text-white">
                Next market
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MiniGameShell>
  );
}
