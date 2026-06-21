'use client';

import { AuctionFlowScreen } from '@/features/auction/AuctionFlowScreen';
import { usePlayer } from '@/contexts/PlayerContext';

export default function AuctionPage() {
  const { player } = usePlayer();

  return (
    <AuctionFlowScreen
      username={player?.username ?? 'Player'}
      avatarSeed={player?.avatar ?? 'avatar-1'}
      mode="live"
    />
  );
}
