'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ClubCrest } from '@/features/mini-games/components/Badges';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { JOURNEYS, editionLabel, editionNum, nameChoices, rand, type PlayerJourney } from '../../lib/data';
import { ladder, type RoundProps } from '../../lib/runner';
import { MiniFutCard, StatStrip } from '../MiniFutCard';
import { Choices, Flag, ResultBanner, GOLD } from '../ui';

/**
 * Players whose earliest card in the database is clearly below the peak they
 * reached later. The dataset is the top ~100 per edition (FIFA 15+), so these
 * are "before the fame" cards rather than 63-rated Career Mode kids — a fuller
 * potential/age feed would widen this pool considerably.
 */
export const WONDERKIDS: PlayerJourney[] = JOURNEYS.filter((j) => {
  const first = j.cards[0];
  return j.peak.overall - first.overall >= 4 && editionNum(j.peak.edition) - editionNum(first.edition) >= 2;
});

const CLUE_MS = 2500;
const POINTS = [100, 80, 65, 50, 40];

/** Wonderkid — a young card with its future peak as "potential". Progressive clues. */
export function WonderkidRound({ level, used, onDone }: RoundProps) {
  const t = useMiniT();
  const [journey] = useState(() => {
    const easy = level < 1;
    const pool = WONDERKIDS.filter((j) => !used.has(j.name) && (easy ? j.difficulty === 'easy' || j.difficulty === 'medium' : true));
    const j = rand(pool.length ? pool : WONDERKIDS.length ? WONDERKIDS : JOURNEYS);
    return j;
  });
  useEffect(() => { used.add(journey.name); }, [used, journey]);
  const first = journey.cards[0];
  const peak = journey.peak;
  const [options] = useState(() => nameChoices(peak));
  const [clues, setClues] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const over = picked !== null;

  useEffect(() => {
    if (over || clues >= 4) return;
    const id = window.setTimeout(() => setClues((c) => c + 1), CLUE_MS);
    return () => window.clearTimeout(id);
  }, [over, clues]);

  const correct = picked === journey.name;
  const points = correct ? ladder(clues, POINTS) : 0;
  const chips = [
    { key: 'nation', node: <><Flag code={first.nationCode} /> {first.nation}</> },
    { key: 'league', node: <>{first.league}</> },
    { key: 'club', node: <><ClubCrest club={first.club} size={18} /> {first.club}</> },
    { key: 'peak', node: <>{t('became')} {peak.overall} @ <ClubCrest club={peak.club} size={18} /> {peak.club}</> },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between font-poppins text-[11px] font-black uppercase tracking-wider text-white/55">
        <span>{t('Who is the wonderkid?')}</span>
        <span className="text-brand-yellow">{over ? '' : `${ladder(clues, POINTS)} ${t('pts')}`}</span>
      </div>
      <div className="flex items-center justify-center gap-4">
        <MiniFutCard card={first} size="lg" masked={!over} highlight={over ? (correct ? 'correct' : 'wrong') : null} />
        <div className="flex flex-col items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-center">
          <span className="font-poppins text-[10px] font-black uppercase tracking-widest text-white/50">{editionLabel(first.edition)}</span>
          <span className="mt-1 font-poppins text-[10px] font-black uppercase tracking-widest text-white/50">OVR</span>
          <span className="font-poppins text-3xl font-black text-white">{first.overall}</span>
          <span className="mt-1 font-poppins text-[10px] font-black uppercase tracking-widest text-white/50">POT</span>
          <motion.span animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} className="font-poppins text-3xl font-black" style={{ color: GOLD }}>{peak.overall}</motion.span>
        </div>
      </div>
      <div className="mt-3">
        <StatStrip card={first} />
      </div>
      <div className="mt-2.5 flex min-h-[28px] flex-wrap justify-center gap-1.5">
        {chips.map((c, i) =>
          i < clues || over ? (
            <motion.span key={c.key} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/40 px-2.5 py-1 font-poppins text-[11px] font-black uppercase tracking-wide text-white">
              {c.node}
            </motion.span>
          ) : null,
        )}
      </div>
      <div className="mt-3">
        <Choices options={options.map((o) => ({ id: o.name, label: o.name }))} picked={picked} correctId={over ? journey.name : null} onPick={setPicked} />
        {over && (
          <div className="mt-3">
            <ResultBanner correct={correct} points={points} answer={journey.name} detail={`${first.overall} ${t('in')} ${editionLabel(first.edition)} → ${peak.overall} ${t('in')} ${editionLabel(peak.edition)}`} onNext={() => onDone({ correct, points, label: journey.name, tag: editionLabel(first.edition), maxPoints: POINTS[0] })} />
          </div>
        )}
      </div>
    </div>
  );
}
