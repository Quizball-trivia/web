'use client';

import { useEffect, useState } from 'react';
import { Flame, Share2 } from 'lucide-react';
import { TD } from '../lib/copy';
import { BsButton } from '../shell/ui';
import { renderStreakCard, shareStreakCard } from './shareCard';

export function StreakResult({
  score,
  best,
  isRecord,
  onAgain,
  onBack,
}: {
  score: number;
  best: number;
  isRecord: boolean;
  onAgain: () => void;
  onBack: () => void;
}) {
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    void renderStreakCard({ score, best, isRecord }).then((blob) => {
      if (!alive || !blob) return;
      url = URL.createObjectURL(blob);
      setCard({ blob, url });
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [score, best, isRecord]);

  const share = async () => {
    if (!card) return;
    const r = await shareStreakCard(card.blob, score);
    setNote(r === 'downloaded' ? TD.streakShared : null);
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center gap-5 px-4 pb-8 pt-10" style={{ background: 'var(--bs-page)' }}>
      <p className="bs-headline text-center">{TD.streakOver}</p>
      <div className="flex flex-col items-center gap-1">
        <span className="flex items-center gap-2 font-[Poppins] text-[64px] font-bold leading-none" style={{ color: 'var(--bs-primary)' }}>
          <Flame size={48} strokeWidth={2.4} />
          {score}
        </span>
        <span className="bs-body-medium text-[var(--bs-text-2)]">{TD.streakInARow}</span>
      </div>
      {isRecord ? (
        <span className="bs-body-medium rounded-full px-3 py-1 text-white" style={{ background: 'var(--bs-green)' }}>
          {TD.streakNewRecord}
        </span>
      ) : (
        <span className="bs-body-medium text-[var(--bs-text-3)]">
          {TD.streakBest}: {best}
        </span>
      )}

      {/* the image that gets shared (REQ.1.10) */}
      <div className="w-full max-w-[260px] overflow-hidden rounded-[12px]" style={{ aspectRatio: '4 / 5', background: 'var(--bs-surface)', border: '1px solid var(--bs-frame)' }}>
        {card && (
          // eslint-disable-next-line @next/next/no-img-element -- generated share card (blob URL)
          <img src={card.url} alt={TD.streakShareText(score)} className="size-full object-cover" />
        )}
      </div>

      <div className="mt-auto flex w-full flex-col gap-3">
        <BsButton onClick={share} disabled={!card} className="rounded-[12px]">
          <Share2 size={16} />
          {TD.streakShare}
        </BsButton>
        {note && <p className="bs-text text-center text-[12px] text-[var(--bs-text-3)]">{note}</p>}
        <BsButton variant="ghost" onClick={onAgain} className="rounded-[12px]">
          {TD.streakAgain}
        </BsButton>
        <button type="button" onClick={onBack} className="bs-body-medium py-2 text-[var(--bs-text-2)]">
          {TD.streakBack}
        </button>
      </div>
    </div>
  );
}
