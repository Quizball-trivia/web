'use client';

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Crown } from 'lucide-react';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { fmtPoints, rivalRoll, shuffle, TIER_ORDER } from '../lib/data';
import type { RoundResult } from '../lib/runner';
import { ROUND_KINDS, type RoundKind } from './Survival';
import { FifaShell, Intro, PrimaryButton, RivalBar, StatPill, Summary, GOLD, GREEN, RED } from '../components/ui';

const ROUNDS = 7;

/** Lineup for a match: six distinct quick rounds, finale is always a Stat Duel. */
function lineup(): RoundKind[] {
  const quick = ROUND_KINDS.filter((k) => !['detective', 'duel'].includes(k.id));
  return [...shuffle(quick).slice(0, ROUNDS - 1), ROUND_KINDS.find((k) => k.id === 'duel')!];
}

/** FIFA Gauntlet — Mario Party × FIFA knowledge. Seven random mini-games against a rival. */
export function Gauntlet({ backHref }: { backHref?: string }) {
  const t = useMiniT();
  const [phase, setPhase] = useState<'intro' | 'play' | 'between' | 'over'>('intro');
  const [kinds, setKinds] = useState<RoundKind[]>([]);
  const [index, setIndex] = useState(0);
  const [log, setLog] = useState<Array<{ kind: string; label: string; you: number; rival: number }>>([]);
  const [run, setRun] = useState(0);
  const [used, setUsed] = useState(() => new Set<string>());
  const you = useMemo(() => log.reduce((s, r) => s + r.you, 0), [log]);
  const rival = useMemo(() => log.reduce((s, r) => s + r.rival, 0), [log]);

  const start = () => {
    setUsed(new Set());
    setKinds(lineup());
    setIndex(0);
    setLog([]);
    setRun((r) => r + 1);
    setPhase('play');
  };

  const done = useCallback((r: RoundResult) => {
    const level = Math.min(3, Math.floor(index / 2));
    const roll = rivalRoll(TIER_ORDER[level], 0.7);
    const max = r.maxPoints ?? Math.max(r.points, 100);
    const rivalPts = roll.correct ? Math.round(max * (0.4 + Math.random() * 0.6)) : 0;
    setLog((l) => [...l, { kind: kinds[index].name, label: r.label, you: r.points, rival: rivalPts }]);
    setPhase(index + 1 >= kinds.length ? 'over' : 'between');
  }, [index, kinds]);

  const next = () => { setIndex((i) => i + 1); setPhase('play'); };
  const kind = kinds[index];
  const last = log[log.length - 1];
  const roundsWon = log.filter((r) => r.you > r.rival).length;
  const roundsLost = log.filter((r) => r.you < r.rival).length;

  return (
    <FifaShell
      title={t('FIFA Gauntlet')}
      subtitle={t('Seven random mini-games, one rival, one winner')}
      backHref={backHref}
      headerRight={phase !== 'intro' ? <StatPill label={t('Round')} value={`${Math.min(index + 1, ROUNDS)}/${ROUNDS}`} color={GOLD} /> : undefined}
    >
      <AnimatePresence mode="wait">
        {phase === 'intro' ? (
          <Intro key="intro" icon={Crown} title={t('FIFA Gauntlet')} tagline={t('The party meta-mode — every match is a different mix.')} chips={[t('1v1 vs rival'), t('7 rounds'), t('Friends-ready')]} onStart={start}
            steps={[t('The match draws seven different games: Hi-Lo, Card Detective, Stat Battle, Guess the Year, Rating Journey, Missing XI… the finale is always a Stat Duel.'), t('Both players get the same round; points are compared after each one.'), t('Most points after seven rounds wins the Gauntlet.')]} />
        ) : phase === 'over' ? (
          <Summary key="over" title={you > rival ? t('You win the Gauntlet!') : you < rival ? t('Rival wins the Gauntlet') : t('Dead heat')} score={`${fmtPoints(you)} – ${fmtPoints(rival)}`} subline={t('Rounds won {w} · lost {l}', { w: roundsWon, l: roundsLost })} onPlayAgain={start}
            rows={log.map((r, i) => ({ key: String(i), label: `${r.kind} · ${r.label}`, right: `${r.you} – ${r.rival}`, ok: r.you > r.rival ? true : r.you < r.rival ? false : null }))} />
        ) : phase === 'between' && last ? (
          <motion.div key={`between-${index}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col justify-center">
            <RivalBar you={fmtPoints(you)} rival={fmtPoints(rival)} />
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-6 text-center">
              <div className="font-poppins text-[11px] font-black uppercase tracking-[0.2em] text-white/50">{t('Round {n}', { n: index + 1 })} · {t(last.kind)}</div>
              <div className="mt-3 flex items-center justify-center gap-6">
                <div><div className="font-poppins text-[10px] font-black uppercase tracking-wider text-white/45">{t('You')}</div><div className="font-poppins text-4xl font-black" style={{ color: last.you >= last.rival ? GREEN : RED }}>+{last.you}</div></div>
                <div className="font-poppins text-sm font-black text-white/30">VS</div>
                <div><div className="font-poppins text-[10px] font-black uppercase tracking-wider text-white/45">{t('Rival')}</div><div className="font-poppins text-4xl font-black" style={{ color: last.rival > last.you ? GREEN : RED }}>+{last.rival}</div></div>
              </div>
              <div className="mt-3 font-poppins text-sm font-black uppercase tracking-wider" style={{ color: last.you > last.rival ? GREEN : last.you < last.rival ? RED : GOLD }}>
                {last.you > last.rival ? t('Round to you') : last.you < last.rival ? t('Round to the rival') : t('Shared round')}
              </div>
            </div>
            <PrimaryButton className="mt-5" onClick={next}>{t('Next')}: {t(kinds[index + 1]?.name ?? '')}</PrimaryButton>
          </motion.div>
        ) : kind ? (
          <motion.div key={`${run}-${index}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="flex flex-1 flex-col">
            <RivalBar you={fmtPoints(you)} rival={fmtPoints(rival)} center={<span className="font-poppins text-[10px] font-black uppercase tracking-wider text-brand-yellow">{t(kind.name)}</span>} />
            <kind.Round level={Math.min(3, Math.floor(index / 2))} used={used} onDone={done} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </FifaShell>
  );
}
