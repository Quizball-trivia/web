'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Coins, Crown } from 'lucide-react';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { editionLabel, rand, type FifaCard, type FifaEdition } from '../lib/data';
import { SLOTS, XI_EDITIONS, budgetOptions, price, ratings, reserveFor, type Squad } from '../lib/squad';
import { MiniFutCard } from '../components/MiniFutCard';
import { Pitch } from '../components/Pitch';
import { FifaShell, Intro, PrimaryButton, StatPill, Summary, GOLD, GREEN, RED } from '../components/ui';

const BUDGET = 100;

/** Build the Best XI — position by position, three choices each, a budget that makes "always the best" wrong. */
export function BestXI({ backHref }: { backHref?: string }) {
  const t = useMiniT();
  const [phase, setPhase] = useState<'intro' | 'pick' | 'result'>('intro');
  const [edition, setEdition] = useState<FifaEdition>(XI_EDITIONS[0]);
  const [slot, setSlot] = useState(0);
  const [squad, setSquad] = useState<Squad>({});
  const [rivalSquad, setRivalSquad] = useState<Squad>({});
  const [spent, setSpent] = useState(0);
  const [seed, setSeed] = useState(0);
  const budget = BUDGET - spent;
  const used = useMemo(() => new Set(Object.values(squad).filter((c): c is FifaCard => !!c).map((c) => c.name)), [squad]);
  // What this slot may cost: keep enough back to fill every later slot with its cheapest card.
  const spendable = phase === 'pick' ? budget - reserveFor(edition, slot + 1, used) : budget;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const options = useMemo(() => (phase === 'pick' ? budgetOptions(edition, SLOTS[slot].group, used, spendable) : []), [phase, edition, slot, seed]);

  const start = () => {
    const e = rand(XI_EDITIONS);
    setEdition(e);
    setSquad({});
    setRivalSquad(buildRival(e));
    setSpent(0);
    setSlot(0);
    setSeed((s) => s + 1);
    setPhase('pick');
  };

  const pick = (card: FifaCard) => {
    if (price(card) > spendable) return;
    const next = { ...squad, [SLOTS[slot].id]: card };
    setSquad(next);
    setSpent((s) => s + price(card));
    if (slot + 1 >= SLOTS.length) setPhase('result');
    else { setSlot((s) => s + 1); setSeed((s) => s + 1); }
  };

  const you = ratings(squad);
  const rival = ratings(rivalSquad);
  const win = you.overall > rival.overall;

  return (
    <FifaShell
      title={t('Build the Best XI')}
      subtitle={t('Three choices per position, one budget — pick smart')}
      backHref={backHref}
      headerRight={phase !== 'intro' ? (
        <div className="flex items-center gap-2">
          <StatPill label={editionLabel(edition)} value={`${Math.min(slot + 1, SLOTS.length)}/${SLOTS.length}`} color={GOLD} />
          <StatPill label={t('Coins')} value={budget} color={budget < 15 ? RED : GREEN} />
        </div>
      ) : undefined}
      wide
    >
      <AnimatePresence mode="wait">
        {phase === 'intro' ? (
          <Intro key="intro" icon={Crown} title={t('Build the Best XI')} tagline={t("Not a quiz — a squad-building puzzle with a budget.")} chips={[t('Solo · 10 picks'), t('{n} QuizCoins', { n: BUDGET })]} onStart={start}
            steps={[t('A random FIFA is drawn. Fill a 4-3-3 position by position, three players offered each time.'), t('Every card has a price by rating — 22 coins for a 94, 6 for an 83. You have {n} coins for ten outfielders.', { n: BUDGET }), t('The rival builds from the same edition. Highest average OVR wins — spend your stars where they matter.')]} />
        ) : phase === 'result' ? (
          <Summary key="result" title={win ? t('Your XI is stronger!') : t('Rival built better')} score={you.overall.toFixed(1)} subline={t('Rival {n} · {left} coins unspent', { n: rival.overall.toFixed(1), left: budget })} onPlayAgain={start}
            extra={
              <div className="mt-3 grid grid-cols-3 gap-2">
                {([['ATT', you.att, rival.att], ['MID', you.mid, rival.mid], ['DEF', you.def, rival.def]] as const).map(([k, a, b]) => (
                  <div key={k} className="rounded-xl bg-white/[0.05] px-2 py-1.5">
                    <div className="font-poppins text-[9px] font-black uppercase tracking-wider text-white/45">{k}</div>
                    <div className="font-poppins text-sm font-black"><span style={{ color: a >= b ? GREEN : RED }}>{a.toFixed(1)}</span> <span className="text-white/35">vs {b.toFixed(1)}</span></div>
                  </div>
                ))}
              </div>
            }
            rows={SLOTS.map((s) => ({ key: s.id, label: `${s.label} · ${squad[s.id]?.name ?? '—'}`, tag: `${squad[s.id]?.overall ?? ''}`, right: `${rivalSquad[s.id]?.name ?? '—'} ${rivalSquad[s.id]?.overall ?? ''}`, ok: (squad[s.id]?.overall ?? 0) >= (rivalSquad[s.id]?.overall ?? 0) }))} />
        ) : (
          <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-start">
            <div className="lg:w-[340px] lg:shrink-0"><Pitch squad={squad} active={SLOTS[slot].id} /></div>
            <div className="flex-1">
              <p className="mb-2 text-center font-poppins text-[11px] font-black uppercase tracking-[0.2em] text-brand-yellow">{t('Pick your')} {SLOTS[slot].label}</p>
              <div className="flex justify-center gap-3">
                {options.map((c) => {
                  const p = price(c);
                  const afford = p <= spendable;
                  return (
                    <div key={c.id} className="flex flex-col items-center gap-1.5">
                      <MiniFutCard card={c} size="md" showEdition={false} dim={!afford} onClick={afford ? () => pick(c) : undefined} />
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-poppins text-[11px] font-black ${afford ? 'bg-brand-yellow/15 text-brand-yellow' : 'bg-white/[0.05] text-white/35'}`}><Coins className="size-3" /> {p}</span>
                      <span className="max-w-[124px] truncate font-poppins text-[11px] font-bold text-white/70">{c.name}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-center font-poppins text-[11px] font-semibold text-white/40">{t('{n} coins left for {slots} more slots', { n: budget, slots: SLOTS.length - slot })}</p>
              {options.every((c) => price(c) > spendable) && <PrimaryButton className="mt-3" tone="ghost" onClick={() => setSeed((s) => s + 1)}>{t('Re-roll cheaper options')}</PrimaryButton>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FifaShell>
  );
}

/** Rival: takes three options per slot like you do and picks the best it can afford, saving a little early on. */
function buildRival(edition: FifaEdition): Squad {
  const squad: Squad = {};
  const used = new Set<string>();
  let budget = BUDGET;
  SLOTS.forEach((s, i) => {
    const spendable = budget - reserveFor(edition, i + 1, used);
    const opts = budgetOptions(edition, s.group, used, spendable);
    const affordable = opts.filter((c) => price(c) <= spendable).sort((a, b) => b.overall - a.overall);
    // budgetOptions always includes the cheapest affordable card, so this only misses when the pool is exhausted.
    const pick = affordable[0];
    if (!pick) return;
    squad[s.id] = pick;
    used.add(pick.name);
    budget -= price(pick);
  });
  return squad;
}
