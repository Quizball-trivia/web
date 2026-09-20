'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { drawJourney, editionLabel, editionNum, rand, shuffle, tierAtLeast, type FifaCard } from '../../lib/data';
import type { RoundProps } from '../../lib/runner';
import { MiniFutCard } from '../MiniFutCard';
import { PrimaryButton, ResultBanner } from '../ui';

type Variant = 'chrono' | 'overall' | 'pace';
const VARIANTS: Variant[] = ['chrono', 'overall', 'pace'];
const PROMPT: Record<Variant, string> = {
  chrono: 'Oldest → newest card',
  overall: 'Lowest → highest OVR',
  pace: 'Slowest → fastest (PAC)',
};
const keyOf = (v: Variant, c: FifaCard) => (v === 'chrono' ? editionNum(c.edition) : v === 'overall' ? c.overall : c.stats.pac);

/** Put the FIFA Cards in Order — tap four of one player's cards in the asked order. */
export function OrderRound({ level, used, onDone }: RoundProps) {
  const t = useMiniT();
  const [{ cards, variant, answer }] = useState(() => {
    const j = drawJourney({ tiers: tierAtLeast(level), minCards: 4, exclude: used });
    // Four cards with distinct values for the chosen key so there is exactly one right order.
    let variant = rand(VARIANTS);
    let pick: FifaCard[] = [];
    for (let attempt = 0; attempt < 6 && pick.length < 4; attempt++) {
      const seen = new Set<number>();
      pick = [];
      for (const c of shuffle(j.cards)) {
        const k = keyOf(variant, c);
        if (seen.has(k)) continue;
        seen.add(k);
        pick.push(c);
        if (pick.length === 4) break;
      }
      if (pick.length < 4) variant = 'chrono';
    }
    const answer = pick.slice().sort((a, b) => keyOf(variant, a) - keyOf(variant, b)).map((c) => c.id);
    return { cards: shuffle(pick), variant, answer };
  });
  useEffect(() => { used.add(cards[0].name); }, [used, cards]);
  const [order, setOrder] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);

  const tap = (id: string) => {
    if (checked) return;
    setOrder((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  };
  const correctSlots = order.filter((id, i) => answer[i] === id).length;
  const perfect = checked && correctSlots === 4;
  const points = checked ? (perfect ? 100 : correctSlots * 15) : 0;
  const hideEdition = variant === 'chrono';

  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-3 text-center font-poppins text-[11px] font-black uppercase tracking-[0.2em] text-brand-yellow">{t(PROMPT[variant])}</p>
      <p className="mb-2 text-center font-poppins text-sm font-black text-white">{cards[0].name}</p>
      <div className="flex justify-center gap-1.5">
        {cards.map((c) => {
          const idx = order.indexOf(c.id);
          const rightIdx = answer.indexOf(c.id);
          const ok = checked && idx === rightIdx;
          return (
            <div key={c.id} className="flex flex-col items-center gap-1.5">
              <MiniFutCard card={c} size="sm" showEdition={!hideEdition || checked} showName={false} badge={idx >= 0 ? String(idx + 1) : undefined} highlight={checked ? (ok ? 'correct' : 'wrong') : idx >= 0 ? 'pick' : null} onClick={() => tap(c.id)} />
              <motion.span key={checked ? 'v' : 'h'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-poppins text-[11px] font-black tabular-nums text-white/70">
                {checked ? (variant === 'chrono' ? editionLabel(c.edition) : variant === 'overall' ? `${c.overall} OVR` : `${c.stats.pac} PAC`) : variant === 'overall' ? editionLabel(c.edition) : variant === 'pace' ? `${c.overall} OVR` : '·'}
              </motion.span>
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        {!checked ? (
          <PrimaryButton disabled={order.length < 4} onClick={() => setChecked(true)}>{t('Check order')} · {order.length}/4</PrimaryButton>
        ) : (
          <ResultBanner correct={perfect} points={points} headline={perfect ? undefined : t('{n}/4 in the right slot', { n: correctSlots })} answer={answer.map((id) => { const c = cards.find((x) => x.id === id)!; return variant === 'chrono' ? editionLabel(c.edition) : String(keyOf(variant, c)); }).join(' → ')} onNext={() => onDone({ correct: perfect, points, label: cards[0].name, tag: t('Order'), maxPoints: 100 })} />
        )}
      </div>
    </div>
  );
}
