'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Zap, TrendingUp } from 'lucide-react';
import { ClubCrest } from './Badges';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { getSlip, BOOST_FACTOR } from '../data/betSlip';
import { formatOdds, money } from '../lib/odds';
import { useMiniLocale, useMiniT } from '../lib/i18n';

type Phase = 'boost' | 'review' | 'result';
const STAKE = 100;

export function BetSlipBooster({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const miniLocale = useMiniLocale();
  const [points, setPoints] = useState(500);
  const [phase, setPhase] = useState<Phase>('boost');
  const [leg, setLeg] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [boosted, setBoosted] = useState<boolean[]>([false, false, false]);
  const [result, setResult] = useState<{ won: boolean; payout: number } | null>(null);

  const SLIP = useMemo(() => getSlip(miniLocale), [miniLocale]);
  const baseCombined = SLIP.reduce((acc, s) => acc * s.baseOdds, 1);
  const oddsOf = (i: number) => SLIP[i].baseOdds * (boosted[i] ? BOOST_FACTOR : 1);
  const boostedCombined = SLIP.reduce((acc, s, i) => acc * oddsOf(i), 1);

  const answer = (i: number) => {
    if (selected !== null) return;
    const q = SLIP[leg].question;
    setSelected(i);
    window.setTimeout(() => {
      if (i === q.answer) setBoosted((b) => b.map((v, idx) => (idx === leg ? true : v)));
      window.setTimeout(() => {
        setSelected(null);
        if (leg < SLIP.length - 1) setLeg((l) => l + 1);
        else setPhase('review');
      }, 650);
    }, 700);
  };

  const place = () => {
    setPoints((p) => p - STAKE);
    // Resolve by combined implied probability (1/odds).
    const won = Math.random() < 1 / boostedCombined;
    const payout = won ? Math.round(STAKE * boostedCombined) : 0;
    if (won) setPoints((p) => p + payout);
    setResult({ won, payout });
    setPhase('result');
  };

  const reset = () => {
    setPhase('boost');
    setLeg(0);
    setSelected(null);
    setBoosted([false, false, false]);
    setResult(null);
  };

  return (
    <MiniGameShell
      backHref={backHref}
      title={t('Bet Slip Booster')}
      subtitle={t('Answer right to boost your odds')}
      accent="#FFD700"
      headerRight={<StatPill label={t('Points')} value={points.toLocaleString()} color="#FFD700" />}
    >
      {/* Slip */}
      <div className="mt-2 overflow-hidden rounded-2xl border-2 border-brand-gold/25 bg-surface-card/60">
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-brand-gold/[0.06] px-4 py-2">
          <span className="font-poppins text-xs font-black uppercase tracking-wider text-brand-gold">{t('Bet Slip · Treble')}</span>
          <span className="font-poppins text-[10px] font-bold uppercase text-white/40">{t('3 selections')}</span>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {SLIP.map((s, i) => {
            const active = phase === 'boost' && i === leg;
            const isBoosted = boosted[i];
            return (
              <div key={s.club} className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${active ? 'bg-brand-gold/[0.06]' : ''}`}>
                <ClubCrest club={s.club} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-poppins text-sm font-black text-white">{t(s.pick)}</div>
                  <div className="truncate font-poppins text-[10px] font-semibold text-white/40">{s.match}</div>
                </div>
                <div className="shrink-0 text-right">
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={oddsOf(i)}
                      initial={{ y: 6, opacity: 0, scale: 0.8 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, position: 'absolute' }}
                      className={`font-poppins text-base font-black tabular-nums ${isBoosted ? 'text-brand-green' : 'text-white'}`}
                    >
                      {formatOdds(oddsOf(i))}
                    </motion.div>
                  </AnimatePresence>
                  {isBoosted && <div className="font-poppins text-[9px] font-black uppercase text-brand-green">{t('boosted')}</div>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-white/[0.06] bg-black/20 px-4 py-2.5">
          <span className="font-poppins text-xs font-black uppercase tracking-wider text-white/50">{t('Total odds')}</span>
          <div className="flex items-center gap-2">
            {boostedCombined > baseCombined && <span className="font-poppins text-xs font-bold text-white/30 line-through">{formatOdds(baseCombined)}</span>}
            <AnimatePresence mode="popLayout">
              <motion.span
                key={boostedCombined}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0, position: 'absolute' }}
                className="font-poppins text-xl font-black tabular-nums text-brand-gold"
              >
                {formatOdds(boostedCombined)}x
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-4 flex-1">
        <AnimatePresence mode="wait">
          {phase === 'boost' && (
            <motion.div key={`leg-${leg}`} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="rounded-2xl border border-white/15 bg-brand-blue p-4">
              <div className="mb-2 flex items-center gap-1.5 font-poppins text-[10px] font-black uppercase tracking-wider text-brand-yellow">
                <Zap className="size-3.5" /> {t('Boost leg {n} · {club}', { n: leg + 1, club: SLIP[leg].club.replace(/ (CF|FC)$/i, '') })}
              </div>
              <p className="mb-3 font-poppins text-base font-bold leading-snug text-white">{SLIP[leg].question.q}</p>
              <div className="grid grid-cols-1 gap-2">
                {SLIP[leg].question.options.map((opt, i) => {
                  const q = SLIP[leg].question;
                  const state = selected === null ? 'idle' : i === q.answer ? 'correct' : selected === i ? 'wrong' : 'dim';
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={selected !== null}
                      onClick={() => answer(i)}
                      className={`flex items-center justify-between rounded-xl border-2 px-3.5 py-3 text-left font-poppins text-sm font-bold transition-colors ${
                        state === 'idle'
                          ? 'border-brand-yellow/70 bg-transparent text-white shadow-[0_0_6px_1px_rgba(255,229,0,0.12)] hover:border-brand-yellow'
                          : state === 'correct'
                            ? 'border-brand-green bg-brand-green/20 text-white'
                            : state === 'wrong'
                              ? 'border-brand-red bg-brand-red/20 text-white'
                              : 'border-white/15 bg-transparent text-white/40'
                      }`}
                    >
                      {opt}
                      {state === 'correct' && <Check className="size-4 text-brand-green" />}
                      {state === 'wrong' && <X className="size-4 text-brand-red" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {phase === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="rounded-2xl border-2 border-brand-gold/40 bg-brand-gold/[0.08] p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 font-poppins text-sm font-black uppercase text-brand-gold">
                  <TrendingUp className="size-4" /> {t('Boosted {a} → {b}', { a: formatOdds(baseCombined), b: formatOdds(boostedCombined) })}
                </div>
                <div className="mt-1 font-poppins text-xs font-semibold text-white/55">
                  {t('Stake {stake} · potential return', { stake: money(STAKE) })} <span className="font-black text-brand-gold">{money(STAKE * boostedCombined)}</span>
                </div>
              </div>
              <button type="button" onClick={place} disabled={STAKE > points} className="h-14 w-full rounded-2xl bg-brand-gold font-poppins text-lg font-black uppercase tracking-wide text-black disabled:opacity-40">
                {t('Place bet · {stake}', { stake: money(STAKE) })}
              </button>
            </motion.div>
          )}

          {phase === 'result' && result && (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 py-3 text-center">
              <div className="text-5xl">{result.won ? '🤑' : '😖'}</div>
              <div className="font-poppins text-2xl font-black uppercase" style={{ color: result.won ? '#58CC02' : '#FB3101' }}>
                {result.won ? t('Slip landed!') : t('Not this time')}
              </div>
              <div className="font-poppins text-sm font-semibold text-white/55">
                {result.won ? (
                  <span className="font-black text-brand-green">+{money(result.payout)}</span>
                ) : (
                  t("The boosted {odds}x didn't come in.", { odds: formatOdds(boostedCombined) })
                )}
              </div>
              <button type="button" onClick={reset} className="mt-2 h-14 w-full rounded-2xl bg-brand-gold font-poppins text-lg font-black uppercase tracking-wide text-black">
                {t('New slip')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MiniGameShell>
  );
}
