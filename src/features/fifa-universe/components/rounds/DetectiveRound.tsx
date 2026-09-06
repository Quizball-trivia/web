'use client';

import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { matchesName } from '@/features/mini-games/lib/matching';
import { drawCard, editionLabel, tierAtLeast } from '../../lib/data';
import type { RoundProps } from '../../lib/runner';
import { DEFAULT_CLUE_COSTS, DetectiveCard, freeCluesFor, type ClueKey } from '../DetectiveCard';
import { faceUrl } from '../MiniFutCard';
import { NameInput, ResultBanner } from '../ui';

export const START_COINS = 100;
const WRONG_GUESS_COST = 15;

/** FIFA Card Detective — the card itself is the board: tap a locked slot to buy that clue, then name the player. */
export function DetectiveRound({ level, used, onDone }: RoundProps) {
  const t = useMiniT();
  const [card] = useState(() => drawCard({ tiers: tierAtLeast(level), exclude: used }));
  useEffect(() => { used.add(card.name); }, [used, card]);
  const [board, setBoard] = useState<{ coins: number; open: Set<ClueKey> }>(() => ({ coins: START_COINS, open: freeCluesFor(card.id) }));
  const { coins, open } = board;
  const [result, setResult] = useState<{ correct: boolean } | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const over = result !== null;

  const reveal = (k: ClueKey) => {
    if (over) return;
    setBoard((prev) => (prev.open.has(k) || prev.coins < DEFAULT_CLUE_COSTS[k] ? prev : { coins: prev.coins - DEFAULT_CLUE_COSTS[k], open: new Set(prev.open).add(k) }));
  };
  const guess = (v: string) => {
    if (over) return;
    if (matchesName(v, card.accepted).ok) setResult({ correct: true });
    else {
      setWrong(v);
      setBoard((prev) => ({ ...prev, coins: Math.max(0, prev.coins - WRONG_GUESS_COST) }));
    }
  };
  const points = result?.correct ? coins * 10 : 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-poppins text-[11px] font-black uppercase tracking-wider text-white/55">{t('Tap a lock to buy that clue')}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-yellow/15 px-2.5 py-1 font-poppins text-sm font-black text-brand-yellow"><Coins className="size-4" /> {coins}</span>
      </div>

      <DetectiveCard card={{ ...card, faceUrl: faceUrl(card) }} open={open} coins={coins} over={over} solved={!!result?.correct} onReveal={reveal} />

      <div className="mt-4 space-y-2.5">
        {!over ? (
          <>
            <NameInput onSubmit={guess} autoFocus={false} />
            <div className="flex items-center justify-between">
              <span className="font-poppins text-[11px] font-black uppercase tracking-wider" style={{ color: wrong ? '#FB3101' : 'rgba(255,255,255,0.4)' }}>
                {wrong ? t('Not {name} · −{n} coins', { name: wrong, n: WRONG_GUESS_COST }) : t('Correct now = {n} pts', { n: coins * 10 })}
              </span>
              <button type="button" onClick={() => setResult({ correct: false })} className="font-poppins text-[11px] font-black uppercase tracking-wider text-white/45 underline-offset-2 hover:underline">{t('Give up')}</button>
            </div>
          </>
        ) : (
          <ResultBanner correct={result.correct} points={points} headline={result.correct ? t('Solved with {n} coins left', { n: coins }) : t('The answer')} answer={card.name} detail={`${card.club} · ${card.overall} OVR · ${editionLabel(card.edition)}`} onNext={() => onDone({ correct: result.correct, points, label: card.name, tag: editionLabel(card.edition), maxPoints: START_COINS * 10 })} />
        )}
      </div>
    </div>
  );
}
