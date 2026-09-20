'use client';

import { useEffect, useRef, useState } from 'react';
import { useTimers } from '../lib/useTimers';
import { AnimatePresence, motion } from 'motion/react';
import { Dices, Shield, Swords, Zap } from 'lucide-react';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { STAT_LABEL, editionLabel, rand, rivalRoll, statValue, type FifaCard, type FifaEdition } from '../lib/data';
import { SLOTS, TACTICS, XI_EDITIONS, ratings, simulate, tierOptions, type Squad, type Tactic } from '../lib/squad';
import { DuelBoard, makeDuel } from '../components/rounds/DuelRound';
import { MiniFutCard } from '../components/MiniFutCard';
import { Pitch } from '../components/Pitch';
import { Callout, FifaShell, Intro, PrimaryButton, RivalBar, StatPill, Summary, TimerBar, GOLD, GREEN, RED } from '../components/ui';

const Q_MS = 6000;
const PERFECT_MS = 3000;
type Tier = 'premium' | 'good' | 'bad';
const TIER_META: Record<Tier, { label: string; color: string }> = {
  premium: { label: 'PERFECT ANSWER', color: GREEN },
  good: { label: 'GOOD ANSWER', color: GOLD },
  bad: { label: 'BAD ANSWER', color: RED },
};
const TACTIC_META: Record<Tactic, { label: string; icon: typeof Zap; blurb: string }> = {
  attack: { label: 'Attack', icon: Zap, blurb: 'Beats Balanced, loses to Defensive' },
  balanced: { label: 'Balanced', icon: Dices, blurb: 'Beats Defensive, loses to Attack' },
  defensive: { label: 'Defensive', icon: Shield, blurb: 'Beats Attack, loses to Balanced' },
};

/** FIFA Draft Battle — answer well, draft better cards, then out-think the rival with tactics. */
export function DraftBattle({ backHref }: { backHref?: string }) {
  const t = useMiniT();
  const [phase, setPhase] = useState<'intro' | 'question' | 'pick' | 'tactic' | 'result'>('intro');
  const [edition, setEdition] = useState<FifaEdition>(XI_EDITIONS[0]);
  const [slot, setSlot] = useState(0);
  const [squad, setSquad] = useState<Squad>({});
  const [rivalSquad, setRivalSquad] = useState<Squad>({});
  const [duel, setDuel] = useState<ReturnType<typeof makeDuel> | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier | null>(null);
  const [rivalTier, setRivalTier] = useState<Tier | null>(null);
  const [options, setOptions] = useState<FifaCard[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [tactic, setTactic] = useState<Tactic | null>(null);
  const [rivalTactic, setRivalTactic] = useState<Tactic>('balanced');
  const [score, setScore] = useState<{ you: number; rival: number; edge: number } | null>(null);
  const used = useRef<Set<string>>(new Set());
  const askedAt = useRef(0);
  const answered = useRef(false);
  const { after, clearAll } = useTimers();
  const resolveRef = useRef<(id: string | null) => void>(() => {});

  const ask = (e: FifaEdition, i: number) => {
    setDuel(makeDuel(Math.min(3, Math.floor(i / 3)), used.current));
    setPicked(null);
    setTier(null);
    setElapsed(0);
    answered.current = false;
    setSlot(i);
    setPhase('question');
  };

  const start = () => {
    clearAll();
    const e = rand(XI_EDITIONS);
    used.current = new Set();
    setEdition(e);
    setSquad({});
    setRivalSquad({});
    setTactic(null);
    setScore(null);
    ask(e, 0);
  };

  const resolve = (id: string | null) => {
    if (!duel || phase !== 'question' || answered.current) return;
    answered.current = true;
    const ms = Date.now() - askedAt.current;
    const winner = statValue(duel.a, duel.stat) > statValue(duel.b, duel.stat) ? duel.a.id : duel.b.id;
    const correct = id === winner;
    const tr: Tier = correct ? (ms <= PERFECT_MS ? 'premium' : 'good') : 'bad';
    setPicked(id ?? (winner === duel.a.id ? duel.b.id : duel.a.id));
    setTier(tr);
    // Rival answers the same question with its own luck.
    const roll = rivalRoll('medium');
    const rt: Tier = roll.correct ? (roll.delayMs < 2400 ? 'premium' : 'good') : 'bad';
    setRivalTier(rt);
    const exclude = new Set([...Object.values(squad), ...Object.values(rivalSquad)].filter((c): c is FifaCard => !!c).map((c) => c.name));
    const rivalOpts = tierOptions(edition, SLOTS[slot].group, exclude, rt);
    const rivalPick = rivalOpts.slice().sort((a, b) => b.overall - a.overall)[0];
    if (rivalPick) { setRivalSquad((s) => ({ ...s, [SLOTS[slot].id]: rivalPick })); exclude.add(rivalPick.name); }
    setOptions(tierOptions(edition, SLOTS[slot].group, exclude, tr));
    after(1300, () => setPhase('pick'));
  };
  useEffect(() => { resolveRef.current = resolve; });

  useEffect(() => {
    if (phase !== 'question' || picked !== null) return;
    askedAt.current = Date.now();
    const id = window.setInterval(() => {
      const ms = Date.now() - askedAt.current;
      setElapsed(ms);
      if (ms >= Q_MS) { window.clearInterval(id); resolveRef.current(null); }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, slot, picked]);

  const draft = (card: FifaCard) => {
    const next = { ...squad, [SLOTS[slot].id]: card };
    setSquad(next);
    if (slot + 1 >= SLOTS.length) setPhase('tactic');
    else ask(edition, slot + 1);
  };

  const kickOff = (tc: Tactic) => {
    const rt = rand(TACTICS);
    setTactic(tc);
    setRivalTactic(rt);
    setScore(simulate(squad, rivalSquad, tc, rt));
    setPhase('result');
  };

  const you = ratings(squad);
  const rival = ratings(rivalSquad);

  return (
    <FifaShell
      title={t('Draft Battle')}
      subtitle={t('Knowledge → better picks → squad → tactics')}
      backHref={backHref}
      headerRight={phase !== 'intro' ? <StatPill label={editionLabel(edition)} value={`${Math.min(slot + 1, SLOTS.length)}/${SLOTS.length}`} color={GOLD} /> : undefined}
      wide
    >
      <AnimatePresence mode="wait">
        {phase === 'intro' ? (
          <Intro key="intro" icon={Swords} title={t('Draft Battle')} tagline={t('Every question you answer decides how good your next pick can be.')} chips={[t('1v1 vs rival'), t('10 picks + tactics')]} onStart={start}
            steps={[t('Each slot starts with a quick question: which of two cards has the higher stat? Six seconds.'), t('Correct within three seconds unlocks a premium pick; correct but slow a good one; wrong means bargain-bin choices. The rival drafts in parallel.'), t('After ten picks choose Attack, Balanced or Defensive. Tactics beat each other rock-paper-scissors style — a weaker XI can still win.')]} />
        ) : phase === 'result' && score ? (
          <Summary key="result" title={score.you > score.rival ? t('Full time — you win!') : score.you < score.rival ? t('Full time — rival wins') : t('Full time — draw')} score={`${score.you} – ${score.rival}`}
            subline={t('XI {a} vs {b} · {tac} vs {rt}{edge}', { a: you.overall.toFixed(1), b: rival.overall.toFixed(1), tac: TACTIC_META[tactic ?? 'balanced'].label, rt: TACTIC_META[rivalTactic].label, edge: score.edge > 0 ? ' · tactics +' : score.edge < 0 ? ' · tactics −' : '' })}
            onPlayAgain={start}
            extra={<div className="mt-3 grid grid-cols-2 gap-3"><Pitch squad={squad} compact /><Pitch squad={rivalSquad} compact tint={RED} /></div>}
            rows={SLOTS.map((s) => ({ key: s.id, label: `${s.label} · ${squad[s.id]?.name ?? '—'}`, tag: `${squad[s.id]?.overall ?? ''}`, right: `${rivalSquad[s.id]?.name ?? '—'} ${rivalSquad[s.id]?.overall ?? ''}`, ok: (squad[s.id]?.overall ?? 0) >= (rivalSquad[s.id]?.overall ?? 0) }))} />
        ) : phase === 'tactic' ? (
          <motion.div key="tactic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 flex-col">
            <RivalBar you={`${you.overall.toFixed(1)} OVR`} rival={`${rival.overall.toFixed(1)} OVR`} />
            <div className="grid grid-cols-2 gap-3"><Pitch squad={squad} compact /><Pitch squad={rivalSquad} compact tint={RED} /></div>
            <Callout k="tactic">{t('Pick your tactic')}</Callout>
            <div className="mt-3 grid gap-2">
              {TACTICS.map((tc) => {
                const m = TACTIC_META[tc];
                return (
                  <button key={tc} type="button" onClick={() => kickOff(tc)} className="flex items-center gap-3 rounded-2xl bg-brand-blue/60 px-4 py-3 text-left transition-colors hover:bg-brand-blue">
                    <m.icon className="size-6 text-brand-yellow" />
                    <span><span className="block font-poppins text-base font-black uppercase text-white">{t(m.label)}</span><span className="block font-poppins text-[11px] font-semibold text-white/60">{t(m.blurb)}</span></span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : duel ? (
          <motion.div key={`${phase}-${slot}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-start">
            <div className="hidden lg:block lg:w-[300px] lg:shrink-0"><Pitch squad={squad} active={SLOTS[slot].id} /></div>
            <div className="flex-1">
              <RivalBar you={`${Object.keys(squad).length} ${t('drafted')}`} rival={`${Object.keys(rivalSquad).length} ${t('drafted')}`} center={<span className="font-poppins text-[10px] font-black uppercase tracking-wider text-white/40">{SLOTS[slot].label}</span>} />
              {phase === 'question' ? (
                <>
                  <TimerBar progress={elapsed / Q_MS} color={elapsed <= PERFECT_MS ? GREEN : GOLD} />
                  <p className="mb-2 mt-1 text-center font-poppins text-[10px] font-black uppercase tracking-wider text-white/45">{elapsed <= PERFECT_MS ? t('Answer now for a premium pick') : t('Still good — but not perfect')}</p>
                  <DuelBoard a={duel.a} b={duel.b} stat={duel.stat} picked={picked} onPick={resolve} />
                  {tier && <div className="mt-3"><Callout k={tier} color={TIER_META[tier].color}>{t(TIER_META[tier].label)}</Callout></div>}
                </>
              ) : (
                <>
                  {tier && <Callout k={tier} color={TIER_META[tier].color}>{t(TIER_META[tier].label)}</Callout>}
                  <p className="mb-3 mt-1 text-center font-poppins text-[11px] font-black uppercase tracking-wider text-white/45">
                    {t('Choose your')} {SLOTS[slot].label} · {t('rival got a {tier} pick', { tier: rivalTier === 'premium' ? t('premium') : rivalTier === 'good' ? t('good') : t('weak') })}
                  </p>
                  <div className="flex justify-center gap-3">
                    {options.map((c) => (
                      <div key={c.id} className="flex flex-col items-center gap-1.5">
                        <MiniFutCard card={c} size="md" showEdition={false} onClick={() => draft(c)} />
                        <span className="max-w-[124px] truncate font-poppins text-[11px] font-bold text-white/70">{c.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 lg:hidden"><Pitch squad={squad} active={SLOTS[slot].id} compact /></div>
                </>
              )}
              <p className="mt-3 text-center font-poppins text-[10px] font-semibold text-white/30">{STAT_LABEL[duel.stat]} · {editionLabel(edition)}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {phase === 'result' && !score && <PrimaryButton onClick={start}>{t('Play again')}</PrimaryButton>}
    </FifaShell>
  );
}
