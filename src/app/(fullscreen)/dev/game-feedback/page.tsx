'use client';

/** Dev preview: the after-game feedback card on Tenable's solo and room results (?screen=room, ?locale=ka, ?fail=1). */

import { Suspense, useState } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import { GameFeedbackCard } from '@/features/feedback/GameFeedback';
import { TenableEndView } from '@/features/tenable/TenableSolo';
import { tenableCopy } from '@/features/tenable/tenable.copy';
import { PartyResults, type WordSeat } from '@/features/wordgames/party';
import { Frame } from '@/features/wordgames/ui';
import { soloState, slotsWith, SEAT_NAMES } from '@/features/playground/fixtures/tenable';
import { randomBotAvatar } from '@/features/auction/data/botAvatars';

const SEATS: WordSeat[] = [0, 1, 2, 3].map((seat) => ({ seat, name: seat === 0 ? 'You' : SEAT_NAMES[seat], avatar: randomBotAvatar(`pg-${seat}`), status: 'in', score: [21, 34, 12, 9][seat] }));
const STANDINGS = [{ seat: 1, points: 34, roundWins: 4, place: 1 }, { seat: 0, points: 21, roundWins: 3, place: 2 }, { seat: 2, points: 12, roundWins: 2, place: 3 }, { seat: 3, points: 9, roundWins: 1, place: 4 }];

export default function GameFeedbackPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <Suspense><GameFeedbackPreview /></Suspense>;
}

function GameFeedbackPreview() {
  const params = useSearchParams();
  const screen = params.get('screen') === 'room' ? 'room' : 'solo';
  const locale = params.get('locale') ?? 'en';
  const [open, setOpen] = useState(true);
  const game = tenableCopy(locale).title;
  const fail = params.get('fail') === '1';
  const send = () => new Promise<void>((resolve, reject) => setTimeout(() => (fail ? reject(new Error('preview')) : resolve()), 600));
  const card = open ? <GameFeedbackCard className="mt-4" game={game} locale={locale} onSend={send} onClose={() => setOpen(false)} /> : null;
  const state = soloState({ found: [1, 2, 3, 5, 6, 8, 9, 10], status: 'done', endReason: 'lives', lives: 0, misses: ['Rival Inventado'], disclosed: true });
  state.slots = slotsWith(Object.fromEntries([1, 2, 3, 5, 6, 8, 9, 10].map((r) => [r, 0])), true);
  return (
    <>
      {screen === 'solo' ? (
        <Frame lang={locale}><TenableEndView locale={locale} number={7} state={state} guestOnPastBoard={false} leaderboard={card} onArchive={() => undefined} onExit={() => undefined} /></Frame>
      ) : (
        <PartyResults seats={SEATS} standings={STANDINGS} mySeat={0} headline="You placed 2nd" statLabel="Found" detail={() => '3 found'} leftLabel="left"
          onRoom={() => undefined} onExit={() => undefined} footer={card} />
      )}
    </>
  );
}
