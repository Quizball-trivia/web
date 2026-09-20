'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, Lock } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { getHiLoMatchups, stepOdds, type HiLoMatchup } from '../data/hiLoRide';
import { formatOdds, money } from '../lib/odds';
import { useMiniLocale, useMiniT } from '../lib/i18n';

const STAKES = [50, 100, 250];

type Phase = 'idle' | 'playing' | 'reveal' | 'decision' | 'cashed' | 'busted';

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function HiLoRide({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const miniLocale = useMiniLocale();
  const [points, setPoints] = useState(1000);
  const [stake, setStake] = useState(100);
  const [phase, setPhase] = useState<Phase>('idle');
  const [deck, setDeck] = useState<HiLoMatchup[]>([]);
  const [step, setStep] = useState(0);
  const [mult, setMult] = useState(1);
  const [picked, setPicked] = useState<'left' | 'right' | null>(null);
  const [payout, setPayout] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  const matchup = deck[step];
  const odds = matchup ? stepOdds(matchup.crowdPct) : 1;
  const pot = Math.round(stake * mult);

  const start = () => {
    setPoints((p) => p - stake);
    setDeck(shuffled(getHiLoMatchups(miniLocale)));
    setStep(0);
    setMult(1);
    setPicked(null);
    setPayout(0);
    setPhase('playing');
  };

  const pick = (side: 'left' | 'right') => {
    if (phase !== 'playing' || !matchup) return;
    setPicked(side);
    setPhase('reveal');
    const chosen = side === 'left' ? matchup.left : matchup.right;
    const other = side === 'left' ? matchup.right : matchup.left;
    const correct = chosen.value > other.value;
    later(() => {
      if (correct) {
        setMult((m) => m * odds);
        setPhase('decision');
      } else {
        setPhase('busted');
      }
    }, 1600);
  };

  const ride = () => {
    setPicked(null);
    setStep((s) => (s + 1) % deck.length);
    setPhase('playing');
  };

  const cashOut = () => {
    setPayout(pot);
    setPoints((p) => p + pot);
    setPhase('cashed');
  };

  return (
    <MiniGameShell
      backHref={backHref}
      title={t('Hi-Lo Ride')}
      subtitle={t('Call the higher stat — odds priced by how many get it right')}
      accent="#58CC02"
      headerRight={<StatPill label={t('Points')} value={points.toLocaleString()} color="#58CC02" />}
    >
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="text-5xl">📈</div>
            <p className="max-w-xs text-center font-poppins text-sm font-semibold leading-snug text-white/60">
              {t('Chain higher-or-lower calls. Every correct call multiplies your stake — hard matchups pay more. Cash out before you miss.')}
            </p>
            <div className="flex gap-2">
              {STAKES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStake(s)}
                  className={`rounded-xl border-2 px-5 py-2.5 font-poppins text-sm font-black tabular-nums transition-colors ${
                    stake === s ? 'border-brand-green-light bg-brand-green-light/15 text-brand-green-light' : 'border-white/10 bg-white/[0.03] text-white/60'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button type="button" onClick={start} className="h-14 w-full max-w-xs rounded-2xl bg-brand-green-light font-poppins text-lg font-black uppercase tracking-wide text-black">
              {t('Stake {stake} & ride', { stake: money(stake) })}
            </button>
          </motion.div>
        )}

        {(phase === 'playing' || phase === 'reveal' || phase === 'decision' || phase === 'busted') && matchup && (
          <motion.div key={`m-${step}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 flex flex-1 flex-col">
            {/* Pot strip */}
            <div className="mb-3 flex items-center justify-between rounded-2xl border-2 border-brand-green-light/30 bg-gradient-to-b from-brand-green-light/[0.08] to-transparent px-4 py-2.5">
              <div>
                <div className="font-poppins text-[10px] font-black uppercase tracking-wider text-white/45">{t('Pot')}</div>
                <div className={`font-poppins text-xl font-black tabular-nums ${phase === 'busted' ? 'text-brand-red line-through' : 'text-brand-green-light'}`}>{money(pot)}</div>
              </div>
              <div className="text-right">
                <div className="font-poppins text-[10px] font-black uppercase tracking-wider text-white/45">{t('Step {n} · odds', { n: step + 1 })}</div>
                <div className="font-poppins text-xl font-black tabular-nums text-brand-yellow">{formatOdds(odds)}x</div>
              </div>
            </div>

            {/* Crowd difficulty */}
            <div className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-white/[0.04] px-3 py-1.5">
              <span className="font-poppins text-[10px] font-bold text-white/50">{t('{pct}% of players call this one right', { pct: matchup.crowdPct })}</span>
            </div>

            <div className="mb-2 text-center font-poppins text-[11px] font-black uppercase tracking-wider text-white/50">{matchup.stat}</div>
            <div className="mb-1 text-center font-poppins text-sm font-bold text-white">{t('Which is higher?')}</div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              {(['left', 'right'] as const).map((side) => {
                const entry = side === 'left' ? matchup.left : matchup.right;
                const other = side === 'left' ? matchup.right : matchup.left;
                const revealed = phase !== 'playing';
                const isHigher = entry.value > other.value;
                const isPicked = picked === side;
                return (
                  <button
                    key={side}
                    type="button"
                    disabled={phase !== 'playing'}
                    onClick={() => pick(side)}
                    className={`flex min-h-[120px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-center transition-colors ${
                      revealed
                        ? isHigher
                          ? 'border-brand-green bg-brand-green/15'
                          : isPicked
                            ? 'border-brand-red bg-brand-red/15'
                            : 'border-white/10 bg-white/[0.02] opacity-60'
                        : 'border-white/10 bg-white/[0.03] hover:border-brand-green-light/50'
                    }`}
                  >
                    <span className="font-poppins text-sm font-black leading-tight text-white">{entry.name}</span>
                    {revealed ? (
                      <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`font-poppins text-2xl font-black tabular-nums ${isHigher ? 'text-brand-green-light' : 'text-white/50'}`}>
                        {entry.value.toLocaleString()}
                      </motion.span>
                    ) : (
                      <span className="font-poppins text-2xl font-black text-white/25">?</span>
                    )}
                    {!revealed && (
                      <span className="flex items-center gap-1 font-poppins text-[10px] font-black uppercase text-white/40">
                        {side === 'left' ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {t('Higher')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex-1">
              <AnimatePresence mode="wait">
                {phase === 'decision' && (
                  <motion.div key="decision" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
                    <div className="text-center font-poppins text-xs font-bold text-white/55">
                      {t('Pot is {pot}. Next matchup pays {odds}x → {next}.', { pot: money(pot), odds: formatOdds(deck[(step + 1) % deck.length] ? stepOdds(deck[(step + 1) % deck.length].crowdPct) : odds), next: money(Math.round(pot * (deck[(step + 1) % deck.length] ? stepOdds(deck[(step + 1) % deck.length].crowdPct) : odds))) })}
                    </div>
                    <button type="button" onClick={cashOut} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand-green font-poppins text-base font-black uppercase text-white">
                      <Lock className="size-4" /> {t('Cash out {pot}', { pot: money(pot) })}
                    </button>
                    <button type="button" onClick={ride} className="h-14 rounded-2xl border-2 border-brand-yellow bg-brand-yellow/10 font-poppins text-base font-black uppercase text-brand-yellow">
                      {t('Ride on')}
                    </button>
                  </motion.div>
                )}

                {phase === 'busted' && (
                  <motion.div key="busted" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2 text-center">
                    <div className="text-3xl">💥</div>
                    <div className="font-poppins text-lg font-black uppercase text-brand-red">{t('Wrong call')}</div>
                    <p className="font-poppins text-xs font-semibold text-white/50">{t('The ride ends — your {stake} stake is gone.', { stake: money(stake) })}</p>
                    <button type="button" onClick={() => setPhase('idle')} className="mt-1 w-full rounded-2xl bg-brand-green-light py-3.5 font-poppins text-base font-black uppercase text-black">
                      {t('New ride')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {phase === 'cashed' && (
          <motion.div key="cashed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="text-5xl">💰</div>
            <div className="font-poppins text-2xl font-black uppercase text-brand-green-light">{t('Cashed {amount}!', { amount: money(payout) })}</div>
            <p className="font-poppins text-xs font-semibold text-white/55">{t('{n} correct calls — {mult}x your stake.', { n: step + 1, mult: (payout / stake).toFixed(2) })}</p>
            <button type="button" onClick={() => setPhase('idle')} className="mt-2 w-full max-w-xs rounded-2xl bg-brand-green-light py-3.5 font-poppins text-base font-black uppercase text-black">
              {t('New ride')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </MiniGameShell>
  );
}
