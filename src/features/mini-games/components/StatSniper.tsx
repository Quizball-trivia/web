'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crosshair, Minus, Plus } from 'lucide-react';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { getSniperRounds, sniperScore, type SniperRound } from '../data/statSniper';
import { useMiniLocale, useMiniT } from '../lib/i18n';

const ROUNDS = 5;

type Phase = 'idle' | 'guessing' | 'reveal' | 'over';

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function StatSniper({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const miniLocale = useMiniLocale();
  const [deck, setDeck] = useState<SniperRound[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [idx, setIdx] = useState(0);
  const [guess, setGuess] = useState(0);
  const [score, setScore] = useState(0);
  const [lastPts, setLastPts] = useState(0);
  const bank = useMemo(() => getSniperRounds(miniLocale), [miniLocale]);

  const round = deck[idx];

  const start = () => {
    const d = shuffled(bank).slice(0, ROUNDS);
    setDeck(d);
    setIdx(0);
    setScore(0);
    setGuess(Math.round((d[0].min + d[0].max) / 2 / d[0].step) * d[0].step);
    setPhase('guessing');
  };

  const lockIn = () => {
    if (phase !== 'guessing' || !round) return;
    const pts = sniperScore(guess, round);
    setLastPts(pts);
    setScore((s) => s + pts);
    setPhase('reveal');
  };

  const next = () => {
    if (idx + 1 >= deck.length) {
      setPhase('over');
      return;
    }
    const n = deck[idx + 1];
    setIdx(idx + 1);
    setGuess(Math.round((n.min + n.max) / 2 / n.step) * n.step);
    setPhase('guessing');
  };

  const nudge = (dir: -1 | 1) => {
    if (!round) return;
    setGuess((g) => Math.max(round.min, Math.min(round.max, g + dir * round.step)));
  };

  const grade =
    score >= ROUNDS * 85 ? t('Elite sniper!') : score >= ROUNDS * 60 ? t('Sharp shooter') : score >= ROUNDS * 35 ? t('On the range') : t('Blindfolded');

  return (
    <MiniGameShell
      backHref={backHref}
      title={t('Stat Sniper')}
      subtitle={t('No options, no help — land your guess on the number')}
      accent="#FFD700"
      headerRight={<StatPill label={t('Score')} value={score} color="#FFD700" />}
    >
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <Crosshair className="size-12 text-brand-gold" />
            <div className="font-poppins text-xl font-black uppercase text-brand-gold">{t('Stat Sniper')}</div>
            <p className="max-w-xs font-poppins text-sm font-semibold leading-snug text-white/60">
              {t('{n} numeric stats — slide to your best guess. The closer you land, the more you score; a perfect hit pays a bullseye bonus.', { n: ROUNDS })}
            </p>
            <button type="button" onClick={start} className="h-14 w-full max-w-xs rounded-2xl bg-brand-gold font-poppins text-lg font-black uppercase tracking-wide text-black">
              {t('Take aim')}
            </button>
          </motion.div>
        )}

        {(phase === 'guessing' || phase === 'reveal') && round && (
          <motion.div key={`r-${idx}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 flex flex-1 flex-col">
            <div className="mb-1 font-poppins text-[10px] font-black uppercase tracking-wider text-white/40">
              {t('Target {n} / {total}', { n: idx + 1, total: ROUNDS })}
            </div>
            <p className="mb-4 font-poppins text-base font-bold leading-snug text-white">{round.prompt}</p>

            {/* Guess readout */}
            <div className="mb-3 rounded-2xl border-2 border-brand-gold/30 bg-gradient-to-b from-brand-gold/[0.08] to-transparent p-4 text-center">
              <div className="font-poppins text-4xl font-black tabular-nums text-brand-gold">
                {guess.toLocaleString()}
              </div>
              <div className="font-poppins text-[11px] font-bold uppercase tracking-wide text-white/45">{round.unit}</div>
            </div>

            {phase === 'guessing' ? (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <button type="button" onClick={() => nudge(-1)} aria-label="-" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/70">
                    <Minus className="size-4" />
                  </button>
                  <input
                    type="range"
                    min={round.min}
                    max={round.max}
                    step={round.step}
                    value={guess}
                    onChange={(e) => setGuess(Number(e.target.value))}
                    className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-[#FFD700]"
                  />
                  <button type="button" onClick={() => nudge(1)} aria-label="+" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/70">
                    <Plus className="size-4" />
                  </button>
                </div>
                <div className="mb-4 flex justify-between font-poppins text-[10px] font-bold tabular-nums text-white/35">
                  <span>{round.min.toLocaleString()}</span>
                  <span>{round.max.toLocaleString()}</span>
                </div>
                <button type="button" onClick={lockIn} className="h-14 rounded-2xl bg-brand-gold font-poppins text-lg font-black uppercase tracking-wide text-black">
                  {t('Lock it in')}
                </button>
              </>
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2 text-center">
                <div className="font-poppins text-xs font-black uppercase tracking-wider text-white/45">{t('Answer')}</div>
                <div className="font-poppins text-3xl font-black tabular-nums text-white">{round.value.toLocaleString()}</div>
                <div className={`rounded-xl px-4 py-1.5 font-poppins text-sm font-black uppercase ${lastPts >= 100 ? 'bg-brand-gold/20 text-brand-gold' : lastPts >= 60 ? 'bg-brand-green-light/15 text-brand-green-light' : lastPts > 0 ? 'bg-brand-orange/15 text-brand-orange' : 'bg-brand-red/15 text-brand-red'}`}>
                  {lastPts >= 125 ? t('BULLSEYE! +{pts}', { pts: lastPts }) : t('+{pts} pts', { pts: lastPts })}
                </div>
                <p className="font-poppins text-[11px] font-semibold text-white/45">
                  {t('You were {diff} off.', { diff: Math.abs(guess - round.value).toLocaleString() })}
                </p>
                <button type="button" onClick={next} className="mt-2 h-12 w-full rounded-2xl bg-brand-gold font-poppins text-base font-black uppercase text-black">
                  {idx + 1 >= deck.length ? t('See result') : t('Next target')}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === 'over' && (
          <motion.div key="over" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="text-5xl">🎯</div>
            <div className="font-poppins text-2xl font-black uppercase text-brand-gold">{grade}</div>
            <p className="font-poppins text-sm font-bold text-white">{t('{score} points over {n} targets', { score, n: ROUNDS })}</p>
            <button type="button" onClick={start} className="mt-2 w-full max-w-xs rounded-2xl bg-brand-gold py-3.5 font-poppins text-base font-black uppercase text-black">
              {t('Reload')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </MiniGameShell>
  );
}
