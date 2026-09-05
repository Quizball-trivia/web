'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { FutCard } from '@/features/mini-games/components/FutCard';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { drawCard, nameChoices, tierAtLeast, editionLabel } from '../../lib/data';
import { ladder, type RoundProps } from '../../lib/runner';
import { Choices, ResultBanner, TimerBar } from '../ui';

/** Reveal schedule (ms) and the points each stage is worth if answered then. */
const STAGES = [0, 3000, 5000, 7000, 10000];
const POINTS = [100, 90, 75, 60, 40];
const STAGE_LABEL = ['Stats only', '+ Position', '+ Nation', '+ Club', '+ Photo'];

/**
 * Guess the FIFA Card — the card starts as stats only and reveals position,
 * nation, club and finally the face on a schedule. Answer early for more.
 */
export function GuessCardRound({ level, used, onDone }: RoundProps) {
  const t = useMiniT();
  const [card] = useState(() => {
    const c = drawCard({ tiers: tierAtLeast(level), exclude: used });
    return c;
  });
  useEffect(() => { used.add(card.name); }, [used, card]);
  const [options] = useState(() => nameChoices(card));
  const [stage, setStage] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Reveal clock — stops once the player has answered.
  useEffect(() => {
    if (picked !== null) return;
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const ms = Date.now() - startedAt;
      setElapsed(ms);
      let s = 0;
      for (let i = 0; i < STAGES.length; i++) if (ms >= STAGES[i]) s = i;
      setStage(s);
    }, 100);
    return () => window.clearInterval(id);
  }, [picked]);

  const correct = picked === card.name;
  const points = correct ? ladder(stage, POINTS) : 0;
  const shownCard = { ...card, position: stage >= 1 ? card.position : '' };
  const revealed = {
    nation: picked !== null || stage >= 2,
    league: picked !== null,
    club: picked !== null || stage >= 3,
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between font-poppins text-[11px] font-black uppercase tracking-wider text-white/55">
        <span>{t(STAGE_LABEL[stage])}</span>
        <span className="text-brand-yellow">{picked === null ? `${ladder(stage, POINTS)} ${t('pts')}` : ''}</span>
      </div>
      <TimerBar progress={Math.min(1, elapsed / STAGES[STAGES.length - 1])} />
      <div className="mt-3">
        <FutCard card={shownCard} revealed={revealed} revealName={picked !== null} revealFace={picked !== null || stage >= 4} highlight={picked === null ? null : correct ? 'correct' : 'reveal'} />
      </div>
      <div className="mt-4">
        {picked === null ? (
          <Choices options={options.map((o) => ({ id: o.name, label: o.name }))} picked={picked} correctId={null} onPick={setPicked} />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Choices options={options.map((o) => ({ id: o.name, label: o.name }))} picked={picked} correctId={card.name} onPick={() => {}} />
            <div className="mt-3">
              <ResultBanner correct={correct} points={points} answer={card.name} detail={`${card.club} · ${editionLabel(card.edition)}`} onNext={() => onDone({ correct, points, label: card.name, tag: editionLabel(card.edition), maxPoints: POINTS[0] })} />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
