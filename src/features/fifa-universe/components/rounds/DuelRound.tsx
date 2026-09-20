'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { BATTLE_STATS, STAT_LABEL, editionLabel, rand, statValue, type BattleStat, type FifaCard } from '../../lib/data';
import { makeHiLoStep } from './HiLoRound';
import type { RoundProps } from '../../lib/runner';
import { MiniFutCard } from '../MiniFutCard';
import { Callout, ResultBanner, GOLD, GREEN, RED } from '../ui';

/** Two cards, one stat: tap the higher. Also the Draft Battle trivia and a Survival round. */
export function makeDuel(level: number, used: Set<string>): { a: FifaCard; b: FifaCard; stat: BattleStat } {
  const stat = level < 1 ? 'overall' : rand(BATTLE_STATS);
  for (let i = 0; i < 8; i++) {
    const s = makeHiLoStep(level, used, 'players');
    if (statValue(s.a, stat) !== statValue(s.b, stat)) return { a: s.a, b: s.b, stat };
  }
  const s = makeHiLoStep(level, used, 'players');
  return { a: s.a, b: s.b, stat: 'overall' };
}

export function DuelBoard({ a, b, stat, picked, onPick }: { a: FifaCard; b: FifaCard; stat: BattleStat; picked: string | null; onPick: (id: string) => void }) {
  const va = statValue(a, stat);
  const vb = statValue(b, stat);
  const winner = va > vb ? a.id : b.id;
  const side = (c: FifaCard, v: number) => {
    const won = picked !== null && c.id === winner;
    const lost = picked !== null && c.id === picked && c.id !== winner;
    return (
      <button key={c.id} type="button" disabled={picked !== null} onClick={() => onPick(c.id)} className="flex flex-col items-center gap-2">
        <MiniFutCard card={c} size="md" hideOverall={picked === null} highlight={won ? 'correct' : lost ? 'wrong' : null} />
        <span className="max-w-[124px] truncate font-poppins text-[11px] font-black uppercase tracking-wide text-white/70">{c.name}</span>
        <motion.span key={picked ?? 'q'} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-poppins text-3xl font-black tabular-nums" style={{ color: picked === null ? 'rgba(255,255,255,0.3)' : won ? GREEN : lost ? RED : GOLD }}>
          {picked === null ? '?' : v}
        </motion.span>
      </button>
    );
  };
  return (
    <div>
      <Callout k={stat}>{STAT_LABEL[stat]}</Callout>
      <p className="mb-3 mt-1 text-center font-poppins text-[11px] font-black uppercase tracking-wider text-white/45">{editionLabel(a.edition)} · {'who has more?'}</p>
      <div className="flex items-start justify-center gap-6">
        {side(a, va)}
        {side(b, vb)}
      </div>
    </div>
  );
}

export function DuelRound({ level, used, onDone }: RoundProps) {
  const t = useMiniT();
  const [duel] = useState(() => makeDuel(level, used));
  useEffect(() => { used.add(duel.a.name); used.add(duel.b.name); }, [used, duel]);
  const [picked, setPicked] = useState<string | null>(null);
  const winner = statValue(duel.a, duel.stat) > statValue(duel.b, duel.stat) ? duel.a : duel.b;
  const correct = picked === winner.id;
  const points = correct ? 80 : 0;
  return (
    <div className="flex flex-1 flex-col">
      <DuelBoard a={duel.a} b={duel.b} stat={duel.stat} picked={picked} onPick={setPicked} />
      {picked !== null && (
        <div className="mt-4">
          <ResultBanner correct={correct} points={points} answer={winner.name} detail={`${STAT_LABEL[duel.stat]} ${statValue(duel.a, duel.stat)} vs ${statValue(duel.b, duel.stat)}`} onNext={() => onDone({ correct, points, label: `${duel.a.name} vs ${duel.b.name}`, tag: t('Duel'), maxPoints: 80 })} />
        </div>
      )}
    </div>
  );
}
