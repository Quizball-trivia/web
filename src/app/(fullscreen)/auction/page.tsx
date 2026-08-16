'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuctionFlowScreen } from '@/features/auction/AuctionFlowScreen';
import { StadiumBiddingPreview } from '@/features/auction/components/bidding/StadiumBiddingPreview';
import { usePlayer } from '@/contexts/PlayerContext';

function AuctionPageInner() {
  const { player } = usePlayer();
  const searchParams = useSearchParams();

  // Opt-in preview of the experimental 3-stadium layout on the live URL:
  // /auction?stadium=1 — renders the same mock prototype as /dev/auction-stadium
  // without touching the real live game (default /auction is unchanged).
  // Dev-only: in production the live route must never be swappable for a mock
  // via query string (the preview lives at /dev/auction-stadium).
  if (process.env.NODE_ENV !== 'production' && searchParams.get('stadium')) {
    return <StadiumBiddingPreview />;
  }

  return (
    <AuctionFlowScreen
      username={player?.username ?? 'Player'}
      avatarSeed={player?.avatar ?? 'avatar-1'}
      avatarCustomization={player?.avatarCustomization ?? null}
      mode="live"
    />
  );
}

export default function AuctionPage() {
  return (
    <Suspense fallback={null}>
      <AuctionPageInner />
    </Suspense>
  );
}
