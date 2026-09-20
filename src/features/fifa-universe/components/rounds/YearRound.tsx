'use client';

import { useEffect, useState } from 'react';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { PLAYABLE_EDITIONS, drawJourney, editionLabel, editionNum, rand, shuffle, tierAtLeast, type FifaEdition } from '../../lib/data';
import type { RoundProps } from '../../lib/runner';
import { MiniFutCard, StatStrip } from '../MiniFutCard';
import { Choices, ResultBanner } from '../ui';

/** Guess the FIFA Year — a fully revealed card with the edition badge hidden. */
export function YearRound({ level, used, onDone }: RoundProps) {
  const t = useMiniT();
  const [{ card, options }] = useState(() => {
    const j = drawJourney({ tiers: tierAtLeast(level), minCards: 3, exclude: used });
    const card = rand(j.cards);
    // Options are editions the player actually had a card in, padded with neighbours.
    const pool = new Set<FifaEdition>(j.cards.map((c) => c.edition));
    const all = PLAYABLE_EDITIONS.slice().sort((a, b) => Math.abs(editionNum(a) - editionNum(card.edition)) - Math.abs(editionNum(b) - editionNum(card.edition)));
    for (const e of all) if (pool.size < 4) pool.add(e);
    const options = shuffle(Array.from(pool).filter((e) => e !== card.edition)).slice(0, 3).concat(card.edition);
    options.sort((a, b) => editionNum(a) - editionNum(b));
    return { card, options };
  });
  useEffect(() => { used.add(card.name); }, [used, card]);
  const [picked, setPicked] = useState<FifaEdition | null>(null);
  const off = picked ? Math.abs(editionNum(picked) - editionNum(card.edition)) : 0;
  const correct = picked === card.edition;
  const points = correct ? 100 : off === 1 ? 40 : 0;

  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-3 text-center font-poppins text-[11px] font-black uppercase tracking-[0.2em] text-brand-yellow">{t('Which FIFA is this card from?')}</p>
      <div className="flex justify-center">
        <MiniFutCard card={card} size="lg" showEdition={picked !== null} highlight={picked === null ? null : correct ? 'correct' : 'wrong'} />
      </div>
      <div className="mt-3">
        <StatStrip card={card} />
      </div>
      <div className="mt-4">
        <Choices options={options.map((e) => ({ id: e, label: editionLabel(e) }))} picked={picked} correctId={picked ? card.edition : null} onPick={(id) => setPicked(id as FifaEdition)} />
        {picked !== null && (
          <div className="mt-3">
            <ResultBanner correct={correct} points={points} headline={!correct && off === 1 ? t('Close — one year off') : undefined} answer={editionLabel(card.edition)} detail={`${card.name} · ${card.club} · ${card.overall} OVR`} onNext={() => onDone({ correct, points, label: card.name, tag: editionLabel(card.edition), maxPoints: 100 })} />
          </div>
        )}
      </div>
    </div>
  );
}
