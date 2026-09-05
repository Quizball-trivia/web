'use client';

import { useEffect, useState } from 'react';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { STAT_KEYS, STAT_LABEL, drawCard, editionLabel, rand, tierAtLeast, type StatKey } from '../../lib/data';
import type { RoundProps } from '../../lib/runner';
import { MiniFutCard, StatStrip } from '../MiniFutCard';
import { ResultBanner } from '../ui';

/** How far the doctored stat is moved, by level: easy ±10, medium ±5, hard ±2. */
export const FAKE_DELTA = [10, 5, 2];
const FAKE_POINTS = [100, 150, 200];

/** One Stat Is Fake — a fully revealed card; tap the attribute that was tampered with. */
export function FakeStatRound({ level, used, onDone }: RoundProps) {
  const t = useMiniT();
  const tier = Math.min(FAKE_DELTA.length - 1, level);
  const [{ card, fake, shown }] = useState(() => {
    const card = drawCard({ tiers: tierAtLeast(Math.max(0, level - 1)), exclude: used });
    const fake = rand(STAT_KEYS);
    const delta = FAKE_DELTA[tier] * (Math.random() < 0.5 ? -1 : 1);
    const real = card.stats[fake];
    let value = real + delta;
    if (value > 99 || value < 20) value = real - delta;
    return { card, fake, shown: { [fake]: value } as Partial<Record<StatKey, number>> };
  });
  useEffect(() => { used.add(card.name); }, [used, card]);
  const [picked, setPicked] = useState<StatKey | null>(null);
  const correct = picked === fake;
  const points = correct ? FAKE_POINTS[tier] : 0;

  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-3 text-center font-poppins text-[11px] font-black uppercase tracking-[0.2em] text-brand-yellow">
        {t('One stat is fake — which?')} · ±{FAKE_DELTA[tier]}
      </p>
      <div className="flex justify-center">
        <MiniFutCard card={card} size="lg" />
      </div>
      <div className="mt-3">
        <StatStrip card={card} values={picked === null ? shown : undefined} onPick={setPicked} picked={picked} correct={picked === null ? null : fake} />
      </div>
      {picked !== null && (
        <div className="mt-4">
          <ResultBanner correct={correct} points={points} answer={`${STAT_LABEL[fake]}: ${shown[fake]} → ${card.stats[fake]}`} detail={`${card.name} · ${editionLabel(card.edition)}`} onNext={() => onDone({ correct, points, label: card.name, tag: editionLabel(card.edition), maxPoints: FAKE_POINTS[tier] })} />
        </div>
      )}
    </div>
  );
}
